from django.contrib.auth.models import AbstractUser
from django.db import models
from django.contrib.auth.hashers import make_password

class User(AbstractUser):
    ROLES = (
        ('admin', 'Admin'),
        ('manager', 'Manager'),
        ('user', 'User'),
    )
    
    role = models.CharField(max_length=10, choices=ROLES, default='user')
    manager = models.ForeignKey('self', on_delete=models.SET_NULL, null=True, blank=True, related_name='managed_users')

    def save(self, *args, **kwargs):
        # Synchroniser le rôle avec is_superuser et is_staff
        if self.is_superuser:
            self.role = 'admin'
        elif self.is_staff:
            self.role = 'manager'
        super().save(*args, **kwargs)

    def __str__(self):
        return self.username


class Projet(models.Model):
    nom = models.CharField(max_length=255)
    description = models.TextField(blank=True)
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projets')

    def __str__(self):
        return self.nom

class SaisieTemps(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    projet = models.ForeignKey(Projet, on_delete=models.CASCADE)
    date = models.DateField()
    temps = models.DecimalField(max_digits=5, decimal_places=2)  # Temps en heures
    description = models.TextField(blank=True)

    def __str__(self):
        return f"{self.user.username} - {self.projet.nom} - {self.date}"

class CompteRendu(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mois = models.DateField()  # Stocker uniquement le mois (par exemple, '2025-02-01')
    total_temps = models.DecimalField(max_digits=7, decimal_places=2)  # Temps total du mois
    statut = models.CharField(max_length=255, choices=[('draft', 'Draft'), ('final', 'Final')], default='draft')
    
    def __str__(self):
        return f"Compte Rendu - {self.user.username} - {self.mois.strftime('%B %Y')}"
