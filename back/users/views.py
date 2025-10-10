from django.http import JsonResponse, HttpRequest
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.hashers import make_password, check_password
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from .models import User
import json

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

    user = User.objects.create(
        username=username,
        key=make_password(password),
        role=role if role in ('admin', 'player') else 'player'
    )

    request.session['user_id'] = user.id
    return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role})

@csrf_exempt
def login(request: HttpRequest):
    not_allowed = _require_method(request, 'POST')
    if not_allowed: return not_allowed

    data = _json_body(request)
    username = (data.get('username') or '').strip()
    password = data.get('password') or ''

    try:
        user = User.objects.get(username__iexact=username)
    except User.DoesNotExist:
        return JsonResponse({'error': 'Credenciales inválidas'}, status=401)

    if not check_password(password, user.key):
        return JsonResponse({'error': 'Credenciales inválidas'}, status=401)

    request.session['user_id'] = user.id
    return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role})

@csrf_exempt
def logout(request: HttpRequest):
    not_allowed = _require_method(request, 'POST')
    if not_allowed: return not_allowed
    request.session.flush()
    return JsonResponse({'ok': True})

@ensure_csrf_cookie
def me(request: HttpRequest):
    user_id = request.session.get('user_id')
    if not user_id:
        return JsonResponse({'error': 'No autenticado'}, status=401)
    try:
        user = User.objects.get(id=user_id)
    except User.DoesNotExist:
        request.session.flush()
        return JsonResponse({'error': 'No autenticado'}, status=401)
    return JsonResponse({'id': user.id, 'username': user.username, 'role': user.role})