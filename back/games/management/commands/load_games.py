from django.core.management.base import BaseCommand

import csv
from draft.models import Draft
from team.models import Team
from games.models import Game


class Command(BaseCommand):
    def handle(self, *args, **options):
        draft = Draft.objects.get()

        with open("../games.csv", "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            
            for row in reader:
                local_team = Team.objects.get(name=row['local_team'])
                away_team = Team.objects.get(name=row['away_team'])
                
                Game.objects.create(
                    week=row['week'],
                    local_team=local_team,
                    away_team=away_team,
                    draft=draft,
                )
        
        self.stdout.write(self.style.SUCCESS('✅ Datos cargados correctamente.'))
                