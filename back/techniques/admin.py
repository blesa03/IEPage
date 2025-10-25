from django.contrib import admin
from .models import SpecialTechnique, DraftPlayerTechnique

@admin.register(SpecialTechnique)
class STAdmin(admin.ModelAdmin):
    list_display = ("id", "name", "st_type", "element", "users", "power")
    list_filter = ("st_type", "element", "users")
    search_fields = ("name",)

@admin.register(DraftPlayerTechnique)
class DPTAdmin(admin.ModelAdmin):
    list_display = ("id", "draft_player", "technique", "order")
    list_filter = ("order", "technique__st_type", "technique__element")
    search_fields = ("draft_player__name", "technique__name")