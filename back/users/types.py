from django.db import models

class UserRole(models.TextChoices):
    ADMIN = 'admin', 'Administrador'
    PLAYER = 'player', 'Jugador'