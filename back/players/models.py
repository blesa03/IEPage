from django.db import models

# Modelo para todos los jugadores de la base de datos
class Player(models.Model):
	name = models.CharField(max_length=100)
	gender = models.CharField(max_length=10)
	position = models.CharField(max_length=50)
	element = models.CharField(max_length=50)
	sprite = models.URLField(blank=True)
	game_team = models.CharField(max_length=100)
	team_sprite = models.URLField(blank=True)

	def __str__(self):
		return self.name

# Modelo para los jugadores seleccionables en el draft
class DraftPlayer(models.Model):
	player_id = models.IntegerField()
	name = models.CharField(max_length=100)
	gender = models.CharField(max_length=10)
	position = models.CharField(max_length=50)
	element = models.CharField(max_length=50)
	sprite = models.URLField(blank=True)
	team_id = models.IntegerField()
	techniques = models.JSONField(default=dict, blank=True)

	def __str__(self):
		return self.name


