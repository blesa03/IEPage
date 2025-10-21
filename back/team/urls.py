from django.urls import path
from .views import my_team, view_team

urlpatterns = [
    path('<int:draft_id>/my', my_team, name='my_team'),
    path('<int:draft_id>/<int:team_id>', view_team, name='view_team'),
]
