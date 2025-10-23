from django.http import JsonResponse, HttpRequest
from django.views.decorators.http import require_GET, require_http_methods
from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch
from django.db import transaction
import json

from draft.models import Draft
from users.models import DraftUser
from team.models import Team, Lineup, LineupSlot
from players.models import DraftPlayer


def _error(msg, code=400):
    return JsonResponse({"error": msg}, status=code)


# ===========================================================
# equipo del usuario autenticado
# ===========================================================
@require_GET
@login_required
def my_team(request: HttpRequest, draft_id: int):
    try:
        draft_user = DraftUser.objects.get(draft_id=draft_id, user=request.user)
    except DraftUser.DoesNotExist:
        return _error("DraftUser no encontrado para este usuario y draft.", 404)

    try:
        team = (
            Team.objects
            .select_related("draft")
            .prefetch_related(
                Prefetch(
                    "draftplayer_set",
                    queryset=DraftPlayer.objects.select_related("player").order_by("id")
                )
            )
            .get(draft_id=draft_user.draft_id, draft_user=draft_user)
        )
    except Team.DoesNotExist:
        return _error("Equipo no encontrado.", 404)

    draft_players = team.draftplayer_set.all()

    players_payload = []
    for dp in draft_players:
        p = dp.player
        players_payload.append({
            "id": dp.id,
            "name": getattr(p, "name", None),
            "gender": getattr(p, "gender", None),
            "position": getattr(p, "position", None),
            "element": "Wind" if getattr(p, "element", None) == "Air" else getattr(p, "element", None),
            "sprite": (p.sprite.url if getattr(p, "sprite", None) else None),
            "value": getattr(p, "value", None),
        })

    response = {
        "id": team.id,
        "name": team.name,
        "budget": getattr(team, "budget", None),
        "players": players_payload,
    }
    return JsonResponse(response)


# ===========================================================
# equipo público por ID
# ===========================================================
@require_GET
def view_team(request: HttpRequest, draft_id: int, team_id: int):
    try:
        team = (
            Team.objects
            .select_related("draft")
            .prefetch_related(
                Prefetch(
                    "draftplayer_set",
                    queryset=DraftPlayer.objects.select_related("player").order_by("id")
                )
            )
            .get(id=team_id, draft_id=draft_id)
        )
    except Team.DoesNotExist:
        return _error("Equipo no encontrado para ese draft.", 404)

    draft_players = team.draftplayer_set.all()

    players_payload = []
    for dp in draft_players:
        p = dp.player
        players_payload.append({
            "id": dp.id,
            "name": getattr(p, "name", None),
            "gender": getattr(p, "gender", None),
            "position": getattr(p, "position", None),
            "element": "Wind" if getattr(p, "element", None) == "Air" else getattr(p, "element", None),
            "sprite": (p.sprite.url if getattr(p, "sprite", None) else None),
            "value": getattr(p, "value", None),
        })

    response = {
        "id": team.id,
        "name": team.name,
        "players": players_payload,
    }
    return JsonResponse(response)


# ===========================================================
# obtener alineación activa del usuario
# ===========================================================
@login_required
@require_http_methods(["GET"])
def get_lineup(request: HttpRequest, draft_id: int):
    """Devuelve la alineación activa del usuario autenticado."""
    try:
        draft_user = DraftUser.objects.get(draft_id=draft_id, user=request.user)
        team = Team.objects.get(draft_id=draft_id, draft_user=draft_user)
    except (DraftUser.DoesNotExist, Team.DoesNotExist):
        return _error("Equipo no encontrado para este usuario.", 404)

    lineup = team.get_active_lineup()

    slots = (
        lineup.slots.select_related("draft_player__player")
        .order_by("slot", "order")
    )

    def serialize_player(dp):
        p = dp.player
        return {
            "id": dp.id,
            "name": p.name,
            "position": p.position,
            "element": "Wind" if p.element == "Air" else p.element,
            "sprite": (p.sprite.url if p.sprite else None),
            "value": p.value,
        }

    starters, bench, reserves = [], [], []
    for s in slots:
        dp = s.draft_player
        data = serialize_player(dp)
        data.update({
            "order": s.order,
            "x_pct": s.x_pct,
            "y_pct": s.y_pct,
        })
        if s.slot == "starter":
            starters.append(data)
        elif s.slot == "bench":
            bench.append(data)
        else:
            reserves.append(data)

    payload = {
        "team": team.name,
        "formation": lineup.formation,
        "lineup_id": lineup.id,
        "starters": starters,
        "bench": bench,
        "reserves": reserves,
    }
    return JsonResponse(payload, safe=False)


# ===========================================================
# guardar alineación activa
# ===========================================================
@login_required
@require_http_methods(["PUT"])
def save_lineup(request: HttpRequest, draft_id: int):
    """Guarda la alineación actual del usuario autenticado."""
    try:
        draft_user = DraftUser.objects.get(draft_id=draft_id, user=request.user)
        team = Team.objects.get(draft_id=draft_id, draft_user=draft_user)
    except (DraftUser.DoesNotExist, Team.DoesNotExist):
        return _error("Equipo no encontrado para este usuario.", 404)

    try:
        payload = json.loads(request.body.decode("utf-8"))
    except Exception:
        return _error("JSON inválido.", 400)

    starters = payload.get("starters", [])
    bench = payload.get("bench", [])
    reserves = payload.get("reserves", [])
    formation = payload.get("formation", "4-4-2")
    coords = payload.get("coords", {})

    if len(starters) > 11 or len(bench) > 5:
        return _error("Límites: 11 titulares, 5 banquillo.", 400)

    lineup = team.get_active_lineup()
    lineup.formation = formation
    lineup.save(update_fields=["formation", "updated_at"])

    ids = [p["id"] for p in starters + bench + reserves]
    players_qs = DraftPlayer.objects.filter(id__in=ids, team=team)
    valid_ids = set(players_qs.values_list("id", flat=True))

    if len(valid_ids) != len(ids):
        return _error("Alguno de los jugadores no pertenece al equipo.", 400)

    with transaction.atomic():
        lineup.slots.all().delete()

        def create_slots(players, slot_name):
            for i, p in enumerate(players):
                dp_id = p["id"]
                dp = players_qs.get(id=dp_id)
                x = coords.get(str(dp_id), {}).get("x")
                y = coords.get(str(dp_id), {}).get("y")
                LineupSlot.objects.create(
                    lineup=lineup,
                    draft_player=dp,
                    slot=slot_name,
                    order=i,
                    x_pct=x,
                    y_pct=y,
                )

        create_slots(starters, "starter")
        create_slots(bench, "bench")
        create_slots(reserves, "reserve")

    team.set_active_lineup(lineup)
    return JsonResponse({"ok": True, "message": "Alineación guardada correctamente."})