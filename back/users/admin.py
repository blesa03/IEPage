from django.contrib import admin
from .models import User, DraftUser

@admin.register(User)
class UserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'role')
    search_fields = ('username',)
    list_filter = ('role',)

@admin.register(DraftUser)
class DraftUserAdmin(admin.ModelAdmin):
    list_display = ('id', 'username', 'user_id', 'draft_id')
    search_fields = ('username',)