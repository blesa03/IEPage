from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from team.models import Team
from draft.models import Draft


def view_clasification(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    draft = Draft.objects.get(league=league_id)
    
    teams = list(Team.objects.filter(draft=draft).values().order_by('-points'))
    
    response = [
        {
            'id': team['id'],
            'points': team['points'],
            'name': team['name']
        } for team in teams
    ]
    
    return JsonResponse(response, safe=False)