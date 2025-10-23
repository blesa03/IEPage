from django.contrib import admin
from .models import Team, Lineup, LineupSlot

class LineupSlotInline(admin.TabularInline):
    model = LineupSlot
    extra = 0

@admin.register(Lineup)
class LineupAdmin(admin.ModelAdmin):
    list_display = ("team", "formation", "updated_at")
    inlines = [LineupSlotInline]

admin.site.register(Team)