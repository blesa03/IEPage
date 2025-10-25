from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from team.models import Team
from draft.models import Draft
from games.models import Stats
from django.db.models import Sum
from django.db.models import Sum, Count, F, FloatField, ExpressionWrapper


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
        .filter(draft_player__draft=draft, goals__gt=0)
        .values('draft_player__id', 'draft_player__name', 'draft_player__team__name')
        .annotate(total_goals=Sum('goals'))
        .order_by('-total_goals')[:10]
    )
    top_scorers = [
        {
            'id': stat['draft_player__id'],
            'name': stat['draft_player__name'],
            'team': stat['draft_player__team__name'],
            'goals': stat['total_goals'],
        } for stat in Stats.objects
        .filter(draft_player__draft=draft, goals__gt=0)
        .values('draft_player__id', 'draft_player__name', 'draft_player__team__name')
        .annotate(total_goals=Sum('goals'))
        .order_by('-total_goals')[:10]
    ]
    
    return JsonResponse(top_scorers, safe=False)


def get_top_goalkeepers(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    draft = Draft.objects.get(league=league_id)
    
    top_goalkeepers = [
        {
            'id': stat['draft_player__id'],
            'name': stat['draft_player__name'],
            'team': stat['draft_player__team__name'],
            'against_goals': stat['goals_against'],
            'games_played': stat['games_played'],
        }
        for stat in (
            Stats.objects
            .filter(goals=0, draft_player__draft=draft)
            .values('draft_player__id', 'draft_player__name', 'draft_player__team__name')
            .annotate(
                goals_against=Sum('goals_against'),
                games_played=Count('id'),
                avg_goals_per_game=ExpressionWrapper(
                    F('goals_against') / F('games_played'),
                    output_field=FloatField()
                )
            )
            .order_by('avg_goals_per_game')[:10]
        )
    ]
    
    return JsonResponse(top_goalkeepers, safe=False)