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
    
    players = list(DraftPlayer.objects.filter(team=team))
    
    
    
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
                'sprite': player.player.sprite,
                'value': player.player.value,
            } for player in players
        ]
    }
    
    return JsonResponse(response, safe=False)
