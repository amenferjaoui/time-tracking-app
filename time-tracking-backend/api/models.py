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

    def __str__(self):
        return self.username

    def save(self, *args, **kwargs):
        # Hash the password if it's not already hashed
        if self.pk is None or not self.password.startswith(('pbkdf2_sha256$', 'bcrypt$', 'argon2')):
            self.password = make_password(self.password)
            
        super().save(*args, **kwargs)
    
class Projet(models.Model):
    nom = models.CharField(max_length=255)
    description = models.TextField()
    manager = models.ForeignKey(User, on_delete=models.CASCADE, related_name='projets')

    def __str__(self):
        return self.nom

class SaisieTemps(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    projet = models.ForeignKey(Projet, on_delete=models.CASCADE)
    date = models.DateField()
    temps = models.DecimalField(max_digits=5, decimal_places=2)  # Temps en heures
    description = models.TextField()

    def __str__(self):
        return f"{self.user.username} - {self.projet.nom} - {self.date}"

class CompteRendu(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE)
    mois = models.DateField()  # Stocker uniquement le mois (par exemple, '2025-02-01')
    total_temps = models.DecimalField(max_digits=7, decimal_places=2)  # Temps total du mois
    statut = models.CharField(max_length=255, choices=[('draft', 'Draft'), ('final', 'Final')], default='draft')
    
    def __str__(self):
        return f"Compte Rendu - {self.user.username} - {self.mois.strftime('%B %Y')}"
