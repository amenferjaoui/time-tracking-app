from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.response import Response
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
        elif user.is_staff:  # Manager voit ses utilisateurs gérés
            return User.objects.filter(manager=user)
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
        if user.is_superuser:
            return Projet.objects.all()
        elif user.is_staff:
            return Projet.objects.filter(manager=user)
        return Projet.objects.filter(saisietemps__user=user).distinct()

    def perform_create(self, serializer):
        if self.request.user.is_staff:
            serializer.save(manager=self.request.user)
        else:
            serializer.save()

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

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=False, methods=['get'], url_path=r'(?P<user_id>\d+)/monthly/(?P<month>\d{4}-\d{2})')
    def monthly(self, request, user_id=None, month=None):
        try:
            year, month = map(int, month.split('-'))
            queryset = self.get_queryset().filter(
                user_id=user_id,
                date__year=year,
                date__month=month
            )
            serializer = self.get_serializer(queryset, many=True)
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
            queryset = self.get_queryset().filter(
                user_id=user_id,
                date__year=year,
                date__month=month
            )

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
