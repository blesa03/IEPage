from django.db import models
from users.types import UserRole
from draft.models import Draft

class User(models.Model):
    username = models.CharField(max_length=100, unique=True)
    # Guardaremos AQUÍ el hash de la contraseña (PBKDF2) usando django.contrib.auth.hashers
    key = models.CharField(max_length=128)
    role = models.CharField(max_length=6, choices=UserRole, default=UserRole.PLAYER)
    
    def __str__(self):
        return self.username

class DraftUser(models.Model):
    username = models.CharField(max_length=100)
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE)
    order = models.IntegerField(null=True, blank=True)
    
    def __str__(self):
        return self.username
