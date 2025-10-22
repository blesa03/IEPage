from django.http import JsonResponse, HttpRequest
from django.views.decorators.http import require_GET
from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch
import json
from django.db import transaction
from users.models import DraftUser
from team.models import Team
from players.models import DraftPlayer


def _error(msg, code=400):
    return JsonResponse({"error": msg}, status=code)


@require_GET
@login_required
def my_team(request: HttpRequest, draft_id: int):
    # draft_id llega como int en la URL; request.user debe estar autenticado
    try:
        # Si el campo en DraftUser es FK a Draft, puedes pasar draft_id directamente.
        draft_user = DraftUser.objects.get(draft_id=draft_id, user=request.user)
    except DraftUser.DoesNotExist:
        return _error("DraftUser no encontrado para este usuario y draft.", 404)

    try:
        team = (
            Team.objects
            .select_related("draft")
            .prefetch_related(
                Prefetch(
                    "draftplayer_set",  # ajusta si tienes related_name (p.ej. "draft_players")
                    queryset=DraftPlayer.objects.select_related("player").order_by("id")
                )
            )
            .get(draft_id=draft_user.draft_id, draft_user=draft_user)
        )
    except Team.DoesNotExist:
        return _error("Equipo no encontrado.", 404)

    # Si tu relación se llama distinto, cambia "draftplayer_set" por tu related_name
    draft_players = team.draftplayer_set.all()

    players_payload = []
    for dp in draft_players:
        p = dp.player
        players_payload.append({
            "id": dp.id,  # el front usa el id de DraftPlayer
            "name": getattr(p, "name", None),
            "gender": getattr(p, "gender", None),
            "position": getattr(p, "position", None),
            "element": getattr(p, "element", None),
            "sprite": (p.sprite.url if getattr(p, "sprite", None) else None),
            "value": getattr(p, "value", None),
        })

    response = {
        "id": team.id,
        "name": team.name,
        "budget": getattr(team, "budget", None),
        "players": players_payload,
    }
    return JsonResponse(response)  # dict -> safe=True por defecto


@require_GET
def view_team(request: HttpRequest, draft_id: int, team_id: int):
    # Esta vista la usas desde el front sin exigir login; si quieres protegerla añade @login_required
    try:
        team = (
            Team.objects
            .select_related("draft")
            .prefetch_related(
                Prefetch(
                    "draftplayer_set",  # ajusta si tu related_name es otro (p.ej. "draft_players")
                    queryset=DraftPlayer.objects.select_related("player").order_by("id")
                )
            )
            .get(id=team_id, draft_id=draft_id)  # filtra también por draft_id
        )
    except Team.DoesNotExist:
        return _error("Equipo no encontrado para ese draft.", 404)

    draft_players = team.draftplayer_set.all()

    players_payload = []
    for dp in draft_players:
        p = dp.player
        players_payload.append({
            "id": dp.id,  # mantener consistencia con el front (IDs de DraftPlayer)
            "name": getattr(p, "name", None),
            "gender": getattr(p, "gender", None),
            "position": getattr(p, "position", None),
            "element": getattr(p, "element", None),
            "sprite": (p.sprite.url if getattr(p, "sprite", None) else None),
            "value": getattr(p, "value", None),
        })

    response = {
        "id": team.id,
        "name": team.name,
        "players": players_payload,
    }
    return JsonResponse(response)

@transaction.atomic
def set_player_release_clausule(request: HttpRequest, draft_player_id: int):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        data = json.loads((request.body or b"{}").decode("utf-8")) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)
    
    release_clausule = data.get('release_clausule')
    
    if not release_clausule:
        return JsonResponse({'error': 'Faltan parámetros'}, status=400)
    
    # Bloqueamos el jugador (para evitar múltiples negociaciones simultáneas)
    draft_player = DraftPlayer.objects.select_for_update().get(id=draft_player_id)
    
    team = Team.objects.select_for_update().get(id=draft_player.team.id)
    
    if draft_player.release_clause:
        team.clause_budget += draft_player.release_clause
    
    team.clause_budget -= release_clausule
    draft_player.release_clause = release_clausule
    
    team.save(update_fields=['clause_budget'])
    draft_player.save(update_fields=['release_clause'])
    
    return JsonResponse({'message': 'Cláusula actualizada correctamente'})

@transaction.atomic
def remove_player_release_clausule(request: HttpRequest, draft_player_id: int):
    if request.method != 'PATCH':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    # Bloqueamos el jugador (para evitar múltiples negociaciones simultáneas)
    draft_player = DraftPlayer.objects.select_for_update().get(id=draft_player_id)
    
    if not draft_player.release_clause:
        return JsonResponse({'error': 'El jugador no tiene cláusula'}, status=409)
    
    team = Team.objects.select_for_update().get(id=draft_player.team.id)
    
    draft_player.release_clause = None
    team.clause_budget += draft_player.release_clause
    
    draft_player.save(update_fields=['release_clause'])
    team.save(update_fields=['clause_budget'])
    
    return JsonResponse({'message': 'Cláusula eliminada correctamente'})
    
        