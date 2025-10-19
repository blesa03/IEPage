from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from draft.models import Draft
from games.models import Game, GameResultRequest, Stats
from games.types import GameStatus, GameResultRequestStatus
import json
from players.models import DraftPlayer
from users.models import User

def view_matchs(request: HttpRequest, league_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    # Recuperamos el draft de la liga
    try:
        draft = Draft.objects.get(league_id=league_id)
    except Draft.DoesNotExist:
        return JsonResponse({'error': 'Draft no encontrado'}, status=404)
    
    # Para cada partidp deñ draft sacamos su información
    response = []
    for game in Game.objects.filter(draft=draft):
        result_request = None
        if game.status == GameStatus.PENDING_RESULT:
            result_request = Game.objects.get(match=game)
        
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

def view_match(request: HttpRequest, game_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    # Recuperamos el partido
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Partido no encontrado'}, status=404)
    
    response = {
        'id': game.id,
        'week': game.week,
        'local_team': game.local_team.name,
        'local_team_id': game.local_team.id,
        'away_team': game.away_team.name,
        'away_team_id': game.away_team.id,
        'local_goals': game.local_goals,
        'away_goals': game.away_goals,
        'winner': game.winner,
        'status': game.status,
    }
    
    return JsonResponse(response, safe=False)

def add_match_result_request(request: HttpRequest, game_id):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        user = User.objects.get(id=request.user.id)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrado'}, status=404)
    
    
    # Recuperamos el partido
    try:
        game = Game.objects.get(id=game_id)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Partido no encontrado'}, status=404)
    
    # Si el equipo del usuario que hace la petición no ha jugado el partido devolvemos el erro 
    if user not in [
        game.local_team.draft_user.user,
        game.away_team.draft_user.user
    ]:
        return JsonResponse({'error': 'Tu equipo no ha jugado este partido'}, status=405)
    
    # Si el partido no está pendiente significa que ya se ha puesto una solicitud o se ha finalizado
    if game.status != GameStatus.PENDING:
        return JsonResponse({'error': 'El partido no está pendiente'}, status=405)
    
    # Si existe alguna solicitud aprobada o pendiente damos error
    if GameResultRequest.objects.filter(game_id=game_id, status__in=[GameResultRequestStatus.APPROVED, GameResultRequestStatus.PENDING]).exists():
        return JsonResponse({'error': 'Hay una solictud pendiente o aprobada para este partido'}, status=405)
    
    try:
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    
    if not data.get('local_goals') or not data.get('away_goals') or not data.get('local_goalkeeper_id') or not data.get('away_goalkeeper_id'):
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    try:
        local_goalkeeper = DraftPlayer.objects.get(id=data.get('local_goalkeeper_id'))
    except DraftPlayer.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)
    
    try:
        away_goalkeeper = DraftPlayer.objects.get(id=data.get('away_goalkeeper_id'))
    except DraftPlayer.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)
    
    # Creamos el request
    GameResultRequest.objects.create(
        game=game,
        local_goals=data.get('local_goals'),
        away_goals=data.get('away_goals'),
        goals=data.get('goals'),
        local_goalkeeper=local_goalkeeper,
        away_goalkeeper=away_goalkeeper,
    )
    
    return JsonResponse({'message': 'Solicitud enviada correctamente'})

def get_match_result_requests(request: HttpRequest, game_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    # Filtramos las solicitudes de un partido
    requests = GameResultRequest.objects.filter(game_id=game_id)
    
    return JsonResponse(list(requests.values()), safe=False)

def approve_match_result_request(request: HttpRequest, game_result_request_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    # Obtenemos el user y vemos sus permisos
    try:
        user = User.objects.get(id=request.user.id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrada'}, status=404)
    
    # Si no es owner no le permitimos realizar esta acción
    if user.role != "owner":
        return JsonResponse({'error': 'No tienes permisos para hacer esto'}, status=404)
    
    # Recuperamos la solicitud
    try:
        game_result_request = GameResultRequest.objects.get(id=game_result_request_id)
    except GameResultRequest.DoesNotExist:
        return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
    
    # Si ya está resuelta damos error
    if game_result_request.status != GameResultRequestStatus.PENDING:
        return JsonResponse({'error': 'la solicitud ya ha sido resuelta'}, status=404)
    
    try:
        game = Game.objects.get(id=game_result_request.game.id)
    except Game.DoesNotExist:
        return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
    
    # Calculamos el ganador
    if game_result_request.local_goals > game_result_request.away_goals:
        game.winner = game.local_team
    elif game_result_request.local_goals < game_result_request.away_goals:
        game.winner = game.away_team
    
    # Cambiamos el estado de la solicitud a aprobada
    game_result_request.status = GameResultRequestStatus.APPROVED
    
    game_result_request.save(update_fields=['status'])
    
    # Actualizamos los datos del partido
    game.local_goals = game_result_request.local_goals
    game.away_goals = game_result_request.away_goals
    game.status = GameStatus.FINISHED
    
    # Si hay ganador
    if game.winner:
        # Le damos 8M al ganador y 2 al perdedor
        game.winner.budget += 8000000
        game.winner.points += 3
        
        loser_team = game.local_team if game.winner == game.local_team else game.away_team
        loser_team.budget += 2000000
        
        game.winner.save(update_fields=['budget', 'points'])
        loser_team.save(update_fields=['budget'])
    # Si no hay ganador (empate)
    else:
        # 5M para cada uno
        game.local_team.budget += 5000000
        game.away_team.budget += 5000000
        
        game.local_team.points += 1
        game.away_team.points += 1
        
        
        game.local_team.save(update_fields=['budget', 'points'])
        game.away_team.save(update_fields=['budget', 'points'])
    
    # Para cada jugador que ha marcado goles le creamos las estadísticas del partido
    for key, value in game_result_request.goals.items():
        try:
            draft_player = DraftPlayer.objects.get(id=key)
        except DraftPlayer.DoesNotExist:
            return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
        
        Stats.objects.create(
            game=game,
            draft_player=draft_player,
            goals=value
        )
    
    # Para cada portero creamos sus estadísticas
    Stats.objects.create(
        game=game,
        draft_player=game_result_request.local_goalkeeper,
        goals_against=game_result_request.away_goals
    )
    
    Stats.objects.create(
        game=game,
        draft_player=game_result_request.away_goalkeeper,
        goals_against=game_result_request.local_goals
    )
        
    
    game.save(update_fields=['winner', 'local_goals', 'away_goals', 'status'])
    
    return JsonResponse({'message': 'Solicitud aceptada correctamente'})

def reject_match_result_request(request: HttpRequest, game_result_request_id):
    if request.method != 'PUT':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    # Obtenemos el user y vemos sus permisos
    try:
        user = User.objects.get(id=request.user.id)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Usuario no encontrada'}, status=404)
    
    # Si no es owner no le permitimos realizar esta acción
    if user.role != "owner":
        return JsonResponse({'error': 'No tienes permisos para hacer esto'}, status=404)
    
    try:
        game_result_request = GameResultRequest.objects.get(id=game_result_request_id)
    except GameResultRequest.DoesNotExist:
        return JsonResponse({'error': 'Solicitud no encontrada'}, status=404)
    
    if game_result_request.status != GameResultRequestStatus.PENDING:
        return JsonResponse({'error': 'la solicitud ya ha sido resuelta'}, status=404)
    
    
    game_result_request.status = GameResultRequestStatus.REJECTED
    
    # Devolvemos el partido a estado pendiente
    game_result_request.game.status = GameStatus.PENDING
    game_result_request.game.save(update_fields=['status'])
    game_result_request.save(update_fields=['status'])
    
        
    return JsonResponse({'message': 'Solicitud recahzada correctamente'})
        
def match_result_requests(request: HttpRequest, game_id):
    if request.method == 'GET':
        return get_match_result_requests(request, game_id)
    if request.method == 'POST':
        return add_match_result_request(request, game_id)
    return JsonResponse({'error': 'Método no permitido'}, status=405)