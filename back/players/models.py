
from django.db import models
from players.types import PlayerElement, PlayerGender, PlayerPosition
from team.models import Team


# Modelo para todos los jugadores de la base de datos
class Player(models.Model):
	name = models.CharField(max_length=100)
	gender = models.CharField(max_length=1, choices=PlayerGender)
	position = models.CharField(max_length=2, choices=PlayerPosition)
	element = models.CharField(max_length=5, choices=PlayerElement)
	sprite = models.ImageField(upload_to='imgs/', blank=True, null=True)
	value = models.DecimalField(default=0.0, max_digits=100, decimal_places=2)

	def __str__(self):
		return self.name

# Modelo para los jugadores seleccionables en el draft
class DraftPlayer(models.Model):
	player = models.ForeignKey(Player, on_delete=models.CASCADE)
	team = models.ForeignKey(Team, on_delete=models.SET_NULL, null=True)
	name = models.CharField(max_length=100)
	draft = models.ForeignKey('draft.Draft', on_delete=models.CASCADE, related_name='players', null=True, blank=True)
 
	release_clause = models.DecimalField(default=0.0, max_digits=100, decimal_places=2)

	def __str__(self):
		return self.name