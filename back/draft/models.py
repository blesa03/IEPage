from django.db import models
from back.league.models import League 

# Create your models here.
class Draft(models.Model):
    league_id = models.ForeignKey(League, on_delete=models.CASCADE)
    name = models.CharField(max_length=100)
    
    def __str__(self):
        return self.name
