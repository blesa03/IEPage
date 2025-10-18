from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer
from draft.models import Draft
from team.models import Team
import json
from players.models import DraftPlayer
from team.models import Team
from market.models import TransferOffer, Transfer, TransferProcess
from market.types import TransferOfferStatus, TransferProcessStatus, TransferOfferSource
from datetime import datetime, UTC

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
    
    # Obtenemos el equipo que hace la oferta
    try:
        offering_team = Team.objects.get(draft_user=draft_user)
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    # Si existe alguna negociación por ese jugador con los mismos implciados abierta devolvemos error
    if TransferProcess.objects.exists(offering_team=offering_team, status=TransferProcessStatus.OPEN):
        return JsonResponse({'error': 'Ya tienes negociaciones abiertas por este jugador'}, status=409)
    
    # La oferta no puede ser menor que el valor del jugador
    if offer < draft_player.player.value:
        return JsonResponse({'error': 'La oferta debe de ser igual o mayor que el valor del jugador'}, status=409)
    
    # La oferta no puede ser mayor que el presupuesto del equipo que hace la oferta
    if offer > offering_team.budget:
        return JsonResponse({'error': 'No tienes presupuesto suficiente para ofrecer esa cantidad'}, status=409)
    
    # Retenemos el dinero de la oferta
    offering_team.budget -= offer
    
    offering_team.save(update_fields=['budget'])
    
    process = TransferProcess.objects.create(
        offering_team=offering_team,
        target_team=draft_player.team,
        offer=offer,
    )
    
    TransferOffer.objects.create(
        draft_player=draft_player,
        offering_team=offering_team,
        target_team=draft_player.team,
        offer=offer,
        transfer_process=process
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
    
    # Cambiamos el estaod de la oferta y su fecha de aceptación
    offer.status = TransferOfferStatus.ACEPTED
    offer.accepted_at = datetime.now(UTC)
    # Sumamos el presupuesto al equipo que vende y cambiamos al jugador de equipo
    offer.target_team.budget += offer.transfer_process.amount
    offer.transfer_process.draft_player.team = offer.offering_team
    
    offer.save(update_fields=['status'])
    offer.target_team.save(update_fields=['budget'])
    offer.transfer_process.draft_player.save(update_fields=['team'])
    
    # Cambiamos el estado y la fecha de finalización de las negociaciones
    offer.transfer_process.status = TransferProcessStatus.FINISHED
    offer.transfer_process.finished_at = datetime.now(UTC)
    
    offer.transfer_process.save(update_fields=['status', 'finished_at'])
    
    # Guardamos registro del traspaso
    Transfer.objects.create(
        draft_player=offer.transfer_process.draft_player,
        from_team=offer.target_team,
        to_team=offer.offering_team,
        accepted_offer=offer,
        transfer_amount=offer.offer,
    )


def reject_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        offer = TransferOffer.objects.get(id=transfer_offer_id)
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrado'}, status=404)
    
    if offer.status != TransferOfferStatus.PENDING:
        return JsonResponse({'error': 'Esta oferta ya no se puede rechazar'}, status=409)
    
    # Cambiamos el estaod de la oferta y su fecha de aceptación
    offer.status = TransferOfferStatus.REJECTED
    offer.rejected_at = datetime.now(UTC)
    # Devolvemos el dinero ofrecido al equipo que lo ofreció
    offer.transfer_process.offering_team.budget += offer.transfer_process.amount
    
    offer.save(update_fields=['status'])
    offer.offering_team.save(update_fields=['budget'])
    
    offer.transfer_process.status = TransferProcessStatus.FINISHED
    offer.transfer_process.finished_at = datetime.now(UTC)
    
    offer.transfer_process.save(update_fields=['status', 'finished_at'])


def counter_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    
    new_offer = data.get('offer')
    if not new_offer:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    try:
        offer = TransferOffer.objects.get(id=transfer_offer_id)
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrado'}, status=404)
    
    if offer.status != TransferOfferStatus.PENDING:
        return JsonResponse({'error': 'Esta oferta ya no se puede rechazar'}, status=409)
    
    try:
        draft_user = Draft.objects.get(user_id=request.user.id, draft=offer.transfer_process.draft_player.draft)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    
    
    if TransferOffer.objects.filter(offering_team__draft_user=draft_user, status=TransferOfferStatus.PENDING).exists():
        return JsonResponse({'error': 'Ya tienes una oferta pendiente por este jugador'}, status=409)
    
    try:
        counter_team = Team.objects.get(draft_user=draft_user)
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    
    # Invertimos los roles (entendemos que la contraoferta no la ha hecho el equipo que hizo la oferta original)
    offering_team = offer.target_team
    target_team = offer.offering_team
    
    # En caso de que el equipo que hace la contraoferta sea el que hace esta
    if counter_team == offer.transfer_process.offering_team:
        # Calculamos el cambio de dinero
        offset = new_offer - offer.offer
        # La oferta tiene que ser mayor que la anterior que el jugador habia hecho
        if offset <= 0:
            return JsonResponse({'error': 'La oferta debe de ser superior a la anterior'}, status=409)
        
        # La diferencia de dinero debe de ser mayor que menor o igual que el presupuesto restante del jugador
        if offset > offer.transfer_process.offering_team.budget:
            return JsonResponse({'error': 'No tienes presupuesto suficiente para ofrecer esa cantidad'}, status=409)
        
        # Cambiamos el presupuesto del equipo
        offer.transfer_process.offering_team.budget -= offset
        offer.transfer_process.offering_team.save(update_fields=['budget'])
        
        # Cambiamos la cantidad retenida en la negociación
        offer.transfer_process.amount += offset
        offer.transfer_process.save(update_fields=['amount'])
        
        # Cambiamos la inversión de antes
        offering_team = offer.offering_team
        target_team = offer.target_team
        

    # Cambiamos estados y fechas
    offer.status = TransferOfferStatus.COUNTERED
    offer.countered_at = datetime.now(UTC)
    offer.save(update_fields=['status', 'countered_at'])
    
    # Creamos una nueva oferta donde el source sea esta
    TransferOffer.objects.create(
        draft_player=offer.transfer_process.draft_player,
        offering_team=offering_team,
        target_team=target_team,
        offer=new_offer,
        transfer_process=offer.transfer_process,
        source=TransferOfferSource.OFFER,
        source_offer=offer
    )
    
