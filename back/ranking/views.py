from django.shortcuts import render
from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from team.models import Team
from team.models import Team


def view_clasification(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    teams = list(Team.objects.filter(league=league_id).values().order_by('-points'))
    
    return JsonResponse(teams, safe=False)