from django.core.management.base import BaseCommand
from django.db import transaction
from decimal import Decimal, ROUND_HALF_UP
from collections import defaultdict

from team.models import Team
from players.models import DraftPlayer

DECIMAL_133 = Decimal("1.33")

class Command(BaseCommand):
    help = (
        "Calcula el presupuesto de cláusulas como la media de (valor_plantilla * 1.33) "
        "entre todos los equipos que tienen jugadores asignados, y lo guarda en Team.clause_budget. "
        "Además, establece release_clause=None para todos los DraftPlayer."
    )

    def add_arguments(self, parser):
        parser.add_argument(
            "--include-empty",
            action="store_true",
            help="Incluir también equipos sin jugadores (valor 0) en el cálculo de la media.",
        )
        parser.add_argument(
            "--dry-run",
            action="store_true",
            help="No guarda cambios; solo muestra el cálculo.",
        )

    def handle(self, *args, **opts):
        include_empty = opts["include_empty"]
        dry_run = opts["dry_run"]

        # Cargar todos los DraftPlayer con team y player para sumar sus valores
        dps = (
            DraftPlayer.objects
            .select_related("player", "team")
            .all()
        )

        # Sumar por equipo
        team_sum = defaultdict(Decimal)  # team_id -> sum(Player.value)
        for dp in dps:
            if dp.team_id and dp.player and dp.player.value is not None:
                team_sum[dp.team_id] += Decimal(dp.player.value)

        # Preparar totales por equipo (sum * 1.33)
        team_totals = {}
        for team in Team.objects.all().only("id"):
            base_sum = team_sum.get(team.id, Decimal("0"))
            total = (base_sum * DECIMAL_133).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

            # Incluir o no equipos vacíos en la media
            if base_sum == 0 and not include_empty:
                continue
            team_totals[team.id] = total

        if not team_totals:
            self.stdout.write(self.style.WARNING(
                "No hay equipos con jugadores (o filtraste equipos vacíos). No se calcula media."
            ))
            return

        # Media de los totales
        media = (sum(team_totals.values(), Decimal("0")) / Decimal(len(team_totals))).quantize(
            Decimal("0.01"), rounding=ROUND_HALF_UP
        )

        self.stdout.write(self.style.NOTICE(
            f"Equipos considerados: {len(team_totals)} — Media cláusulas = {media}"
        ))

        # Guardar en Team.clause_budget para TODOS los equipos (mismo presupuesto)
        if dry_run:
            self.stdout.write(self.style.WARNING("DRY-RUN: no se guardan cambios ni se resetean cláusulas."))
            return

        with transaction.atomic():
            updated_teams = Team.objects.update(clause_budget=media)
            updated_players = DraftPlayer.objects.update(release_clause=None)

        self.stdout.write(self.style.SUCCESS(
            f"Actualizados {updated_teams} equipos con clause_budget = {media}."
        ))
        self.stdout.write(self.style.SUCCESS(
            f"Reseteadas release_clause a None en {updated_players} jugadores."
        ))
