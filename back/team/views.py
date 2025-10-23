from django.http import JsonResponse, HttpRequest
from django.views.decorators.http import require_GET, require_http_methods, require_POST
from django.core.exceptions import ValidationError
from django.contrib.auth.decorators import login_required
from django.db.models import Prefetch, F
from django.db import transaction
import json

from draft.models import Draft
from users.models import DraftUser
from team.models import Team, Lineup, LineupSlot
from players.models import DraftPlayer
from techniques.models import SpecialTechnique, DraftPlayerTechnique


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
            "gender": p.gender,
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

# ===========================================================
# Helpers para permisos y serialización
# ===========================================================
def _get_owned_team_and_dp(request, draft_id: int, dp_id: int):
    """
    Devuelve (team, dp) asegurando que el dp pertenece al equipo del usuario
    en el draft indicado.
    """
    try:
        draft_user = DraftUser.objects.get(draft_id=draft_id, user=request.user)
        team = Team.objects.get(draft_id=draft_id, draft_user=draft_user)
    except (DraftUser.DoesNotExist, Team.DoesNotExist):
        return None, None, _error("Equipo no encontrado para este usuario.", 404)

    try:
        dp = DraftPlayer.objects.select_related("player", "team").get(id=dp_id, team=team)
    except DraftPlayer.DoesNotExist:
        return team, None, _error("El jugador no pertenece a tu equipo.", 404)

    return team, dp, None


def _serialize_technique(st: SpecialTechnique):
    return {
        "id": st.id,
        "name": st.name,
        "type": st.st_type,
        "element": st.element if st.element != "Air" else "Wind",
        "users": st.users,
        "power": st.power,
    }


def _serialize_dp_technique(dpt: DraftPlayerTechnique):
    st = dpt.technique
    return {
        "id": st.id,
        "name": st.name,
        "type": st.st_type,
        "element": st.element if st.element != "Air" else "Wind",
        "users": st.users,
        "power": st.power,
        "order": dpt.order,
    }


# ===========================================================
# GET: técnicas asignadas a un DraftPlayer (ordenadas)
# GET /api/team/<draft_id>/players/<dp_id>/techniques/
# ===========================================================
@require_GET
@login_required
def list_player_techniques(request: HttpRequest, draft_id: int, dp_id: int):
    team, dp, err = _get_owned_team_and_dp(request, draft_id, dp_id)
    if err:
        return err

    dpts = (
        DraftPlayerTechnique.objects
        .filter(draft_player=dp)
        .select_related("technique")
        .order_by("order", "id")
    )
    data = [_serialize_dp_technique(x) for x in dpts]
    return JsonResponse({
        "draft_player_id": dp.id,
        "player_name": dp.player.name if dp.player_id else dp.name,
        "count": len(data),
        "techniques": data,          # max 6
        "remaining_slots": max(0, 6 - len(data)),
    })


# ===========================================================
# GET: catálogo con filtros (opcionalmente excluye las ya asignadas)
# GET /api/team/<draft_id>/players/<dp_id>/techniques/catalog?search=&type=&element=&exclude_assigned=1
# ===========================================================
@require_GET
@login_required
def catalog_techniques(request: HttpRequest, draft_id: int, dp_id: int):
    team, dp, err = _get_owned_team_and_dp(request, draft_id, dp_id)
    if err:
        return err

    qs = SpecialTechnique.objects.all()

    q = (request.GET.get("search") or "").strip()
    if q:
        qs = qs.filter(name__icontains=q)

    st_type = (request.GET.get("type") or "").strip()
    if st_type:
        qs = qs.filter(st_type=st_type)

    element = (request.GET.get("element") or "").strip()
    if element:
        qs = qs.filter(element=element)

    exclude_assigned = request.GET.get("exclude_assigned")
    if exclude_assigned in ("1", "true", "True"):
        assigned_ids = DraftPlayerTechnique.objects.filter(
            draft_player=dp
        ).values_list("technique_id", flat=True)
        qs = qs.exclude(id__in=assigned_ids)

    data = [_serialize_technique(x) for x in qs.order_by("name", "id")[:500]]
    return JsonResponse({"results": data})

# ===========================================================
# POST: añadir técnica a un DraftPlayer
# POST /api/team/<draft_id>/players/<dp_id>/techniques/add
# Body: { "technique_id": <int>, "order": <int 0..5 opcional> }
# ===========================================================
@require_POST
@login_required
def add_player_technique(request: HttpRequest, draft_id: int, dp_id: int):
    team, dp, err = _get_owned_team_and_dp(request, draft_id, dp_id)
    if err:
        return err

    try:
        payload = json.loads(request.body.decode("utf-8"))
        tech_id = int(payload.get("technique_id"))
    except Exception:
        return _error("JSON inválido o technique_id ausente.", 400)

    try:
        st = SpecialTechnique.objects.get(id=tech_id)
    except SpecialTechnique.DoesNotExist:
        return _error("SuperTécnica no encontrada.", 404)

    current = list(
        DraftPlayerTechnique.objects.filter(draft_player=dp).order_by("order", "id")
    )
    if any(x.technique_id == st.id for x in current):
        return _error("El jugador ya tiene esa SuperTécnica asignada.", 400)

    if len(current) >= 6:
        return _error("Máximo 6 SuperTécnicas por jugador.", 400)

    # order: si viene fijado 0..5 reubicamos, si no lo ponemos al final
    order = payload.get("order")
    if isinstance(order, int) and 0 <= order <= 5:
        insert_at = min(order, len(current))  # no más allá del final actual
        # Desplazar hacia abajo los existentes >= insert_at
        with transaction.atomic():
            DraftPlayerTechnique.objects.filter(
                draft_player=dp, order__gte=insert_at
            ).update(order=F("order") + 1)
            dpt = DraftPlayerTechnique.objects.create(
                draft_player=dp, technique=st, order=insert_at
            )
    else:
        # Añadir al final
        with transaction.atomic():
            dpt = DraftPlayerTechnique.objects.create(
                draft_player=dp, technique=st, order=len(current)
            )

    return JsonResponse({
        "ok": True,
        "added": _serialize_dp_technique(dpt),
        "total": DraftPlayerTechnique.objects.filter(draft_player=dp).count(),
    }, status=201)

# ===========================================================
# PUT: reordenar técnicas
# PUT /api/team/<draft_id>/players/<dp_id>/techniques/reorder
# Body: { "ordered_ids": [technique_id1, technique_id2, ...] }  (máx 6)
# ===========================================================
@require_http_methods(["PUT"])
@login_required
def reorder_player_techniques(request: HttpRequest, draft_id: int, dp_id: int):
    team, dp, err = _get_owned_team_and_dp(request, draft_id, dp_id)
    if err:
        return err

    try:
        payload = json.loads(request.body.decode("utf-8"))
        ordered_ids = list(map(int, payload.get("ordered_ids", [])))
    except Exception:
        return _error("JSON inválido.", 400)

    current = list(
        DraftPlayerTechnique.objects.filter(draft_player=dp).order_by("order", "id")
    )
    current_ids = [x.technique_id for x in current]

    if set(ordered_ids) != set(current_ids) or len(ordered_ids) != len(current_ids):
        return _error("La lista enviada no coincide con las técnicas actuales.", 400)

    with transaction.atomic():
        # Asignar nuevos índices
        pos = {tech_id: i for i, tech_id in enumerate(ordered_ids)}
        for dpt in current:
            new_order = pos[dpt.technique_id]
            if dpt.order != new_order:
                dpt.order = new_order
                dpt.save(update_fields=["order"])

    dpts = (
        DraftPlayerTechnique.objects.filter(draft_player=dp)
        .select_related("technique")
        .order_by("order", "id")
    )
    data = [_serialize_dp_technique(x) for x in dpts]
    return JsonResponse({"ok": True, "techniques": data})

# ===========================================================
# DELETE: eliminar técnica concreta
# DELETE /api/team/<draft_id>/players/<dp_id>/techniques/<tech_id>
# ===========================================================
@require_http_methods(["DELETE"])
@login_required
def delete_player_technique(request: HttpRequest, draft_id: int, dp_id: int, tech_id: int):
    team, dp, err = _get_owned_team_and_dp(request, draft_id, dp_id)
    if err:
        return err

    try:
        dpt = DraftPlayerTechnique.objects.get(draft_player=dp, technique_id=tech_id)
    except DraftPlayerTechnique.DoesNotExist:
        return _error("El jugador no tiene esa SuperTécnica.", 404)

    with transaction.atomic():
        removed_order = dpt.order
        dpt.delete()
        # Compactar huecos: bajar las superiores
        DraftPlayerTechnique.objects.filter(
            draft_player=dp, order__gt=removed_order
        ).update(order=F("order") - 1)

    return JsonResponse({"ok": True})
