from django.urls import path
from .views import get_players_by_draft, start_draft, finish_draft

urlpatterns = [
    path('<int:draft_id>/players', get_players_by_draft, name='get_players_by_draft'),
    path('<int:draft_id>/start', start_draft, name='start_draft'),
    path('<int:draft_id>/finish', finish_draft, name='finish_draft'),
]
