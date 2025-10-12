from django.http import JsonResponse, HttpRequest
from users.models import DraftUser
from .models import League
from draft.models import Draft
import json

def _me(request):
    return request.user if request.user.is_authenticated else None

def _require_auth(request):
    user = _me(request)
    if not user:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    return user

def my_leagues(request: HttpRequest):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    user = _require_auth(request)
    if isinstance(user, JsonResponse):
        return user

    uid = int(user.id)  # comparar por ID, sin instancias

    # 1) IDs de ligas donde es owner
    owner_ids = set(
        League.objects.filter(owner_id=uid).values_list('id', flat=True)
    )

    # 2) IDs de ligas donde participa (vía cualquier DraftUser suyo)
    participant_ids = set(
        DraftUser.objects
        .filter(user_id=uid)  # por ID, no por instancia
        .values_list('draft__league_id', flat=True)
        .distinct()
    )

    data = []

    # Primero owner (tienen prioridad)
    for lid, name in (
        League.objects.filter(id__in=owner_ids).values_list('id', 'name')
    ):
        data.append({'id': lid, 'name': name, 'role': 'owner'})

    # Luego player (excluyendo las que ya es owner)
    for lid, name in (
        League.objects.filter(id__in=(participant_ids - owner_ids)).values_list('id', 'name')
    ):
        data.append({'id': lid, 'name': name, 'role': 'player'})

    print("DEBUG /league/mine uid=", uid,
      "owner_ids=", list(owner_ids),
      "participant_ids=", list(participant_ids))

    return JsonResponse(data, safe=False)

def create_league(request: HttpRequest):
    if request.method != 'POST':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    user = _require_auth(request)
    if isinstance(user, JsonResponse):
        return user

    try:
        body = json.loads((request.body or b'').decode('utf-8')) or {}
    except Exception:
        return JsonResponse({'error': 'JSON inválido'}, status=400)

    name = (body.get('name') or '').strip()
    if not name:
        return JsonResponse({'error': 'Nombre obligatorio'}, status=400)

    league = League.objects.create(name=name, owner=user)
    return JsonResponse(
        {'id': league.id, 'name': league.name, 'owner': {'id': user.id, 'username': user.username}},
        status=201
    )

def get_league(request: HttpRequest, league_id: int):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)

    user = _require_auth(request)
    if isinstance(user, JsonResponse):
        return user

    try:
        league = League.objects.select_related('owner').get(id=league_id)
    except League.DoesNotExist:
        return JsonResponse({'error': 'No encontrado'}, status=404)

    # Seguridad mínima: solo owner o participante en algún draft de la liga
    is_owner = (league.owner_id == user.id)
    is_participant = DraftUser.objects.filter(user=user, draft__league_id=league.id).exists()
    if not (is_owner or is_participant):
        return JsonResponse({'error': 'No autorizado'}, status=403)

    # Miembros: usuarios distintos que aparecen en DraftUser de cualquier draft de la liga
    members_qs = (
        DraftUser.objects
        .filter(draft__league_id=league.id)
        .values('user_id', 'user__username')
        .distinct()
    )
    members = [{'id': row['user_id'], 'username': row['user__username']} for row in members_qs]

    # Draft actual: prioriza IN_PROGRESS; si no hay, el último creado
    current = (
        Draft.objects.filter(league=league, status='IN_PROGRESS').first()
        or Draft.objects.filter(league=league).order_by('-id').first()
    )

    payload = {
        'id': league.id,
        'name': league.name,
        'owner': {'id': league.owner_id, 'username': getattr(league.owner, 'username', None)},
        'members': members,
        'role': 'owner' if is_owner else 'player',
        'currentDraftId': current.id if current else None,
    }
    return JsonResponse(payload)
