from django.urls import path
from .views import view_clasification, get_scorers, get_top_goalkeepers

urlpatterns = [
    path('<int:league_id>/', view_clasification, name='view_clasification'),
    path('<int:league_id>/scorers', get_scorers, name='get_scorers'),
    path('<int:league_id>/goalkeepers', get_top_goalkeepers, name='get_top_goalkeepers'),
]
