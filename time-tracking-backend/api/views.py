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
        if self.action in ['create', 'destroy']:
            return [permissions.IsAuthenticated(), IsAdminUser()]
        elif self.action in ['update', 'partial_update']:
            return [permissions.IsAuthenticated(), IsManagerOrAdmin()]
        return [permissions.IsAuthenticated()]

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
            year, month = map(int, month.split('-'))
            queryset = self.get_queryset().filter(
                user_id=user_id,
                date__year=year,
                date__month=month
            )
            
            # TODO: Implement PDF generation here
            # For now, return the data as JSON
            serializer = self.get_serializer(queryset, many=True)
            return Response(serializer.data)
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
