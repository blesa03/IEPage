from django.db import models
from players.models import DraftPlayer
from team.models import Team
from django.core.validators import MinValueValidator
from market.types import TransferOfferStatus, TransferOfferSource

class TransferOffer(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    
    # Jugador que se ficha
    draft_player = models.ForeignKey(DraftPlayer, on_delete=models.CASCADE)
    
    # Equipo que hace la oferta
    offering_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='transfer_offers_made')
    # Equipo al que le llega la oferta
    target_team = models.ForeignKey(Team, on_delete=models.CASCADE, related_name='transfer_offers_received')
    
    # Oferta
    offer = models.DecimalField(
        decimal_places=2, 
        max_digits=12, 
        validators=[MinValueValidator(0.01)]
    )
    
    # Estado (PENDING: No ha habido respuesta, ACEPTED: Aceptada, REJECTED: Rechazada, COUNTERED: Se ha hecho contraoferta)
    status = models.CharField(max_length=20, choices=TransferOfferStatus.choices, default=TransferOfferStatus.PENDING)
    
    # Source de la oferta (TEAM: Oferta directa de un equipo, OFFER: Es una contraoferta de otra oferta)
    source = models.CharField(max_length=20, choices=TransferOfferSource.choices, default=TransferOfferSource.TEAM)
    # Oferta de la que proviene esta (solo en caso de ser contraoferta)
    source_offer = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True)
    
    
    def __str__(self):
        return f'Oferta de {self.offering_team.name} por {self.draft_player.name} por {self.offer}€'


class Transfer(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    
     # Jugador que se ficha
    draft_player = models.ForeignKey(DraftPlayer, on_delete=models.CASCADE)
    
    # Equipo del que proviene el jugador
    from_team =  models.ForeignKey(Team, on_delete=models.CASCADE, related_name='from_team')
    # Equipo al que va el jugador
    to_team =  models.ForeignKey(Team, on_delete=models.CASCADE, related_name='to_team')
    
    # Oferta aceptada
    accepted_offer = models.ForeignKey(TransferOffer, on_delete=models.CASCADE)
    
    # Precio de traspaso
    transfer_amount = models.DecimalField(
        decimal_places=2, 
        max_digits=12, 
    )
    
    def __str__(self):
        return f'Traspaso del jugador {self.draft_player.name} de {self.from_team.name} a {self.to_team.name} por {self.transfer_amount}€'
    