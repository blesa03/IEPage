from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from team.models import Team
from draft.models import Draft
from games.models import Stats
from django.db.models import Sum
from players.types import PlayerPosition


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

def get_scorers(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    draft = Draft.objects.get(league=league_id)
    
    top_scorers = (
        Stats.objects
        .filter(draft_player__draft=draft)
        .values('draft_player__id', 'draft_player__name')
        .annotate(total_goals=Sum('goals'))
        .order_by('-total_goals')[:10]
    )
    
    return JsonResponse(list(top_scorers), safe=False)


def get_top_goalkeepers(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    draft = Draft.objects.get(league=league_id)
    
    top_goalkeepers = (
        Stats.objects
        .filter(draft_player__player__position=PlayerPosition.GOALKEEPER, draft_player__draft=draft)
        .values('draft_player__id', 'draft_player__name')
        .annotate(total_goals=Sum('goals_against'))
        .order_by('total_goals')[:10]
    )
    
    return JsonResponse(list(top_goalkeepers), safe=False)