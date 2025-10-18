from django.urls import path
from .views import view_player_offers, view_offer, send_offer, accept_offer, reject_offer, counter_offer

urlpatterns = [
    path('offers/player/<int:draft_player_id>', view_player_offers, name='view_player_offers'),
    path('offers/<int:transfer_offer_id>', view_offer, name='view_offer'),
    path('offers', send_offer, name='send_offer'),
    path('offers/<int:transfer_offer_id>/accept', accept_offer, name='accept_offer'),
    path('offers/<int:transfer_offer_id>/reject', reject_offer, name='reject_offer'),
    path('offers/<int:transfer_offer_id>/counter', counter_offer, name='counter_offer'),
]
