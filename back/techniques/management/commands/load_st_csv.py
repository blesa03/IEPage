import csv
from django.core.management.base import BaseCommand, CommandError
from techniques.models import SpecialTechnique

MAP_ELEMENT = {
    "Aire": "Wind",
    "Fuego": "Fire",
    "Bosque": "Wood",
    "Montaña": "Earth",
    "Neutro": "Neutro",
    "Wind": "Wind",
    "Fire": "Fire",
    "Wood": "Wood",
    "Earth": "Earth",
}

class Command(BaseCommand):
    help = "Carga el catálogo de SuperTécnicas desde un CSV (st_chrono_stones.csv)"

    def add_arguments(self, parser):
        parser.add_argument("--file", required=True, help="Ruta al CSV")

    def handle(self, *args, **opts):
        path = opts["file"]
        created = 0
        updated = 0

        try:
            with open(path, newline="", encoding="utf-8") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = (row.get("name") or "").strip()
                    st_type = (row.get("type") or "").strip()
                    element = MAP_ELEMENT.get((row.get("element") or "").strip(), "Neutro")
                    users = int((row.get("users") or "1").strip() or 1)
                    power = int((row.get("power_cs") or "0").strip() or 0)

                    obj, is_created = SpecialTechnique.objects.update_or_create(
                        name=name, st_type=st_type, element=element, users=users, power=power,
                        defaults={}
                    )
                    created += int(is_created)
                    updated += int(not is_created)

        except FileNotFoundError:
            raise CommandError(f"No se encontró el fichero: {path}")

        self.stdout.write(self.style.SUCCESS(
            f"OK · creadas={created} · sin cambios={updated}"
        ))
