from django.http import JsonResponse, HttpRequest
from users.models import DraftUser
from .models import League
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

    # 1) Ligas donde es owner
    owner_qs = League.objects.filter(owner=user).values('id', 'name')

    # 2) Ligas donde participa vía DraftUser (agrupando por liga), excluyendo las que ya es owner
    part_league_ids = (
        DraftUser.objects
        .filter(user=user)
        .values_list('draft__league_id', flat=True)
        .distinct()
    )
    participant_qs = League.objects.filter(id__in=part_league_ids).exclude(owner=user).values('id', 'name')

    # Opcional: ordenar por rol y nombre
    data = (
        [{'id': lg['id'], 'name': lg['name'], 'role': 'owner'} for lg in owner_qs] +
        [{'id': lg['id'], 'name': lg['name'], 'role': 'player'} for lg in participant_qs]
    )
    # data.sort(key=lambda x: (0 if x['role']=='owner' else 1, x['name'].lower()))

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
        league = League.objects.select_related('owner').get(id=league_id)  # 🔍 evita N+1
    except League.DoesNotExist:
        return JsonResponse({'error': 'No encontrado'}, status=404)

    # Seguridad mínima: solo owner o participante en algún draft de la liga
    is_owner = (league.owner_id == user.id)
    is_participant = DraftUser.objects.filter(user=user, draft__league_id=league.id).exists()
    if not (is_owner or is_participant):
        return JsonResponse({'error': 'No autorizado'}, status=403)

    # Miembros = usuarios que aparecen en DraftUser de cualquier draft de esta liga (distinct por user)
    members_qs = (
        DraftUser.objects
        .filter(draft__league_id=league.id)
        .values('user_id', 'user__username')
        .distinct()
    )
    members = [{'id': row['user_id'], 'username': row['user__username']} for row in members_qs]

    payload = {
        'id': league.id,
        'name': league.name,
        'owner': {'id': league.owner_id, 'username': getattr(league.owner, 'username', None)},
        'members': members,
        'role': 'owner' if is_owner else 'player',
    }
    return JsonResponse(payload)