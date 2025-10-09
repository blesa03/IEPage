from django.db import models
from back.draft.models import Draft
from back.players.types import PlayerElement, PlayerGender, PlayerPosition


# Modelo para todos los jugadores de la base de datos
class Player(models.Model):
	name = models.CharField(max_length=100)
	gender = models.CharField(max_length=1, choices=PlayerGender)
	position = models.CharField(max_length=2, choices=PlayerPosition)
	element = models.CharField(max_length=5, choices=PlayerElement)
	sprite = models.ImageField(upload_to='imgs/', blank=True, null=True)

	def __str__(self):
		return self.name

# Modelo para los jugadores seleccionables en el draft
class DraftPlayer(models.Model):
	player_id = models.ForeignKey(Player, on_delete=models.CASCADE)
 	# TODO: Cambiar por ForeignKey
	team_id = models.IntegerField()
	name = models.CharField(max_length=100)
	draft_id = models.ForeignKey(Draft, on_delete=models.CASCADE)

	def __str__(self):
		return self.name


