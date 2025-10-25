# team/models.py
from django.db import models
from django.utils import timezone

from draft.models import Draft
from users.models import DraftUser
# ⚠️ NO importamos DraftPlayer para evitar ciclo.
# Usaremos 'players.DraftPlayer' como referencia por cadena.

class Team(models.Model):
    name = models.CharField(max_length=100)
    draft = models.ForeignKey(Draft, on_delete=models.CASCADE)
    draft_user = models.ForeignKey(DraftUser, on_delete=models.CASCADE)
    budget = models.DecimalField(decimal_places=2, max_digits=100)
    points = models.IntegerField(default=0)

    # Opcional: puntero a la alineación activa (puede ser null)
    current_lineup = models.OneToOneField(
        "Lineup",
        null=True,
        blank=True,
        on_delete=models.SET_NULL,
        related_name="current_for_team",
    )

    def __str__(self):
        return self.name

    def get_active_lineup(self):
        """
        Si hay alineación activa, la devuelve. Si no, devuelve la más reciente.
        Si no existe, crea una vacía por defecto (4-4-2).
        """
        if self.current_lineup_id:
            return self.current_lineup
        last = self.lineups.order_by("-updated_at").first()
        if last:
            return last
        return Lineup.objects.create(team=self, formation="4-4-2")

    def set_active_lineup(self, lineup: "Lineup"):
        self.current_lineup = lineup
        self.save(update_fields=["current_lineup"])


class Lineup(models.Model):
    """
    Alineación versionada vinculada a un Team.
    Guarda la formación y timestamps. Los jugadores se guardan en LineupSlot.
    """
    FORMATION_CHOICES = [
        ("4-4-2", "4-4-2"),
        ("4-3-3", "4-3-3"),
        ("3-5-2", "3-5-2"),
    ]

    team = models.ForeignKey(
        Team, on_delete=models.CASCADE, related_name="lineups"
    )
    formation = models.CharField(max_length=10, choices=FORMATION_CHOICES, default="4-4-2")
    created_at = models.DateTimeField(default=timezone.now, editable=False)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-updated_at", "-id"]

    def __str__(self):
        return f"{self.team.name} · {self.formation} · {self.updated_at:%Y-%m-%d %H:%M}"

    @property
    def starters(self):
        return self.slots.filter(slot="starter").order_by("order")

    @property
    def bench(self):
        return self.slots.filter(slot="bench").order_by("order")

    @property
    def reserves(self):
        return self.slots.filter(slot="reserve").order_by("order")


class LineupSlot(models.Model):
    """
    Cada relación alineación–jugador con su colocación.
    slot: starter/bench/reserve
    order: posición relativa dentro del contenedor
    x_pct/y_pct: coordenadas (0..100) opcionales para posición libre en el campo.
    """
    SLOT_CHOICES = [
        ("starter", "Starter"),
        ("bench", "Bench"),
        ("reserve", "Reserve"),
    ]

    lineup = models.ForeignKey(
        Lineup, on_delete=models.CASCADE, related_name="slots"
    )
    # 🔁 Referencia por cadena para evitar import circular
    draft_player = models.ForeignKey(
        "players.DraftPlayer",
        on_delete=models.CASCADE,
        related_name="lineup_slots",
    )

    slot = models.CharField(max_length=10, choices=SLOT_CHOICES, db_index=True)
    order = models.SmallIntegerField(default=0)

    # Coordenadas opcionales (en % relativo al contenedor del campo)
    x_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # 0..100
    y_pct = models.DecimalField(max_digits=5, decimal_places=2, null=True, blank=True)  # 0..100

    class Meta:
        unique_together = [
            ("lineup", "draft_player"),  # un mismo jugador no se duplica en la alineación
        ]
        indexes = [
            models.Index(fields=["lineup", "slot", "order"]),
        ]
        constraints = [
            models.CheckConstraint(check=models.Q(order__gte=0), name="lineupslot_order_nonnegative"),
            models.CheckConstraint(
                check=(models.Q(x_pct__isnull=True) | (models.Q(x_pct__gte=0) & models.Q(x_pct__lte=100))),
                name="lineupslot_x_pct_0_100",
            ),
            models.CheckConstraint(
                check=(models.Q(y_pct__isnull=True) | (models.Q(y_pct__gte=0) & models.Q(y_pct__lte=100))),
                name="lineupslot_y_pct_0_100",
            ),
        ]

    def __str__(self):
        return f"{self.lineup_id} · DP#{self.draft_player_id} · {self.slot}#{self.order}"