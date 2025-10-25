from django.core.management.base import BaseCommand
from django.db import transaction

from team.models import Team, Lineup, LineupSlot
from players.models import DraftPlayer


DEFAULT_FORMATION = "4-4-2"

# Coordenadas (en %) para 4-4-2 con GK abajo (11 titulares)
FOUR_FOUR_TWO_COORDS = [
    # 2 delanteros
    {"top": 9, "left": 35},
    {"top": 9, "left": 65},
    # 4 medios
    {"top": 28, "left": 18},
    {"top": 28, "left": 42},
    {"top": 28, "left": 58},
    {"top": 28, "left": 82},
    # 4 defensas
    {"top": 53, "left": 16},
    {"top": 53, "left": 38},
    {"top": 53, "left": 62},
    {"top": 53, "left": 84},
    # GK
    {"top": 83, "left": 50},
]


class Command(BaseCommand):
    help = "Crea una alineación 4-4-2 por defecto para todos los equipos."

    def add_arguments(self, parser):
        parser.add_argument(
            "--force",
            action="store_true",
            help="Borra alineaciones existentes y recrea desde cero.",
        )
        parser.add_argument(
            "--with-coords",
            action="store_true",
            help="Guarda coordenadas x_pct/y_pct para los 11 titulares.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No escribe en BD; solo muestra qué haría.",
        )

    def handle(self, *args, **options):
        force = options["force"]
        with_coords = options["with_coords"]
        dry_run = options["dry_run"]

        teams = Team.objects.all().order_by("id")
        if not teams.exists():
            self.stdout.write(self.style.WARNING("No hay equipos en la base de datos."))
            return

        self.stdout.write(
            f"Procesando {teams.count()} equipo(s) | "
            f"force={force} | with_coords={with_coords} | dry_run={dry_run}"
        )

        total_created = 0
        total_skipped = 0
        total_reset = 0

        for team in teams:
            with transaction.atomic():
                # ¿Ya tiene alineaciones?
                has_any = team.lineups.exists()
                has_active = team.current_lineup_id is not None

                if has_any and not force:
                    total_skipped += 1
                    self.stdout.write(
                        self.style.NOTICE(
                            f"[skip] Team#{team.id} '{team.name}': ya tiene alineaciones "
                            f"({'con activa' if has_active else 'sin activa'})."
                        )
                    )
                    # Si no hay activa pero sí alineaciones, marcamos la más reciente como activa
                    if not has_active and not dry_run:
                        latest = team.lineups.order_by("-updated_at", "-id").first()
                        team.current_lineup = latest
                        team.save(update_fields=["current_lineup"])
                    continue

                if force and has_any and not dry_run:
                    # borrar alineaciones anteriores (cascada a slots)
                    count = team.lineups.count()
                    team.lineups.all().delete()
                    total_reset += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"[reset] Team#{team.id} '{team.name}': eliminadas {count} alineación(es) previas."
                        )
                    )

                # Tomamos los DraftPlayers del equipo
                dps = DraftPlayer.objects.filter(team=team).order_by("id")

                starters = list(dps[:11])
                bench = list(dps[11:16])
                reserves = list(dps[16:])

                if not starters:
                    total_skipped += 1
                    self.stdout.write(
                        self.style.WARNING(
                            f"[skip] Team#{team.id} '{team.name}': no tiene jugadores asignados."
                        )
                    )
                    continue

                if dry_run:
                    self.stdout.write(
                        self.style.NOTICE(
                            f"[dry-run] Team#{team.id} '{team.name}': "
                            f"crearía lineup {DEFAULT_FORMATION} con "
                            f"{len(starters)} titulares, {len(bench)} banquillo, {len(reserves)} reserva."
                        )
                    )
                    continue

                # Crear la alineación
                lineup = Lineup.objects.create(team=team, formation=DEFAULT_FORMATION)

                # Crear slots
                for i, dp in enumerate(starters):
                    kwargs = dict(lineup=lineup, draft_player=dp, slot="starter", order=i)
                    if with_coords and i < len(FOUR_FOUR_TWO_COORDS):
                        kwargs["x_pct"] = FOUR_FOUR_TWO_COORDS[i]["left"]
                        kwargs["y_pct"] = FOUR_FOUR_TWO_COORDS[i]["top"]
                    LineupSlot.objects.create(**kwargs)

                for i, dp in enumerate(bench):
                    LineupSlot.objects.create(
                        lineup=lineup, draft_player=dp, slot="bench", order=i
                    )

                for i, dp in enumerate(reserves):
                    LineupSlot.objects.create(
                        lineup=lineup, draft_player=dp, slot="reserve", order=i
                    )

                # Marcar como activa en el equipo
                team.current_lineup = lineup
                team.save(update_fields=["current_lineup"])

                total_created += 1
                self.stdout.write(
                    self.style.SUCCESS(
                        f"[ok] Team#{team.id} '{team.name}': alineación creada "
                        f"(titulares={len(starters)}, banquillo={len(bench)}, reserva={len(reserves)})."
                    )
                )

        self.stdout.write(
            self.style.SUCCESS(
                f"Finalizado. creadas={total_created}, saltadas={total_skipped}, reseteadas={total_reset}"
            )
        )
