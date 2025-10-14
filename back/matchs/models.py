from django.db import models
from team.models import Team
from matchs.types import MatchStatus, MatchResultRequestStatus
from draft.models import Draft

class Match(models.Model):
    week = models.IntegerField()
    local_team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
    away_team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
    local_goals = models.IntegerField(null=True, blank=True)
    away_goals = models.IntegerField(null=True, blank=True)
    winner = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True, blank=True)
    status = models.CharField(choices=MatchStatus, default=MatchStatus.PENDING, max_length=100)
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE)
    
    def __str__(self):
        return f'{self.local_team} VS {self.away_team}'

class MatchResultRequest(models.Model):
    game = models.ForeignKey(Match, on_delete=models.CASCADE)
    local_goals = models.IntegerField(null=True, blank=True)
    away_goals = models.IntegerField(null=True, blank=True)

    status = models.CharField(choices=MatchResultRequestStatus, default=MatchResultRequestStatus.PENDING, max_length=100)
    
    def __str__(self):
        return f'Resultado propuesto para {self.match}'
