from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer
from draft.models import Draft
from team.models import Team
import json
from players.models import DraftPlayer
from team.models import Team
from users.models import DraftUser
from market.models import TransferOffer, Transfer, TransferProcess
from market.types import TransferOfferStatus, TransferProcessStatus, TransferOfferSource
from datetime import datetime, UTC
from django.forms.models import model_to_dict
from django.http import HttpResponse
from django.db.models import F
from django.db import transaction


def view_player_offers(request: HttpRequest, draft_player_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    values = list(TransferOffer.objects.filter(draft_player_id=draft_player_id).values())
    
    return JsonResponse(values, safe=False)

def view_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        offer = TransferOffer.objects.get(id=transfer_offer_id)
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrado'}, status=404)
    
    
    return JsonResponse(model_to_dict(offer), safe=False)

@transaction.atomic
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
        draft_player = DraftPlayer.objects.select_for_update().get(id=draft_player_id)
    except DraftPlayer.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)
    
    try:
        draft_user = DraftUser.objects.get(user_id=request.user.id, draft=draft_player.draft)
    except DraftUser.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    
    try:
        offering_team = Team.objects.select_for_update().get(draft_user=draft_user)
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    if draft_player.team == offering_team:
        return JsonResponse({'error': 'No puedes hacer una oferta por tu propio jugador'}, status=409)
    
    if TransferProcess.objects.filter(
        offering_team=offering_team,
        draft_player=draft_player,
        status=TransferProcessStatus.OPEN
    ).exists():
        return JsonResponse({'error': 'Ya tienes negociaciones abiertas por este jugador'}, status=409)
    
    if offer < draft_player.player.value:
        return JsonResponse({'error': 'La oferta debe de ser igual o mayor que el valor del jugador'}, status=409)
    
    if offer > offering_team.budget:
        return JsonResponse({'error': 'No tienes presupuesto suficiente para ofrecer esa cantidad'}, status=409)
    
    # Retenemos el dinero de la oferta
    offering_team.budget = F('budget') - offer
    offering_team.save(update_fields=['budget'])
    
    # Creamos la negociación y la oferta inicial
    process = TransferProcess.objects.create(
        offering_team=offering_team,
        target_team=draft_player.team,
        amount=offer,
        draft_player=draft_player
    )
    
    TransferOffer.objects.create(
        offering_team=offering_team,
        target_team=process.target_team,
        offer=offer,
        transfer_process=process,
        draft_player=draft_player
    )
    
    return HttpResponse(status=201)


@transaction.atomic
def accept_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        # Bloqueamos la oferta y el proceso asociado
        offer = (
            TransferOffer.objects
            .select_for_update()
            .select_related(
                'transfer_process__offering_team',
                'transfer_process__target_team',
                'transfer_process__draft_player'
            )
            .get(id=transfer_offer_id)
        )
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrada'}, status=404)
    
    process = offer.transfer_process
    offering_team = process.offering_team
    target_team = process.target_team
    draft_player = process.draft_player

    # Bloqueamos entidades críticas
    offering_team = Team.objects.select_for_update().get(id=offering_team.id)
    target_team = Team.objects.select_for_update().get(id=target_team.id)
    draft_player = DraftPlayer.objects.select_for_update().get(id=draft_player.id)

    # Validaciones
    if offer.status != TransferOfferStatus.PENDING:
        return JsonResponse({'error': 'Esta oferta ya no se puede aceptar'}, status=409)
    
    if offering_team.budget < offer.offer:
        return JsonResponse({'error': 'El equipo que intenta fichar no tiene presupuesto suficiente'}, status=409)
    
    # Marcar la oferta como aceptada
    offer.status = TransferOfferStatus.ACEPTED
    offer.accepted_at = datetime.now(UTC)
    
    # Actualizar presupuestos y traspaso
    target_team.budget += offer.offer
    draft_player.team = offering_team
    
    if draft_player.release_clause:
        target_team.clause_budget += draft_player.release_clause
        draft_player.release_clause = None
    
    offset = offer.offer - process.amount
    if offset:
        offering_team.budget -= offset
        offering_team.save(update_fields=['budget'])
        process.amount += offset
        process.save(update_fields=['amount'])
    
    
    offer.save(update_fields=['status', 'accepted_at'])
    target_team.save(update_fields=['budget'])
    draft_player.save(update_fields=['team', 'release_clause'])
    
    # Rechazar todas las demás ofertas pendientes de este proceso
    other_offers = TransferOffer.objects.filter(
        draft_player=offer.draft_player,
        status=TransferOfferStatus.PENDING
    ).exclude(id=offer.id)
    
    now = datetime.now(UTC)
    
    for offer in other_offers:
        offer.transfer_process.status = TransferProcessStatus.FINISHED
        offer.transfer_process.finished_at = now
        
        offer.transfer_process.save(update_fields=['status', 'finished_at'])
    
    other_offers.update(status=TransferOfferStatus.REJECTED, rejected_at=now)
    
    # Cerrar el proceso de traspaso
    process.status = TransferProcessStatus.FINISHED
    process.finished_at = now
    process.save(update_fields=['status', 'finished_at'])
    
    # Registrar el traspaso final
    Transfer.objects.create(
        draft_player=draft_player,
        from_team=target_team,
        to_team=offering_team,
        accepted_offer=offer,
        transfer_amount=offer.offer,
        transfer_process=process
    )
    
    return HttpResponse(status=204)


@transaction.atomic
def reject_offer(request: HttpRequest, transfer_offer_id):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        # Bloqueamos la oferta y su proceso asociado
        offer = (
            TransferOffer.objects
            .select_for_update()
            .select_related('transfer_process__offering_team')
            .get(id=transfer_offer_id)
        )
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrada'}, status=404)
    
    process = offer.transfer_process
    offering_team = process.offering_team
    
    # Bloqueamos el equipo para evitar cambios concurrentes en su presupuesto
    offering_team = Team.objects.select_for_update().get(id=offering_team.id)
    
    if offer.status != TransferOfferStatus.PENDING:
        return JsonResponse({'error': 'Esta oferta ya no se puede rechazar'}, status=409)
    
    # Actualizamos el estado de la oferta
    offer.status = TransferOfferStatus.REJECTED
    offer.rejected_at = datetime.now(UTC)
    
    # Devolvemos el dinero retenido al equipo oferente
    offering_team.budget += process.amount
    
    # Guardamos todos los cambios dentro de la misma transacción
    offer.save(update_fields=['status', 'rejected_at'])
    offering_team.save(update_fields=['budget'])
    
    # Cerramos el proceso de negociación
    process.status = TransferProcessStatus.FINISHED
    process.finished_at = datetime.now(UTC)
    process.save(update_fields=['status', 'finished_at'])
    
    return HttpResponse(status=204)


@transaction.atomic
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
        # Bloqueamos la oferta original y su proceso
        offer = (
            TransferOffer.objects
            .select_for_update()
            .select_related('transfer_process__offering_team', 'transfer_process__draft_player')
            .get(id=transfer_offer_id)
        )
    except TransferOffer.DoesNotExist:
        return JsonResponse({'error': 'Oferta no encontrada'}, status=404)
    
    process = offer.transfer_process
    draft_player = process.draft_player
    
    # Bloqueamos el jugador (para evitar múltiples negociaciones simultáneas)
    draft_player = DraftPlayer.objects.select_for_update().get(id=draft_player.id)
    
    if offer.status != TransferOfferStatus.PENDING:
        return JsonResponse({'error': 'Esta oferta ya no se puede contraofertar'}, status=409)
    
    # Verificamos el número máximo de ofertas permitidas
    if offer.transfer_process.max_offers and TransferOffer.objects.filter(
        transfer_process=process
    ).count() + 1 > process.max_offers * 2:
        return JsonResponse({'error': 'No se pueden realizar más ofertas en esta negociación'}, status=409)
    
    try:
        draft_user = DraftUser.objects.get(user_id=request.user.id, draft=draft_player.draft)
    except DraftUser.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    
    try:
        counter_team = Team.objects.select_for_update().get(draft_user=draft_user)
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    # Determinamos los roles según quién hace la contraoferta
    offering_team = offer.target_team
    target_team = offer.offering_team
    
    # Si el equipo que contraoferta es el mismo que hizo la oferta original
    if counter_team == process.offering_team:
        offset = new_offer - offer.offer
        
        if offset <= 0:
            return JsonResponse({'error': 'La contraoferta debe ser superior a la oferta anterior'}, status=409)
        
        if offset > process.offering_team.budget:
            return JsonResponse({'error': 'No tienes presupuesto suficiente para ofrecer esa cantidad'}, status=409)
        
        # Actualizamos presupuesto y cantidad retenida
        process.offering_team.budget -= offset
        process.offering_team.save(update_fields=['budget'])
        
        process.amount += offset
        process.save(update_fields=['amount'])
        
        # Revertimos roles para crear correctamente la nueva oferta
        offering_team = process.offering_team
        target_team = process.target_team
    
    # Marcamos la oferta original como contraofertada
    offer.status = TransferOfferStatus.COUNTERED
    offer.countered_at = datetime.now(UTC)
    offer.save(update_fields=['status', 'countered_at'])
    
    # Creamos la nueva oferta dentro de la misma transacción
    TransferOffer.objects.create(
        offering_team=offering_team,
        target_team=target_team,
        offer=new_offer,
        transfer_process=process,
        source=TransferOfferSource.OFFER,
        source_offer=offer,
        draft_player=draft_player
    )
    
    return HttpResponse(status=201)

@transaction.atomic
def pay_player_release_clausule(request: HttpRequest):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    
    draft_player_id = data.get('draft_player_id')
    
    if not draft_player_id:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    # Bloqueamos el jugador (para evitar múltiples negociaciones simultáneas)
    draft_player = DraftPlayer.objects.select_for_update().get(id=draft_player_id)
    
    try:
        draft_user = DraftUser.objects.get(user_id=request.user.id, draft=draft_player.draft)
    except DraftUser.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    
    offering_team = Team.objects.select_for_update().get(draft=draft_player.draft, draft_user=draft_user)
    
    if offering_team.budget < draft_player.release_clause:
        return JsonResponse({'error': 'No tienes suficiente dinero para pagar la cláusula'}, status=409)
    
    
    target_team = Team.objects.select_for_update().get(id=draft_player.team.id)
    
    offering_team.budget -= draft_player.release_clause
    target_team.budget += draft_player.release_clause
    
    if draft_player.release_clause:
        target_team.clause_budget += draft_player.release_clause
        draft_player.release_clause = None
    
    draft_player.team = offering_team
    
    offering_team.save(update_fields=['budget'])
    target_team.save(update_fields=['budget', 'clause_budget'])
    draft_player.save(update_fields=['team', 'release_clause'])
    
    process = TransferProcess.objects.create(
        draft_player=draft_player,
        offering_team=offering_team,
        target_team=target_team,
        amount=draft_player.release_clause,
        status=TransferProcessStatus.FINISHED,
        finished_at=datetime.now(UTC)
    )
    
    offer = TransferOffer.objects.create(
        transfer_process=process,
        draft_player=draft_player,
        offering_team=offering_team,
        target_team=target_team,
        offer=draft_player.release_clause,
        status=TransferOfferStatus.ACEPTED,
        source=TransferOfferSource.RELEASE_CLAUSE,
        accepted_at=datetime.now(UTC),
    )
    
    Transfer.objects.create(
        transfer_process=process,
        draft_player=draft_player,
        from_team=target_team,
        to_team=offering_team,
        accepted_offer=offer,
        transfer_amount=draft_player.release_clause,
        release_clause_paid=True,
    )
    
    return HttpResponse(status=204)
    
