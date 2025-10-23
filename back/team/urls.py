from django.urls import path
from .views import my_team, view_team, get_lineup, save_lineup

urlpatterns = [
    path('<int:draft_id>/my', my_team, name='my_team'),
    path('<int:draft_id>/<int:team_id>', view_team, name='view_team'),
    path('<int:draft_id>/lineup', get_lineup, name='get_lineup'),
    path('<int:draft_id>/lineup/save', save_lineup, name='save_lineup'),
]