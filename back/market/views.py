from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer
from draft.models import Draft
from team.models import Team
import json
from players.models import DraftPlayer
from team.models import Team
from market.models import TransferOffer, Transfer
from market.types import TransferOfferStatus

def view_player_offers(request: HttpRequest, draft_player_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    values = list(TransferOffer.objects.filter(draft_player_id=draft_player_id))
    
    return JsonResponse(values, safe=False)

def view_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        offer = TransferOffer.objects.get(id=transfer_offer_id)
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrado'}, status=404)
    
    
    return JsonResponse(offer, safe=False)

def send_offer(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    
    offer = data.get('offer')
    draft_player_id = data.get('draft_player_id')
    
    if not offer or not draft_player_id:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    try:
        draft_player = DraftPlayer.objects.get(id=draft_player_id)
    except DraftPlayer.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)
    
    try:
        draft_user = Draft.objects.get(user_id=request.user.id, draft=draft_player.draft)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    
    
    if TransferOffer.objects.filter(offering_team__draft_user=draft_user, status=TransferOfferStatus.PENDING).exists():
        return JsonResponse({'error': 'Ya tienes una oferta pendiente por este jugador'}, status=409)
    
    try:
        offering_team = Team.objects.get(draft_user=draft_user)
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    
    if offer < draft_player.player.value:
        return JsonResponse({'error': 'La oferta debe de ser igual o mayor que el valor del jugador'}, status=409)
    
    offering_team.budget -= offer
    
    offering_team.save(update_fields=['budget'])
    
    TransferOffer.objects.create(
        draft_player=draft_player,
        offering_team=offering_team,
        target_team=draft_player.team,
        offer=offer,
    )


def accept_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        offer = TransferOffer.objects.get(id=transfer_offer_id)
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrado'}, status=404)
    
    if offer.status != TransferOfferStatus.PENDING:
        return JsonResponse({'error': 'Esta oferta ya no se puede aceptar'}, status=409)
    
    offer.status = TransferOfferStatus.ACEPTED
    offer.target_team.budget += offer.offer
    offer.draft_player.team = offer.offering_team
    
    offer.save(update_fields=['status'])
    offer.target_team.save(update_fields=['budget'])
    offer.draft_player.save(update_fields=['team'])
    
    Transfer.objects.create(
        draft_player=offer.draft_player,
        from_team=offer.target_team,
        to_team=offer.offering_team,
        accepted_offer=offer,
        transfer_amount=offer.offer,
    )