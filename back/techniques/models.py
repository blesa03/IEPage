from django.db import models

class SpecialTechnique(models.Model):
    """
    Catálogo global de SuperTécnicas (Chrono Stones).
    """
    TYPE_CHOICES = [
        ("Tiro", "Tiro"),
        ("Regate", "Regate"),
        ("Bloqueo", "Bloqueo"),
        ("Atajo", "Atajo"),
    ]
    ELEMENT_CHOICES = [
        ("Fire", "Fire"),     # Front ya mapea Air->Wind; aquí usamos inglés para consistencia
        ("Wind", "Wind"),
        ("Earth", "Earth"),
        ("Wood", "Wood"),
        ("Neutro", "Neutro"),
    ]

    name = models.CharField(max_length=100, db_index=True)
    st_type = models.CharField(max_length=20, choices=TYPE_CHOICES)
    element = models.CharField(max_length=20, choices=ELEMENT_CHOICES)
    users = models.SmallIntegerField(default=1)     # nº de jugadores necesarios (1,2,3)
    power = models.SmallIntegerField(default=0)     # Potencia CS (entera)

    class Meta:
        ordering = ["name"]
        unique_together = [("name", "st_type", "element", "users", "power")]

    def __str__(self):
        return f"{self.name} ({self.st_type}/{self.element})"


class DraftPlayerTechnique(models.Model):
    """
    Asignación de ST a un DraftPlayer con orden 0..5
    """
    draft_player = models.ForeignKey(
        "players.DraftPlayer",
        on_delete=models.CASCADE,
        related_name="techniques",
    )
    technique = models.ForeignKey(
        SpecialTechnique,
        on_delete=models.CASCADE,
        related_name="assigned_to",
    )
    order = models.PositiveSmallIntegerField(default=0)  # 0..5

    class Meta:
        unique_together = [("draft_player", "technique")]
        indexes = [
            models.Index(fields=["draft_player", "order"]),
        ]
        constraints = [
            models.CheckConstraint(
                check=models.Q(order__gte=0) & models.Q(order__lte=5),
                name="dpt_order_between_0_5",
            )
        ]

    def __str__(self):
        return f"DP#{self.draft_player_id} · {self.technique} · slot {self.order}"