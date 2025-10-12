from django.urls import path
from .views import my_leagues, create_league, get_league

urlpatterns = [
    path('mine', my_leagues),
    path('create', create_league),
    path('<int:league_id>', get_league),
]