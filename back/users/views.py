from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt, ensure_csrf_cookie
from django.middleware.csrf import get_token
from django.contrib.auth import authenticate, login as auth_login, logout as auth_logout, get_user_model
import json

User = get_user_model()

def _json_body(request: HttpRequest) -> dict:
    try:
        return json.loads((request.body or b"").decode("utf-8")) or {}
    except Exception:
        return {}

def _require_method(request: HttpRequest, method: str):
    if request.method != method:
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    return None

@csrf_exempt
def register(request: HttpRequest):
    not_allowed = _require_method(request, 'POST')
    if not_allowed: return not_allowed

    data = _json_body(request)
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''
    role = (data.get('role') or 'player').lower()

    if not username or not password:
        return JsonResponse({'error': 'username y password son obligatorios'}, status=400)
    if User.objects.filter(username__iexact=username).exists():
        return JsonResponse({'error': 'Ese usuario ya existe'}, status=409)

    user = User.objects.create_user(
        username=username,
        password=password,
        role=role if role in ('admin', 'player') else 'player'
    )
    auth_login(request, user)
    return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role})

@csrf_exempt
def login(request: HttpRequest):
    not_allowed = _require_method(request, 'POST')
    if not_allowed: return not_allowed

    data = _json_body(request)
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    user = authenticate(request, username=username, password=password)
    if not user:
        return JsonResponse({'error': 'Credenciales inválidas'}, status=401)

    auth_login(request, user)
    return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role})

@csrf_exempt
def logout(request: HttpRequest):
    not_allowed = _require_method(request, 'POST')
    if not_allowed: return not_allowed
    auth_logout(request)
    return JsonResponse({'ok': True})

@ensure_csrf_cookie
def me(request: HttpRequest):
    if not request.user.is_authenticated:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    user = request.user
    return JsonResponse({'id': user.id, 'username': user.username, 'role': getattr(user, 'role', 'player')})

@ensure_csrf_cookie
def csrf(request):
    return JsonResponse({'csrfToken': get_token(request)})