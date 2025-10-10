from django.db import models

class League(models.Model):
	name = models.CharField(max_length=100)
	owner = models.ForeignKey(
        'users.User',
        on_delete=models.CASCADE,
        related_name='owned_leagues',
        null=True,
        blank=True,
    )

	def __str__(self):
		return self.name

