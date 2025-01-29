from django.db import models
from django.core.validators import MinValueValidator, MaxValueValidator


class User(models.Model):
    """
    Custom user model for time tracking application.
    """
    class Role(models.TextChoices):
        ADMIN = 'ADMIN', 'Admin'
        MANAGER = 'MANAGER', 'Manager'
        USER = 'USER', 'User'

    username = models.CharField(max_length=150, unique=True)
    password = models.CharField(max_length=128)
    role = models.CharField(
        max_length=10,
        choices=Role.choices,
        default=Role.USER
    )
    manager = models.ForeignKey(
        'self',
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name='team_members'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['username']

    def __str__(self):
        return f"{self.username} ({self.get_role_display()})"


class Project(models.Model):
    """
    Project model for tracking different projects users can log time against.
    """
    name = models.CharField(max_length=100)
    description = models.TextField(blank=True)
    created_by = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        limit_choices_to={'role': User.Role.MANAGER}
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class TimeEntry(models.Model):
    """
    Time entry model for logging hours spent on projects.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='time_entries'
    )
    project = models.ForeignKey(
        Project,
        on_delete=models.PROTECT,
        related_name='time_entries'
    )
    date = models.DateField()
    hours = models.PositiveIntegerField(
        validators=[
            MinValueValidator(1),
            MaxValueValidator(24)
        ]
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name_plural = 'Time entries'
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'project', 'date'],
                name='unique_user_project_date'
            )
        ]

    def __str__(self):
        return f"{self.user.username} - {self.project.name} - {self.date} ({self.hours}h)"


class Report(models.Model):
    """
    Monthly time report (CRA - Compte-Rendu d'Activité) model.
    """
    user = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name='reports'
    )
    month = models.CharField(
        max_length=7,
        help_text="Format: YYYY-MM"
    )
    report_file = models.FileField(
        upload_to='reports/%Y/%m/',
        help_text="PDF file containing the monthly activity report"
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-month']
        constraints = [
            models.UniqueConstraint(
                fields=['user', 'month'],
                name='unique_user_month'
            )
        ]

    def __str__(self):
        return f"CRA - {self.user.username} - {self.month}"
