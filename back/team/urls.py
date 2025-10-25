from django.urls import path
from .views import (
    my_team, view_team, get_lineup, save_lineup,
    list_player_techniques, catalog_techniques,
    add_player_technique, reorder_player_techniques, delete_player_technique,
)

urlpatterns = [
     # --- Equipo ---
    path('<int:draft_id>/my', my_team, name='my_team'),
    path('<int:draft_id>/<int:team_id>', view_team, name='view_team'),

    # --- Alineación ---
    path('<int:draft_id>/lineup', get_lineup, name='get_lineup'),
    path('<int:draft_id>/lineup/save', save_lineup, name='save_lineup'),

    # --- SuperTécnicas por jugador ---
    # Listar técnicas asignadas
    path('<int:draft_id>/players/<int:dp_id>/techniques/', list_player_techniques, name='list_player_techniques'),

    # Catálogo filtrable con opción de excluir las ya asignadas
    path('<int:draft_id>/players/<int:dp_id>/techniques/catalog', catalog_techniques, name='catalog_techniques'),

    # Añadir técnica a jugador
    path('<int:draft_id>/players/<int:dp_id>/techniques/add', add_player_technique, name='add_player_technique'),

    # Reordenar las técnicas (drag & drop)
    path('<int:draft_id>/players/<int:dp_id>/techniques/reorder', reorder_player_techniques, name='reorder_player_techniques'),

    # Eliminar técnica concreta
    path('<int:draft_id>/players/<int:dp_id>/techniques/<int:tech_id>', delete_player_technique, name='delete_player_technique'),
]