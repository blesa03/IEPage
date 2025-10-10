from django.db import models
from users.types import UserRole
from draft.models import Draft

class User(models.Model):
    username = models.CharField(max_length=100)
    # TODO: Esto es para que entren ya pero se quitara por password
    key = models.CharField(max_length=100)
    role = models.CharField(max_length=6, choices=UserRole, default=UserRole.PLAYER)
    
    def __str__(self):
        return self.username

class DraftUser(models.Model):
    username = models.CharField(max_length=100)
    user_id = models.ForeignKey(User, on_delete=models.CASCADE)
    draft_id = models.ForeignKey(Draft, on_delete=models.CASCADE)
    
    def __str__(self):
        return self.username
