from django.db import models
from draft.models import Draft
from django.contrib.auth.models import AbstractUser
from django.conf import settings

class User(AbstractUser):
    ROLE = (("admin", "admin"), ("player", "player"))
    role = models.CharField(max_length=10, choices=ROLE, default="player")

    def __str__(self):
        return self.username

class DraftUser(models.Model):
    user  = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE)
    order = models.IntegerField(null=True, blank=True)

    class Meta:
        # un usuario no puede estar dos veces en el mismo draft
        constraints = [
            models.UniqueConstraint(fields=["draft", "user"], name="unique_user_in_draft"),
        ]
        indexes = [
            models.Index(fields=["draft"]),
            models.Index(fields=["user"]),
        ]

    def __str__(self):
        return self.user.username