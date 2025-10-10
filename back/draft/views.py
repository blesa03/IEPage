from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer
from draft.models import Draft
from draft.types import DraftStatus
import random

def get_players_by_draft(request: HttpRequest, draft_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft = Draft.objects.get(id=draft_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)
    
    if draft.status != DraftStatus.IN_PROGRESS:
        return JsonResponse({'error': 'El Draft no ha comenzado'}, status=409)
        
    players = DraftPlayer.objects.filter(draft_id=draft_id)
    data = list(players.values())
    
    return JsonResponse(data, safe=False)

def start_draft(request: HttpRequest, draft_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft = Draft.objects.get(id=draft_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)

    draft.status = DraftStatus.IN_PROGRESS
    draft.save(update_fields=['status'])
    
    players = list(DraftPlayer.objects.filter(draft_id=draft_id))
    
    if not players:
        return JsonResponse({'error': 'No hay jugadores en este draft'}, status=404)
    
    random.shuffle(players)
    
    for i, draft_player in enumerate(players, start=1):
        draft_player.order = i
        draft_player.save(update_fields=['order'])
    
    first_player = players[0].player_id
    draft.current_draft_player_id = first_player
    draft.save(update_fields=['current_draft_player_id'])

    return JsonResponse({'message': 'Draft actualizado correctamente'})
    
    

def finish_draft(request: HttpRequest, draft_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft = Draft.objects.get(id=draft_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)

    draft.status = DraftStatus.FINISHED
    draft.save(update_fields=['status'])

    return JsonResponse({'message': 'Draft actualizado correctamente'})
    
    
