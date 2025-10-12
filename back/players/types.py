from django.db import models

class PlayerGender(models.TextChoices):
    MALE = 'M', 'Hombre'
    FEMALE = 'F', 'Mujer'

class PlayerPosition(models.TextChoices):
    GOALKEEPER = 'GL', 'Portero'
    DEFENDER = 'DF', 'Defensa'
    MIDFIELDER = 'MF', 'Centrocampista'
    FORWARD = 'FW', 'Delantero'

class PlayerElement(models.TextChoices):
    AIR = 'air', 'Aire'
    FIRE = 'fire', 'Fuego'
    EARTH = 'earth', 'Montaña'
    WOOD = 'wood', 'Bosque'