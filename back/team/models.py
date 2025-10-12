from django.db import models
from draft.models import Draft
from users.models import DraftUser

class Team(models.Model):
    name = models.CharField(max_length=100)
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE)
    draft_user = models.ForeignKey(DraftUser, on_delete=models.CASCADE)
    budget = models.DecimalField(decimal_places=2, max_digits=100)
    points = models.IntegerField(default=0)
    
    def __str__(self):
        return self.name
