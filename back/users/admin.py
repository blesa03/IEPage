from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin
from .models import User, DraftUser

@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    # Editar usuario: añade 'role'
    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Extra", {"fields": ("role",)}),
    )
    # Crear usuario: añade 'role'
    add_fieldsets = DjangoUserAdmin.add_fieldsets + (
        ("Extra", {"fields": ("role",)}),
    )

    list_display = ("id", "username", "role", "is_active", "is_superuser")
    list_filter = ("role", "is_active", "is_superuser")
    search_fields = ("username", "email")
    ordering = ("id",)

@admin.register(DraftUser)
class DraftUserAdmin(admin.ModelAdmin):
    # Mostramos el username del FK con columna ordenable
    list_display        = ("id", "username_col", "draft", "order")
    search_fields       = ("user__username", "draft__name")
    list_filter         = ("draft",)
    list_select_related = ("user", "draft")
    raw_id_fields       = ("user", "draft")

    def username_col(self, obj):
        return obj.user.username
    username_col.short_description = "Username"
    username_col.admin_order_field = "user__username"