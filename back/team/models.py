from django.db import models
from back.draft.models import Draft
from back.users.models import DraftUser

class Team(models.Model):
    name = models.CharField(max_length=100)
    draft_id = models.ForeignKey(Draft, on_delete=models.CASCADE)
    draft_user_id = models.ForeignKey(DraftUser, on_delete=models.CASCADE)
    budget = models.FloatField()
    
    def __str__(self):
        return self.name
