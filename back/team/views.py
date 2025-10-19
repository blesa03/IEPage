from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer
from users.models import DraftUser
from draft.models import Draft
from team.models import Team
from players.models import DraftPlayer
from team.models import Team


def my_team(request: HttpRequest, draft_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft_user = DraftUser.objects.get(draft=draft_id, user=request.user)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'DraftUser no encontrado'}, status=404)
    
    try:
        team = Team.objects.get(draft=draft_user.draft, draft_user=draft_user)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    
    response = {
        'id': team.id,
        'name': team.name,
        'budget': team.budget,
        'players': [
            {
                'id': player.id,
                'name': player.player.name,
                'gender': player.player.gender,
                'position': player.player.position,
                'element': player.player.element,
                'sprite': player.player.sprite.url if player.player.sprite else None,
                'value': player.player.value,
            } for player in DraftPlayer.objects.filter(team=team)
        ]
    }
    
    return JsonResponse(response, safe=False)


def view_team(request: HttpRequest, draft_id, team_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    
    try:
        team = Team.objects.get(id=team_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Equipo no encontrado'}, status=404)
    
    response = {
        'id': team.id,
        'name': team.name,
        'players': [
            {
                'id': player.id,
                'name': player.player.name,
                'gender': player.player.gender,
                'position': player.player.position,
                'element': player.player.element,
                'sprite': player.player.sprite.url if player.player.sprite else None,
                'value': player.player.value,
            } for player in DraftPlayer.objects.filter(team=team)
        ]
    }
    
    return JsonResponse(response, safe=False)
