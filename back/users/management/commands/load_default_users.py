from django.core.management.base import BaseCommand
from users.models import DraftUser, User
from draft.models import Draft
from team.models import Team
from uuid import uuid4

class Command(BaseCommand):
    
    users = [
        {
            'username': 'varo12ff',
            'team_name': 'Picao Histórico FC',
        },
        {
            'username': 'xhino',
            'team_name': 'Alimentación Xhino',
        },
        {
            'username': '',
            'team_name': '',
        },
        {
            'username': '',
            'team_name': '',
        },
        {
            'username': '',
            'team_name': '',
        },
        {
            'username': '',
            'team_name': '',
        },
    ]

    def handle(self, *args, **options):
        draft = Draft.objects.get()

        for user in self.users:
            user = User.objects.create(
                username=user['username'],
                key=uuid4(),
            )

            draft_user = DraftUser.objects.create(
                username=user['username'],
                user=user,
                draft=draft
            )

            Team.objects.create(
                name=user['team_name'],
                draft=draft,
                draft_user=draft_user,
                budget=100000000,
            )