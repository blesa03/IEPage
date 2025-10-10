from django.db import models
from league.models import League
from draft.types import DraftStatus

# Create your models here.
class Draft(models.Model):
    league = models.ForeignKey(League, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    current_draft_player = models.ForeignKey(
        'players.DraftPlayer',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='current_in_draft'
    )
    status = models.CharField(max_length=20, choices=DraftStatus, default=DraftStatus.NEW)
    
    def __str__(self):
        return self.name
