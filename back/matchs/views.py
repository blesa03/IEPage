from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from draft.models import Draft
from matchs.models import Match, MatchResultRequest
from matchs.types import MatchStatus, MatchResultRequestStatus
import json

def view_matchs(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        draft = Draft.objects.get(league_id=league_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)
    
    response = []
    for game in Match.objects.filter(draft=draft):
        result_request = None
        if game.status == MatchStatus.PENDING_RESULT:
            result_request = MatchResultRequest.objects.get(match=game)
        
        response.append(
            {
                'id': game.id,
                'week': game.week,
                'local_team': game.local_team.name,
                'away_team': game.away_team.name,
                'local_goals': game.local_goals,
                'away_goals': game.away_goals,
                'winner': game.winner,
                'status': game.status,
                'result_request': result_request
            }
        )

    return JsonResponse(response, safe=False)

def add_match_result_request(request: HttpRequest, match_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        game = Match.objects.get(id=match_id)
    except Match.DoesNotExist:
        return JsonResponse({'error': 'Partido no encontrado'}, status=404)
    
    if game.status != MatchStatus.PENDING:
        return JsonResponse({'error': 'El partido no está pendiente'}, status=405)
    
    if MatchResultRequest.objects.exists(match_id=match_id, status__in=[MatchResultRequestStatus.APPROVED, MatchResultRequestStatus.PENDING]):
        return JsonResponse({'error': 'Hay una solictud pendiente o aprobada para este partido'}, status=405)
    
    try:
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    
    if not data.get('local_goals') or not data.get('away_goals'):
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    MatchResultRequest.objects.create(
        game=game,
        local_goals=data.get('local_goals'),
        away_goals=data.get('away_goals'),
    )
    
    return JsonResponse({'message': 'Solicitud enviada correctamente'})

def get_match_result_requests(request: HttpRequest, match_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    requests = MatchResultRequest.objects.filter(match_id=match_id)
    
    return JsonResponse(list(requests.values()), safe=False)

def approve_match_result_request(request: HttpRequest, match_result_request_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        match_result_request = MatchResultRequest.objects.get(id=match_result_request_id)
    except MatchResultRequest.DoesNotExist:
        return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
    
    if match_result_request.status != MatchResultRequestStatus.PENDING:
        return JsonResponse({'error': 'la solicitud ya ha sido resuelta'}, status=404)
    
    try:
        game = Match.objects.get(id=match_result_request.match.id)
    except Match.DoesNotExist:
        return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
    
    if match_result_request.local_goals > match_result_request.away_goals:
        game.winner = game.local_team
    elif match_result_request.local_goals < match_result_request.away_goals:
        game.winner = game.away_team
    
    match_result_request.status = MatchResultRequestStatus.APPROVED
    
    match_result_request.save(update_fields=['status'])
        
    game.local_goals = match_result_request.local_goals
    game.away_goals = match_result_request.away_goals
    game.status = MatchStatus.FINISHED
    
    game.save(update_fields=['winner', 'local_goals', 'away_goals', 'status'])
    
    return JsonResponse({'message': 'Solicitud aceptada correctamente'})

def reject_match_result_request(request: HttpRequest, match_result_request_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        match_result_request = MatchResultRequest.objects.get(id=match_result_request_id)
    except MatchResultRequest.DoesNotExist:
        return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
    
    if match_result_request.status != MatchResultRequestStatus.PENDING:
        return JsonResponse({'error': 'la solicitud ya ha sido resuelta'}, status=404)
    
    
    match_result_request.status = MatchResultRequestStatus.REJECTED
    
    match_result_request.save(update_fields=['status'])
        
    return JsonResponse({'message': 'Solicitud recahzada correctamente'})
        
    
    
    