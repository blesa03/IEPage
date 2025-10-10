from players.models import Player, DraftPlayer
from django.core.management.base import BaseCommand
from draft.models import Draft
from league.models import League
import csv

class Command(BaseCommand):
    
    def handle(self, *args, **options):
        with open('../data.csv', 'r', encoding='utf-8') as file:
            reader = csv.DictReader(file)

            league = League.objects.create(
                name='Nombre prueba'
            )

            draft = Draft.objects.create(
                league=league,
                name='Draft de prueba'
            )

            for row in reader:
                player = Player.objects.create(
                    name=row['name'],
                    gender=row['gender'].strip(),
                    position=row['position'],
                    element=row['element'],
                    sprite=row['sprite'],
                )

                DraftPlayer.objects.create(
                    player=player,
                    name=player.name,
                    draft=draft
                )

        self.stdout.write(self.style.SUCCESS('✅ Datos cargados correctamente.'))