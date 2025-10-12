from django.db import models
from django.conf import settings

class League(models.Model):
	name = models.CharField(max_length=100)
	owner = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name='owned_leagues',
        null=True,
        blank=True,
    )

	def __str__(self):
		return self.name

