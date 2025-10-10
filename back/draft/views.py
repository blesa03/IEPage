from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer
from users.models import DraftUser
from draft.models import Draft
from draft.types import DraftStatus
from team.models import Team
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
        
    players = DraftPlayer.objects.filter(draft=draft_id)
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
    
    users = list(DraftUser.objects.filter(draft=draft_id))
    
    if not users:
        return JsonResponse({'error': 'No hay jugadores en este draft'}, status=404)
    
    random.shuffle(users)
    
    for i, draft_player in enumerate(users, start=1):
        draft_player.order = i
        draft_player.save(update_fields=['order'])
    
    draft.current_draft_user = users[0]
    draft.save(update_fields=['current_draft_player'])

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

    
def acquire_player(request: HttpRequest, draft_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft = Draft.objects.get(id=draft_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)

    try:
        draft_player = DraftPlayer.objects.get(id=request.body['draft_player_id'])
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Player no encontrado'}, status=404)
    
    try:
        team = Team.objects.get(draft=draft, draft_user=request.body['draft_user_id'])
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Player no encontrado'}, status=404)
    
    draft_player.team = team
    draft_player.save(update_fields=['team'])

    return JsonResponse({'message': 'Jugador adquirido correctamente'})
