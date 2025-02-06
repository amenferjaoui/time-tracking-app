from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Projet, SaisieTemps, CompteRendu

class CustomUserAdmin(UserAdmin):
    list_display = ('username', 'email', 'first_name', 'last_name', 'role', 'manager')
    list_filter = ('role', 'is_active')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    ordering = ('username',)
    
    fieldsets = (
        (None, {'fields': ('username', 'password')}),
        ('Informations personnelles', {'fields': ('first_name', 'last_name', 'email')}),
        ('Permissions', {'fields': ('role', 'manager', 'is_active', 'is_staff', 'is_superuser', 'groups', 'user_permissions')}),
        ('Dates importantes', {'fields': ('last_login', 'date_joined')}),
    )
    
    add_fieldsets = (
        (None, {
            'classes': ('wide',),
            'fields': ('username', 'email', 'password1', 'password2', 'role', 'manager'),
        }),
    )

class ProjetAdmin(admin.ModelAdmin):
    list_display = ('nom', 'description', 'manager')
    list_filter = ('manager',)
    search_fields = ('nom', 'description', 'manager__username')

class SaisieTempsAdmin(admin.ModelAdmin):
    list_display = ('user', 'projet', 'date', 'temps', 'description')
    list_filter = ('user', 'projet', 'date')
    search_fields = ('user__username', 'projet__nom', 'description')
    date_hierarchy = 'date'

class CompteRenduAdmin(admin.ModelAdmin):
    list_display = ('user', 'mois', 'total_temps', 'statut')
    list_filter = ('user', 'mois', 'statut')
    search_fields = ('user__username',)
    date_hierarchy = 'mois'
    readonly_fields = ('total_temps',)

# Register models with their respective admin classes
admin.site.register(User, CustomUserAdmin)
admin.site.register(Projet, ProjetAdmin)
admin.site.register(SaisieTemps, SaisieTempsAdmin)
admin.site.register(CompteRendu, CompteRenduAdmin)
