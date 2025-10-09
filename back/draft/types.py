from django.db import models

class DraftStatus(models.TextChoices):
    NEW = 'new', 'Nuevo'
    IN_PROGRESS = 'in_progress', 'En curso'
    FINISHED = 'finished', 'Finalizado'