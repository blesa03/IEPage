from django.shortcuts import render
from django.http import JsonResponse, HttpRequest
from players.models import DraftPlayer, Player
from players.models import DraftPlayer
from market.models import TransferOffer


def view_player(request: HttpRequest, player_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        player = Player.objects.get(id=player_id)
    except Player.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)
    
    return JsonResponse(
        {
            'id': player.id,
            'name': player.name,
            'position': player.position,
            'element': player.element,    
            'sprite': player.sprite.url if player.sprite else None,    
            'value': player.value,    
        }, 
        safe=False)


def view_draft_player(request: HttpRequest, draft_player_id):
    if request.method != 'GET':
        return JsonResponse({'error': 'Método no permitido'}, status=405)
    
    try:
        player = DraftPlayer.objects.get(id=draft_player_id)
    except DraftPlayer.DoesNotExist:
        return JsonResponse({'error': 'Jugador no encontrado'}, status=404)
    
    return JsonResponse(
        {
            'id': player.id,
            'name': player.name,
            'position': player.player.position,
            'element': player.player.element,    
            'sprite': player.player.sprite.url if player.player.sprite else None,    
            'value': player.player.value,
            'offers': list(TransferOffer.objects.filter(draft_player=player).values())
        }, 
        safe=False)