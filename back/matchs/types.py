from django.db import models

class MatchStatus(models.TextChoices):
    PENDING = 'pending', 'Nuevo'
    PENDING_RESULT = 'pending_result', 'Pendiente de resultado'
    FINISHED = 'finished', 'En curso'
    
class MatchResultRequestStatus(models.TextChoices):
    PENDING = 'pending', 'Nuevo'
    APPROVED = 'aprobada', 'Aprobada'
    REJECTED = 'rejected', 'Rechazada'