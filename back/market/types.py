from django.db import models

class TransferOfferStatus(models.TextChoices):
    PENDING = 'pending', 'Pendiente'
    ACEPTED = 'acepted', 'Aceptada'
    REJECTED = 'rejected', 'Rechazada'
    COUNTERED = 'countered', 'Contraoferta'

class TransferOfferSource(models.TextChoices):
    TEAM = 'team', 'Equipo'
    OFFER = 'offer', 'Oferta'
    RELEASE_CLAUSE = 'release_clause', 'Cláusula'


class TransferProcessStatus(models.TextChoices):
    OPEN = 'open', 'Abierta'
    FINISHED = 'finished', 'Finalizada'