from django.urls import path
from .views import get_players_by_draft_stream, get_players_by_draft, start_draft, finish_draft, acquire_player, view_draft, view_draft_stream

urlpatterns = [
    path('<int:draft_id>/players', get_players_by_draft, name='get_players_by_draft'),
    path('<int:draft_id>/players/stream', get_players_by_draft_stream, name='get_players_by_draft'),
    path('<int:draft_id>/start', start_draft, name='start_draft'),
    path('<int:draft_id>/finish', finish_draft, name='finish_draft'),
    path('<int:draft_id>/player', acquire_player, name='acquire_player'),
    path('<int:draft_id>', view_draft, name='view_draft'),
    path('<int:draft_id>/stream', view_draft_stream, name='view_draft_stream'),
]
