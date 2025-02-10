from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework_simplejwt.views import TokenObtainPairView
from django.contrib.auth import get_user_model
from django.db import models
from .models import Projet, SaisieTemps, CompteRendu
from .serializers import (
    UserSerializer, CustomTokenObtainPairSerializer, ProjetSerializer,
    SaisieTempsSerializer, CompteRenduSerializer
)

User = get_user_model()


class IsAdminOrManagerForUserCreation(permissions.BasePermission):
    def has_permission(self, request, view):
        if view.action == 'create':
            # Pour la création d'utilisateur, vérifier si c'est un admin ou un manager
            return (
                (request.user and request.user.is_authenticated and
                 (request.user.is_superuser or request.user.is_staff)) or
                not User.objects.filter(is_superuser=True).exists()
            )
        return request.user and request.user.is_superuser


class IsManagerUser(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff and not request.user.is_superuser


class IsManagerOrAdmin(permissions.BasePermission):
    def has_permission(self, request, view):
        return request.user and request.user.is_staff


class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action == 'create':
            # Allow both admin and manager to create users
            return [IsAdminOrManagerForUserCreation()]
        elif self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsAdminOrManagerForUserCreation()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsManagerOrAdmin()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(
            data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        user = self.request.user

        if user.is_superuser:
            return User.objects.all()

        elif user.is_staff:

            return User.objects.filter(models.Q(id=user.id) | models.Q(manager=user))

        return User.objects.filter(id=user.id)

    @action(detail=False, methods=['get'])
    def me(self, request):
        serializer = self.get_serializer(request.user)
        return Response(serializer.data)


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class ProjetViewSet(viewsets.ModelViewSet):
    queryset = Projet.objects.all()
    serializer_class = ProjetSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            return [permissions.IsAuthenticated(), IsManagerOrAdmin()]
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        base_queryset = Projet.objects.prefetch_related('users')
        
        # Check if a specific user is requested in the query params
        requested_user_id = self.request.query_params.get('user')
        
        if requested_user_id:
            requested_user = User.objects.get(id=requested_user_id)
            # If requested user is a manager, return projects they manage OR are assigned to
            if requested_user.is_staff:
                return base_queryset.filter(
                    models.Q(manager=requested_user) | models.Q(users=requested_user)
                ).distinct()
            # For regular users, return only projects they're assigned to
            return base_queryset.filter(users=requested_user).distinct()
        
        # No specific user requested, use default permission logic
        if user.is_superuser:
            return base_queryset.all()
        elif user.is_staff:
            # Manager can see projects they manage OR are assigned to
            return base_queryset.filter(
                models.Q(manager=user) | models.Q(users=user)
            ).distinct()
        # Regular users can see projects they're assigned to
        return base_queryset.filter(users=user).distinct()

    def perform_create(self, serializer):
        if not self.request.user.is_staff:
            raise PermissionDenied(
                "Only managers and admins can create projects")

        if self.request.user.is_superuser:
            serializer.save()  
        else:
            serializer.save(manager=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user

        if not user.is_superuser and instance.manager != user:
            raise PermissionDenied(
                "Only the project manager or admin can update this project")

        serializer.save()

    @action(detail=True, methods=['post'], url_path='assign-users')
    def assign_users(self, request, pk=None):
        project = self.get_object()
        user = request.user

        try:
            user_ids = request.data.get('user_ids', [])
            if not isinstance(user_ids, list):
                raise ValidationError("user_ids must be a list")

            users = User.objects.filter(id__in=user_ids)
            if len(users) != len(user_ids):
                raise ValidationError("Some user IDs are invalid")

            if user.is_superuser:
                pass
            elif user.is_staff:
                if project.manager != user:
                    raise PermissionDenied(
                        "You can only assign users to your own projects")

                manager_users = users.filter(is_staff=True)
                if manager_users.exists():
                    raise ValidationError(
                        "Managers can only assign regular users to projects")


                invalid_users = users.exclude(manager=user)
                if invalid_users.exists():
                    usernames = ", ".join([u.username for u in invalid_users])
                    raise PermissionDenied(
                        f"You cannot assign these users: {usernames}")
            else:
                raise PermissionDenied(
                    "Only managers and admins can assign users to projects")

            project.users.clear()
            project.users.add(*users)

            return Response({"message": "Users assigned successfully"})

        except (ValidationError, PermissionDenied) as e:
            return Response({"error": str(e)}, status=status.HTTP_400_BAD_REQUEST)
        except Exception as e:
            import traceback
            return Response(
                {"error": f"An error occurred while assigning users: {str(e)}\n{traceback.format_exc()}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


class SaisieTempsViewSet(viewsets.ModelViewSet):
    queryset = SaisieTemps.objects.all()
    serializer_class = SaisieTempsSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_permissions(self):
        return [permissions.IsAuthenticated()]

    def get_queryset(self):
        user = self.request.user
        base_queryset = SaisieTemps.objects.select_related('user', 'projet')

        if user.is_superuser:
            return base_queryset.all()

        elif user.is_staff:
            return base_queryset.filter(
                models.Q(user=user) |  
                models.Q(user__manager=user)  
            )


        return base_queryset.filter(user=user)

    def create(self, request, *args, **kwargs):
        mutable_data = request.data.copy() if hasattr(
            request.data, 'copy') else dict(request.data)
        user = request.user
        
        if user.is_superuser:
            # Admin can create entries for anyone
            pass
        elif user.is_staff:
            # Manager can create entries for themselves and their managed users
            try:
                target_user_id = int(mutable_data.get('user', str(user.id)))
            except (ValueError, TypeError):
                target_user_id = user.id
            
            mutable_data['user'] = str(target_user_id)
            
            # If creating for another user (not themselves)
            if target_user_id != user.id:
                try:
                    target_user = User.objects.get(id=target_user_id)
                    if target_user.manager_id != user.id:
                        raise PermissionDenied("You can only create entries for your managed users")
                except User.DoesNotExist:
                    raise ValidationError("Invalid user ID")
            # If creating for themselves, no additional checks needed
        else:
            # Regular users can only create their own entries
            try:
                target_user_id = int(mutable_data.get('user', str(user.id)))
            except (ValueError, TypeError):
                target_user_id = user.id
                
            if target_user_id != user.id:
                raise PermissionDenied("You can only create your own time entries")
            mutable_data['user'] = str(user.id)

        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save()

    def update(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        if user.is_superuser:
            # Admin can update any entry
            pass
        elif user.is_staff:
            # Manager can update entries for themselves and their managed users
            # If updating another user's entry (not their own)
            if instance.user.id != user.id:
                if instance.user.manager_id != user.id:
                    raise PermissionDenied("You can only update entries for your managed users")
            # If updating their own entry, no additional checks needed
        else:
            # Regular users can only update their own entries
            if instance.user.id != user.id:
                raise PermissionDenied("You can only update your own time entries")

        return super().update(request, *args, **kwargs)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        user = request.user

        if user.is_superuser:
            # Admin can delete any entry
            pass
        elif user.is_staff:
            # Manager can delete entries for themselves and their managed users
            # If deleting another user's entry (not their own)
            if instance.user.id != user.id:
                if instance.user.manager_id != user.id:
                    raise PermissionDenied("You can only delete entries for your managed users")
            # If deleting their own entry, no additional checks needed
        else:
            # Regular users can only delete their own entries
            if instance.user.id != user.id:
                raise PermissionDenied("You can only delete your own time entries")

        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'], url_path=r'(?P<user_id>\d+)/monthly/(?P<month>\d{4}-\d{2})')
    def monthly(self, request, user_id=None, month=None):
        try:
            year, month = map(int, month.split('-'))

            import calendar
            from datetime import date, datetime
            from django.utils import timezone
            import logging

            logger = logging.getLogger(__name__)

            # Get entries for the specified month and any overflow days from adjacent months
            from datetime import date, timedelta

            # Get first day of the month
            first_day = date(year, month, 1)

            # Get last day of the month
            if month == 12:
                next_month = date(year + 1, 1, 1)
            else:
                next_month = date(year, month + 1, 1)
            last_day = next_month - timedelta(days=1)

            # Get Monday of the first week
            start_date = first_day - timedelta(days=first_day.weekday())

            # Get Sunday of the last week
            end_date = last_day + timedelta(days=(6 - last_day.weekday()))

            # Get all time entries for the specified month
            entries = SaisieTemps.objects.filter(
                user_id=user_id,
                date__year=year,
                date__month=month
            ).select_related('projet')  # Include project data to avoid N+1 queries

            serializer = self.get_serializer(entries, many=True)
            return Response(serializer.data)
        except (ValueError, TypeError):
            return Response(
                {"error": "Format de date invalide. Utilisez YYYY-MM"},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'], url_path=r'(?P<user_id>\d+)/report/(?P<month>\d{4}-\d{2})')
    def report(self, request, user_id=None, month=None):
        try:
            from reportlab.lib import colors
            from reportlab.lib.pagesizes import letter
            from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
            from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
            from io import BytesIO
            from django.http import HttpResponse
            from collections import defaultdict
            from django.contrib.auth import get_user_model

            User = get_user_model()
            year, month = map(int, month.split('-'))

            # Get user and time entries
            target_user = User.objects.get(id=user_id)
            queryset = SaisieTemps.objects.filter(
                user_id=user_id,
                date__year=year,
                date__month=month
            ).select_related('projet')  # Include project data to avoid N+1 queries

            # Create PDF buffer
            buffer = BytesIO()
            doc = SimpleDocTemplate(buffer, pagesize=letter)
            elements = []
            styles = getSampleStyleSheet()

            # Title
            title_style = ParagraphStyle(
                'CustomTitle',
                parent=styles['Heading1'],
                fontSize=16,
                spaceAfter=30
            )
            month_name = {
                1: 'Janvier', 2: 'Février', 3: 'Mars', 4: 'Avril',
                5: 'Mai', 6: 'Juin', 7: 'Juillet', 8: 'Août',
                9: 'Septembre', 10: 'Octobre', 11: 'Novembre', 12: 'Décembre'
            }[month]
            title = Paragraph(
                f"Rapport Mensuel - {target_user.username}<br/>"
                f"{month_name} {year}",
                title_style
            )
            elements.append(title)

            # Group entries by project
            project_entries = defaultdict(list)
            for entry in queryset:
                project_entries[entry.projet.nom].append(entry)

            # Summary
            total_hours = sum(
                entry.temps for entries in project_entries.values() for entry in entries)
            summary_data = [
                ['Total des heures:', f"{total_hours:.2f}"],
                ['Nombre de projets:', str(len(project_entries))]
            ]
            summary_table = Table(summary_data)
            summary_table.setStyle(TableStyle([
                ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                ('FONTSIZE', (0, 0), (-1, -1), 10),
                ('GRID', (0, 0), (-1, -1), 1, colors.black),
                ('BACKGROUND', (0, 0), (0, -1), colors.lightgrey),
                ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                ('PADDING', (0, 0), (-1, -1), 6),
            ]))
            elements.append(summary_table)
            elements.append(Spacer(1, 20))

            # Project details
            for project_name, entries in project_entries.items():
                # Project header
                project_total = sum(entry.temps for entry in entries)
                elements.append(Paragraph(
                    f"{project_name} ({project_total:.2f}h)",
                    styles['Heading2']
                ))

                # Project entries table
                data = [['Date', 'Heures', 'Description']]
                for entry in sorted(entries, key=lambda x: x.date):
                    data.append([
                        entry.date.strftime('%d/%m/%Y'),
                        f"{entry.temps:.2f}",
                        entry.description or ''
                    ])

                table = Table(data, colWidths=[100, 70, 300])
                table.setStyle(TableStyle([
                    ('FONTNAME', (0, 0), (-1, -1), 'Helvetica'),
                    ('FONTSIZE', (0, 0), (-1, -1), 10),
                    ('GRID', (0, 0), (-1, -1), 1, colors.black),
                    ('BACKGROUND', (0, 0), (2, 0), colors.lightgrey),
                    ('ALIGN', (0, 0), (-1, -1), 'CENTER'),
                    # Left align descriptions
                    ('ALIGN', (2, 1), (2, -1), 'LEFT'),
                    ('PADDING', (0, 0), (-1, -1), 6),
                ]))
                elements.append(table)
                elements.append(Spacer(1, 20))

            # Generate PDF
            doc.build(elements)
            pdf = buffer.getvalue()
            buffer.close()

            # Return PDF response
            response = HttpResponse(content_type='application/pdf')
            response['Content-Disposition'] = f'attachment; filename="report-{year}-{month:02d}-{user_id}.pdf"'
            response.write(pdf)
            return response
        except (ValueError, TypeError):
            return Response(
                {"error": "Format de date invalide. Utilisez YYYY-MM"},
                status=status.HTTP_400_BAD_REQUEST
            )


class CompteRenduViewSet(viewsets.ModelViewSet):
    queryset = CompteRendu.objects.all()
    serializer_class = CompteRenduSerializer
    permission_classes = [permissions.IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return CompteRendu.objects.all()
        elif user.is_staff:
            return CompteRendu.objects.filter(user__manager=user)
        return CompteRendu.objects.filter(user=user)

    def perform_create(self, serializer):
        # Calculer le total_temps automatiquement
        user = serializer.validated_data['user']
        mois = serializer.validated_data['mois']
        total_temps = SaisieTemps.objects.filter(
            user=user,
            date__year=mois.year,
            date__month=mois.month
        ).aggregate(total=models.Sum('temps'))['total'] or 0

        serializer.save(total_temps=total_temps)

    def perform_update(self, serializer):
        # Recalculer le total_temps lors de la mise à jour
        instance = serializer.instance
        total_temps = SaisieTemps.objects.filter(
            user=instance.user,
            date__year=instance.mois.year,
            date__month=instance.mois.month
        ).aggregate(total=models.Sum('temps'))['total'] or 0

        serializer.save(total_temps=total_temps)
