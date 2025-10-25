import csv
import os
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

# Si quieres validar estrictamente elementos conocidos, pon aquí los válidos:
VALID_ELEMENTS = {"Wind", "Fire", "Wood", "Earth", "Neutro"}

# Si quieres validar tipos conocidos, puedes ajustar esta lista:
VALID_TYPES = {"Tiro", "Regate", "Bloqueo", "Atajo", "Neutro"}

def to_int(val, default=0):
    try:
        return int(str(val).strip())
    except Exception:
        return default

class Command(BaseCommand):
    help = "Carga las SuperTécnicas desde el CSV st_chrono_stones.csv (auto-localizado)."

    def handle(self, *args, **kwargs):
        # Ruta automática: junto al propio script
        current_dir = os.path.dirname(os.path.abspath(__file__))
        csv_path = os.path.join(current_dir, "st_chrono_stones.csv")

        if not os.path.exists(csv_path):
            raise CommandError(f"No se encontró el fichero CSV en: {csv_path}")

        # Algunas versiones de Django no tienen style.NOTICE
        notice = getattr(self.style, "NOTICE", self.style.SUCCESS)

        self.stdout.write(notice(f"📄 Cargando CSV: {csv_path}"))

        created, updated, skipped = 0, 0, 0
        warnings = 0

        with open(csv_path, mode="r", encoding="utf-8", newline="") as f:
            reader = csv.reader(f)
            header = next(reader, None)

            for idx, row in enumerate(reader, start=2):  # start=2 por la cabecera
                # Saltar filas vacías
                if not row or all((str(c or "").strip() == "" for c in row)):
                    continue

                if len(row) < 5:
                    self.stdout.write(self.style.WARNING(
                        f"⚠️  Fila {idx} inválida (esperadas 5 columnas), se ignora: {row}"
                    ))
                    skipped += 1
                    continue

                raw_name, raw_type, raw_element, raw_users, raw_power = [str(x or "").strip() for x in row]

                if not raw_name:
                    self.stdout.write(self.style.WARNING(
                        f"⚠️  Fila {idx} sin nombre, se ignora."
                    ))
                    skipped += 1
                    continue

                # Normalizar elemento
                element = MAP_ELEMENT.get(raw_element, raw_element).strip() or "Neutro"
                if element not in VALID_ELEMENTS:
                    self.stdout.write(self.style.WARNING(
                        f"⚠️  Fila {idx}: elemento '{element}' no reconocido. Se deja tal cual."
                    ))
                    warnings += 1

                # Validar tipo (opcionalmente)
                st_type = raw_type or "Neutro"
                if st_type not in VALID_TYPES:
                    self.stdout.write(self.style.WARNING(
                        f"⚠️  Fila {idx}: tipo '{st_type}' no reconocido. Se deja tal cual."
                    ))
                    warnings += 1

                users = to_int(raw_users, default=0)
                power = to_int(raw_power, default=0)

                obj, was_created = SpecialTechnique.objects.update_or_create(
                    name=raw_name,
                    defaults={
                        "st_type": st_type,
                        "element": element,
                        "users": users,
                        "power": power,
                    }
                )

                if was_created:
                    created += 1
                else:
                    updated += 1

        self.stdout.write(self.style.SUCCESS("✅ Carga completada"))
        self.stdout.write(self.style.SUCCESS(f"🆕 Nuevas: {created}"))
        self.stdout.write(self.style.SUCCESS(f"♻️ Actualizadas: {updated}"))
        if skipped:
            self.stdout.write(self.style.WARNING(f"⏭️  Omitidas: {skipped}"))
        if warnings:
            self.stdout.write(self.style.WARNING(f"⚠️  Avisos: {warnings}"))