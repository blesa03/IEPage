from django.urls import path
from .views import view_match, view_matchs, add_match_result_request, get_match_result_requests, approve_match_result_request, reject_match_result_request

urlpatterns = [
    path('/league/<int:league_id>', view_matchs, name='view_matchs'),
    path('<int:game_id>', view_match, name='view_match'),
    path('<int:game_id>/requests', add_match_result_request, name='add_match_result_request'),
    path('<int:game_id>/requests', get_match_result_requests, name='get_match_result_requests'),
    path('<int:game_result_request_id>/approve', approve_match_result_request, name='approve_match_result_request'),
    path('<int:game_result_request_id>/reject', reject_match_result_request, name='reject_match_result_request'),
]
