from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenRefreshView
from .views import (
    CustomTokenObtainPairView, UserViewSet, ProjetViewSet,
    SaisieTempsViewSet, CompteRenduViewSet
)

router = DefaultRouter()
router.register(r'users', UserViewSet)
router.register(r'projets', ProjetViewSet)
router.register(r'saisie-temps', SaisieTempsViewSet)
router.register(r'compte-rendus', CompteRenduViewSet)

urlpatterns = [
    path('', include(router.urls)),
    path('auth/login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('auth/refresh/', TokenRefreshView.as_view(), name='token_refresh'),
]
