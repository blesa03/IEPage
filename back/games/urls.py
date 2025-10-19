from django.urls import path
from .views import (
    view_match, view_matchs,
    match_result_requests,                 
    approve_match_result_request, reject_match_result_request
)

urlpatterns = [
    path('league/<int:league_id>', view_matchs, name='view_matchs'),
    path('<int:game_id>', view_match, name='view_match'),
    path('<int:game_id>/requests', match_result_requests, name='match_result_requests'),  # <— una sola
    path('<int:game_result_request_id>/approve', approve_match_result_request, name='approve_match_result_request'),
    path('<int:game_result_request_id>/reject', reject_match_result_request, name='reject_match_result_request'),
]