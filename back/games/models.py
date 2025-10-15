from django.db import models
from team.models import Team
from games.types import GameStatus, GameResultRequestStatus
from draft.models import Draft
from players.models import DraftPlayer

class Game(models.Model):
    week = models.IntegerField()
    
    local_team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, related_name='local_team')
    away_team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, related_name='away_team')
    
    local_goals = models.IntegerField(null=True, blank=True)
    away_goals = models.IntegerField(null=True, blank=True)
    
    winner = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True, related_name='winner')
    
    status = models.CharField(choices=GameStatus, default=GameStatus.PENDING, max_length=100)
    
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE)
    
    def __str__(self):
        return f'{self.local_team} VS {self.away_team}'

class GameResultRequest(models.Model):
    # Partido
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    
    # Goles locales y visitantes
    local_goals = models.IntegerField(null=True, blank=True)
    away_goals = models.IntegerField(null=True, blank=True)
    
    # Portero local y visitante
    local_goalkeeper = models.ForeignKey(DraftPlayer, on_delete=models.SET_NULL, null=True, related_name='local_goalkeeper')
    away_goalkeeper = models.ForeignKey(DraftPlayer, on_delete=models.SET_NULL, null=True, related_name='away_goalkeeper')
    
    # Goles marcados (key: DraftPlayer, value: goles marcados)
    goals = models.JSONField(default=dict)

    # Estado de la solicitud
    status = models.CharField(choices=GameResultRequestStatus, default=GameResultRequestStatus.PENDING, max_length=100)
    
    def __str__(self):
        return f'Resultado propuesto para {self.game}'


class Stats(models.Model):
    # Partido
    game = models.ForeignKey(Game, on_delete=models.CASCADE)
    # Jugador al que pertencen las estadísticas
    draft_player = models.ForeignKey(DraftPlayer, on_delete=models.CASCADE)
    
    # Goles marcados
    goals = models.IntegerField(default=0)
    # Goles encajados
    goals_against = models.IntegerField(default=0)
    
    def __str__(self):
        return f'Estadísticas de {self.draft_player} en {self.game}'
