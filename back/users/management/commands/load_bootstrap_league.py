from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.contrib.auth import get_user_model
from django.utils import timezone

from pathlib import Path
import csv

from league.models import League
from draft.models import Draft
from players.models import Player, DraftPlayer
from users.models import DraftUser
from team.models import Team
from decimal import Decimal

class Command(BaseCommand):
    """
    Bootstrap de datos:
      - (Opcional) Crea League y Draft (si no pasas --draft-id)
      - Carga jugadores desde CSV y los mete en DraftPlayer
      - Crea usuarios por defecto + DraftUser + Team

    Idempotente: no duplica usuarios/equipos/participaciones.
    """

    help = "Crea liga + draft (si no existe), carga jugadores CSV y crea usuarios/equipos en ese draft."

    # --- usuarios por defecto (puedes editar aquí) ---
    DEFAULT_USERS = [
        {"username": "varo12ff",        "team_name": "Birrarreal FC",       "password": "H130(+Ks910B"},
        {"username": "xhino",           "team_name": "Alimentación Xhino",  "password": "(8m&£IO6/44x"},
        {"username": "Daniwellingssss", "team_name": "Manchester Dani",     "password": "]q&U376]!{jx"},
        {"username": "Franchesco",      "team_name": "Los barbaros",        "password": "ORo29!T]7iCs"},
        {"username": "Sorey",           "team_name": "TIRES",               "password": "8[o%CvB86riK"},
        {"username": "lojnoe",          "team_name": "Barrio Alto",        "password": "1234"},
    ]

    def add_arguments(self, parser):
        parser.add_argument(
            "--draft-id", type=int, default=None,
            help="Usar un Draft existente por id. Si no se pasa, se crea liga+draft."
        )
        parser.add_argument(
            "--csv", type=str, default="../data.csv",
            help="Ruta al CSV de jugadores (columnas: name,gender,position,element,sprite)."
        )
        parser.add_argument(
            "--league-name", type=str, default="Primera Liga Inazuma",
            help="Nombre de la liga a crear (si no hay --draft-id)."
        )
        parser.add_argument(
            "--draft-name", type=str, default="Draft",
            help="Nombre del draft a crear (si no hay --draft-id)."
        )
        parser.add_argument(
            "--owner-id", type=int, default=None,
            help="ID del usuario dueño de la liga (si no hay --draft-id). Si no se pasa, se usará el primer usuario creado."
        )
        parser.add_argument(
            "--budget", type=int, default=100_000_000,
            help="Presupuesto inicial para los equipos."
        )
        parser.add_argument(
            "--skip-csv", action="store_true",
            help="No cargar jugadores desde CSV (solo usuarios/equipos)."
        )

    @transaction.atomic
    def handle(self, *args, **opts):
        User = get_user_model()

        draft = None
        draft_id = opts["draft_id"]
        csv_path = Path(opts["csv"]).resolve()
        league_name = opts["league_name"]
        draft_name = opts["draft_name"]
        owner_id_opt = opts["owner_id"]
        budget = opts["budget"]
        skip_csv = opts["skip_csv"]

        # 1) Resolver/crear DRAFT
        if draft_id:
            try:
                draft = Draft.objects.select_related("league__owner").get(id=draft_id)
            except Draft.DoesNotExist:
                raise CommandError(f"Draft id={draft_id} no existe.")
            self.stdout.write(self.style.SUCCESS(f"Usando Draft existente: id={draft.id}, liga={draft.league.name}"))
        else:
            # Aún no sabemos el owner: o lo trae --owner-id o lo elegimos luego (primer usuario creado)
            owner_user = None
            if owner_id_opt:
                try:
                    owner_user = User.objects.get(id=owner_id_opt)
                except User.DoesNotExist:
                    raise CommandError(f"Owner con id={owner_id_opt} no existe. Crea ese usuario primero o no pases --owner-id.")
            # Creamos liga sin owner si no lo tenemos aún; lo asignaremos luego si hace falta
            league = League.objects.create(name=league_name, owner=owner_user)
            draft = Draft.objects.create(league=league, name=draft_name)
            self.stdout.write(self.style.SUCCESS(f"Liga creada: '{league.name}', owner={getattr(league.owner, 'username', None)}"))
            self.stdout.write(self.style.SUCCESS(f"Draft creado: id={draft.id}, name='{draft.name}'"))

        # 2) Crear/asegurar usuarios + equipos + participación
        created_users = []
        for row in self.DEFAULT_USERS:
            username = row["username"]
            password = row["password"]
            team_name = row["team_name"]

            user, created_u = User.objects.get_or_create(
                username=username,
                defaults={
                    "is_staff": False,
                    "is_active": True,
                    "date_joined": timezone.now(),
                },
            )
            if created_u:
                user.set_password(password)
                user.save(update_fields=["password"])
                self.stdout.write(self.style.SUCCESS(f"[user] creado: {username}"))
            else:
                self.stdout.write(f"[user] existe: {username}")

            created_users.append(user)

            du, created_du = DraftUser.objects.get_or_create(user=user, draft=draft)
            if created_du:
                self.stdout.write(self.style.SUCCESS(f"[draft_user] {username} -> draft {draft.id}"))
            else:
                self.stdout.write(f"[draft_user] existe: {username} -> draft {draft.id}")

            team, created_team = Team.objects.get_or_create(
                draft=draft,
                draft_user=du,
                defaults={"name": team_name, "budget": budget},
            )
            if created_team:
                self.stdout.write(self.style.SUCCESS(f"[team] creado: {team_name}"))
            else:
                # actualiza nombre/presupuesto por si cambian
                team.name = team_name
                team.budget = budget
                team.save(update_fields=["name", "budget"])
                self.stdout.write(f"[team] actualizado: {team_name}")

        # 3) Si la liga no tenía owner y no se pasó --owner-id, asignamos el primero creado
        if not draft_id:
            league = draft.league
            if league.owner_id is None:
                if created_users:
                    league.owner = created_users[0]
                    league.save(update_fields=["owner"])
                    self.stdout.write(self.style.SUCCESS(f"[league] owner asignado a: {league.owner.username}"))
                else:
                    raise CommandError("No se pudo asignar owner a la liga: no se creó ningún usuario.")

        # 4) (Opcional) Cargar jugadores desde CSV al draft
        if not skip_csv:
            if not csv_path.exists():
                raise CommandError(f"CSV no encontrado en: {csv_path}")

            # Esperamos columnas: name, gender, position, element, sprite
            count_new_players = 0
            count_new_dp = 0
            with csv_path.open("r", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = (row.get("name") or "").strip()
                    if not name:
                        continue
                    # Evitar duplicidades por nombre (ajusta si tu modelo tiene unicidad distinta)
                    player, created_p = Player.objects.get_or_create(
                        name=name,
                        defaults={
                            "gender": (row.get("gender") or "").strip(),
                            "position": (row.get("position") or "").strip(),
                            "element": (row.get("element") or "").strip(),
                            "sprite": (row.get("sprite") or "").strip(),
                            "value": Decimal(row.get("value", 0.0)) * 1000000,
                        },
                    )
                    if created_p:
                        count_new_players += 1

                    dp, created_dp = DraftPlayer.objects.get_or_create(
                        draft=draft,
                        player=player,
                        defaults={"name": player.name},
                    )
                    if created_dp:
                        count_new_dp += 1

            self.stdout.write(self.style.SUCCESS(
                f"[players] CSV ok. Nuevos Player: {count_new_players} · Nuevos DraftPlayer: {count_new_dp}"
            ))
        else:
            self.stdout.write(self.style.WARNING("Skip CSV activado: no se cargan jugadores."))

        self.stdout.write(self.style.SUCCESS("✅ Bootstrap completado."))