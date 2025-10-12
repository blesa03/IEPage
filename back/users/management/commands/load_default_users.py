from django.core.management.base import BaseCommand
from users.models import DraftUser, User
from draft.models import Draft
from team.models import Team
from uuid import uuid4
from datetime import datetime, UTC

class Command(BaseCommand):
    
    users = [
        {
            'username': 'varo12ff',
            'team_name': 'Birrarreal FC',
            'password': 'H130(+Ks910B',
        },
        {
            'username': 'xhino',
            'team_name': 'Alimentación Xhino',
            'password': '(8m&£IO6/44x',
        },
        {
            'username': 'Daniwellingssss',
            'team_name': 'Manchester Dani',
            'password': ']q&U376]!{jx',
        },
        {
            'username': 'Franchesco',
            'team_name': 'Los barbaros',
            'password': 'ORo29!T]7iCs',
        },
        {
            'username': 'Sorey',
            'team_name': 'TIRES',
            'password': '8[o%CvB86riK',
        },
        # {
        #     'username': '',
        #     'team_name': '',
        #     'password': '8SdOn6Z/"3%^',
        # },
    ]

    def handle(self, *args, **options):
        draft = Draft.objects.get()

        for i, user in enumerate(self.users):
            user_instance = User.objects.create_user(
                username=user['username'],
                is_staff=False,
                is_active=True,
                date_joined=datetime.now(UTC),
                password=user['password']
            )

            draft_user = DraftUser.objects.create(
                user=user_instance,
                draft=draft
            )

            Team.objects.create(
                name=user['team_name'],
                draft=draft,
                draft_user=draft_user,
                budget=100000000,
            )