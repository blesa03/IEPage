from django.shortcuts import render
from django.http import JsonResponse, HttpRequest, StreamingHttpResponse
from players.models import DraftPlayer
from users.models import DraftUser
from draft.models import Draft
from draft.types import DraftStatus
from team.models import Team
import time
import random
import json

# TODO: Eliminar y mantener el SSE
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

# Funcion SSE
def get_players_by_draft_stream(request: HttpRequest, draft_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft = Draft.objects.get(id=draft_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)
    
    if draft.status != DraftStatus.IN_PROGRESS:
        return JsonResponse({'error': 'El Draft no ha comenzado'}, status=409)
    

    def event_stream():
        last_players_data = None
        while True:
            players = DraftPlayer.objects.filter(draft=draft_id)
            players_data = list(players.values())
            if players_data != last_players_data:
                last_players_data = players_data
                json_data = json.dumps(players_data)
                yield f"data: {json_data}\n\n"
            time.sleep(2)

    response = StreamingHttpResponse(event_stream(), content_type='text/event-stream')
    response['Cache-Control'] = 'no-cache'
    return response

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
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)

    draft_player_id = data.get('draft_player_id')
    draft_user_id   = data.get('draft_user_id')
    if not draft_player_id or not draft_user_id:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)

    try:
        draft = Draft.objects.get(id=draft_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)

    from players.models import DraftPlayer
    try:
        draft_player = DraftPlayer.objects.get(id=draft_player_id, draft=draft)
    except DraftPlayer.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)

    from team.models import Team
    try:
        team = Team.objects.get(draft=draft, draft_user_id=draft_user_id)
    except Team.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)

    draft_player.team = team
    draft_player.save(update_fields=['team'])
    return JsonResponse({'message': 'Jugador adquirido correctamente'})