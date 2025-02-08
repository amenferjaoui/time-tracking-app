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

class IsAdminUser(permissions.BasePermission):
    def has_permission(self, request, view):
        if view.action == 'create':
            # For user creation, check if there's an authenticated admin user
            # or if it's an unauthenticated request (allowing initial user creation)
            return (
                (request.user and request.user.is_authenticated and request.user.is_superuser) or
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
            return [IsAdminUser()]  # Only need admin permission, no authentication required
        elif self.action == 'destroy':
            return [permissions.IsAuthenticated(), IsAdminUser()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsManagerOrAdmin()]
        return [permissions.IsAuthenticated()]

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data, context={'request': request})
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:  # Admin voit tout
            return User.objects.all()
        elif user.is_staff:  # Manager voit les admins, managers et ses utilisateurs gérés
            return User.objects.filter(models.Q(is_staff=True) | models.Q(is_superuser=True) | models.Q(manager=user))
        return User.objects.filter(id=user.id)  # User ne voit que lui-même

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
            raise PermissionDenied("Only managers and admins can create projects")
        
        # If admin is creating the project, use the manager from the request data
        # If manager is creating the project, use themselves as manager
        if self.request.user.is_superuser:
            serializer.save()  # Use manager from request data
        else:
            serializer.save(manager=self.request.user)

    def perform_update(self, serializer):
        instance = serializer.instance
        user = self.request.user
        
        # Only the project manager or admin can update
        if not user.is_superuser and instance.manager != user:
            raise PermissionDenied("Only the project manager or admin can update this project")
        
        serializer.save()

    @action(detail=True, methods=['post'], url_path='assign-users')
    def assign_users(self, request, pk=None):
        project = self.get_object()
        user = request.user
        
        try:
            # Validate user IDs
            user_ids = request.data.get('user_ids', [])
            if not isinstance(user_ids, list):
                raise ValidationError("user_ids must be a list")
            
            # Get users to assign
            users = User.objects.filter(id__in=user_ids)
            if len(users) != len(user_ids):
                raise ValidationError("Some user IDs are invalid")
            
            # Permission checks
            if user.is_superuser:
                # Admin can assign any user (including managers) to any project
                pass
            elif user.is_staff:
                # Manager can only assign their managed users to their own projects
                if project.manager != user:
                    raise PermissionDenied("You can only assign users to your own projects")
                
                # Managers can't assign other managers
                manager_users = users.filter(is_staff=True)
                if manager_users.exists():
                    raise ValidationError("Managers can only assign regular users to projects")
                
                # Verify all users are managed by this manager
                invalid_users = users.exclude(manager=user)
                if invalid_users.exists():
                    usernames = ", ".join([u.username for u in invalid_users])
                    raise PermissionDenied(f"You cannot assign these users: {usernames}")
            else:
                raise PermissionDenied("Only managers and admins can assign users to projects")
            
            # Clear existing assignments and add new ones
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

    def get_queryset(self):
        user = self.request.user
        if user.is_superuser:
            return SaisieTemps.objects.all()
        elif user.is_staff:
            return SaisieTemps.objects.filter(user__manager=user)
        return SaisieTemps.objects.filter(user=user)



    def create(self, request, *args, **kwargs):
        mutable_data = request.data.copy() if hasattr(request.data, 'copy') else dict(request.data)
        mutable_data['user'] = request.user.id
        serializer = self.get_serializer(data=mutable_data)
        serializer.is_valid(raise_exception=True)
        self.perform_create(serializer)
        headers = self.get_success_headers(serializer.data)
        return Response(serializer.data, status=status.HTTP_201_CREATED, headers=headers)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

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

            # Get all entries spanning these dates
            queryset = SaisieTemps.objects.filter(
                user_id=user_id,
                date__gte=start_date,
                date__lte=end_date
            ).select_related('projet')  # Include project data to avoid N+1 queries
            
            # Get all projects for this user
            projects = Projet.objects.filter(
                models.Q(saisietemps__user_id=user_id) | 
                models.Q(manager=request.user)
            ).distinct()
            
            # Create a map of existing entries
            entry_map = {}
            for entry in queryset:
                # Format date as YYYY-MM-DD to match frontend
                date_str = entry.date.strftime('%Y-%m-%d')
                key = f"{entry.projet.id}-{date_str}"
                entry_map[key] = entry
                logger.info(f"Found existing entry: {key}")
            
            # Generate entries for all dates in the range
            entries = []
            current_date = start_date
            while current_date <= end_date:
                date_str = current_date.strftime('%Y-%m-%d')
                
                for project in projects:
                    key = f"{project.id}-{date_str}"
                    logger.info(f"Processing key: {key}")
                    
                    if key in entry_map:
                        logger.info(f"Using existing entry for {key}")
                        entries.append(entry_map[key])
                    else:
                        logger.info(f"Creating dummy entry for {key}")
                        # Create a dummy entry with 0 hours
                        entries.append(SaisieTemps(
                            user_id=user_id,
                            projet=project,
                            date=current_date,
                            temps=0,
                            description=''
                        ))
                
                current_date += timedelta(days=1)
            
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
            total_hours = sum(entry.temps for entries in project_entries.values() for entry in entries)
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
                    ('ALIGN', (2, 1), (2, -1), 'LEFT'),  # Left align descriptions
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
