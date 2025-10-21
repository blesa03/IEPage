from django.db import models

class GameStatus(models.TextChoices):
    PENDING = 'pending', 'Nuevo'
    PENDING_RESULT = 'pending_result', 'Pendiente de resultado'
    FINISHED = 'finished', 'En curso'
    
class GameResultRequestStatus(models.TextChoices):
    PENDING = 'pending', 'Nuevo'
    APPROVED = 'aprobada', 'Aprobada'
    REJECTED = 'rejected', 'Rechazada'