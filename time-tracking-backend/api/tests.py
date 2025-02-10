from django.test import TestCase
from django.urls import reverse
from rest_framework.test import APITestCase
from rest_framework import status
from django.contrib.auth import get_user_model
from .models import Projet, SaisieTemps, CompteRendu
from decimal import Decimal
from datetime import date

User = get_user_model()

class UserModelTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        self.manager = User.objects.create_user(
            username='manager',
            email='manager@test.com',
            password='managerpass123',
            is_staff=True
        )
        self.user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )

    def test_user_creation(self):
        """Test user creation and role assignment"""
        self.assertEqual(self.admin.role, 'admin')
        self.assertEqual(self.manager.role, 'manager')
        self.assertEqual(self.user.role, 'user')

    def test_user_str(self):
        """Test user string representation"""
        self.assertEqual(str(self.user), 'user')

class ProjetModelTests(TestCase):
    """Test cases for Project model validation and business rules"""
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        self.manager = User.objects.create_user(
            username='manager',
            email='manager@test.com',
            password='managerpass123',
            is_staff=True
        )
        self.user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )

    def test_projet_creation(self):
        """Test project creation with valid manager"""
        projet = Projet.objects.create(
            nom="Test Project",
            description="Test Description",
            manager=self.manager
        )
        self.assertEqual(projet.nom, "Test Project")
        self.assertEqual(projet.manager, self.manager)

    def test_projet_str(self):
        """Test project string representation"""
        projet = Projet.objects.create(
            nom="Test Project",
            description="Test Description",
            manager=self.manager
        )
        self.assertEqual(str(projet), "Test Project")


class SaisieTempsModelTests(TestCase):
    """Test cases for Time Entry model and permissions"""
    def setUp(self):
        self.user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )
        self.manager = User.objects.create_user(
            username='manager',
            email='manager@test.com',
            password='managerpass123',
            is_staff=True
        )
        self.projet = Projet.objects.create(
            nom="Test Project",
            description="Test Description",
            manager=self.manager
        )
        self.projet.users.add(self.user)  

    def test_saisie_temps_creation(self):
        """Test time entry creation"""
        entry = SaisieTemps.objects.create(
            user=self.user,
            projet=self.projet,
            date=date.today(),
            temps=Decimal('1.00'),
            description="Test time entry"
        )
        self.assertEqual(entry.temps, Decimal('1.00'))
        self.assertEqual(entry.user, self.user)

    def test_saisie_temps_str(self):
        """Test time entry string representation"""
        entry = SaisieTemps.objects.create(
            user=self.user,
            projet=self.projet,
            date=date.today(),
            temps=Decimal('1.00')
        )
        expected_str = f"{self.user.username} - {self.projet.nom} - {date.today()}"
        self.assertEqual(str(entry), expected_str)

    def test_saisie_temps_validation(self):
        """Test time entry validation rules"""
        from django.core.exceptions import ValidationError
        from rest_framework.test import APIClient
        
        client = APIClient()
        client.force_authenticate(user=self.user)
        
        url = reverse('saisietemps-list')
        data = {
            'user': self.user.id,
            'projet': self.projet.id,
            'date': date.today().isoformat(),
            'temps': '2.00'  
        }
        response = client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)

class CompteRenduModelTests(TestCase):
    """Test cases for Monthly Report model and calculations"""
    def setUp(self):
        self.user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )

    def test_compte_rendu_creation(self):
        """Test monthly report creation"""
        report = CompteRendu.objects.create(
            user=self.user,
            mois=date(2025, 2, 1),
            total_temps=Decimal('1.00'),
            statut='draft'
        )
        self.assertEqual(report.total_temps, Decimal('1.00'))
        self.assertEqual(report.statut, 'draft')

    def test_compte_rendu_str(self):
        """Test monthly report string representation"""
        report = CompteRendu.objects.create(
            user=self.user,
            mois=date(2025, 2, 1),
            total_temps=Decimal('1.00'),
            statut='draft'
        )
        expected_str = f"Compte Rendu - {self.user.username} - February 2025"
        self.assertEqual(str(report), expected_str)


class APITests(APITestCase):
    """Test cases for API endpoints and permissions"""
    def setUp(self):
        self.admin = User.objects.create_superuser(
            username='admin',
            email='admin@test.com',
            password='adminpass123'
        )
        self.manager = User.objects.create_user(
            username='manager',
            email='manager@test.com',
            password='managerpass123',
            is_staff=True
        )
        self.user = User.objects.create_user(
            username='user',
            email='user@test.com',
            password='userpass123'
        )
        self.projet = Projet.objects.create(
            nom="Test Project",
            description="Test Description",
            manager=self.manager
        )
        self.projet.users.add(self.user)  

    def test_user_login(self):
        """Test user authentication"""
        url = reverse('token_obtain_pair')
        data = {
            'username': 'admin',
            'password': 'adminpass123'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('access', response.data)
        self.assertIn('refresh', response.data)

    def test_projet_list(self):
        """Test project listing with authentication"""
        self.client.force_authenticate(user=self.admin)
        url = reverse('projet-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_saisie_temps_creation(self):
        """Test time entry creation with authentication"""
        self.client.force_authenticate(user=self.user)
        url = reverse('saisietemps-list')
        data = {
            'user': self.user.id,
            'projet': self.projet.id,
            'date': '2025-02-10',
            'temps': '1.00',
            'description': 'Test entry'
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_compte_rendu_list(self):
        """Test monthly report listing with authentication"""
        self.client.force_authenticate(user=self.manager)
        url = reverse('compterendu-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)

    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints"""
        url = reverse('projet-list')
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_manager_project_creation(self):
        """Test project creation by manager"""
        self.client.force_authenticate(user=self.manager)
        url = reverse('projet-list')
        data = {
            'nom': 'New Project',
            'description': 'New Description',
            'manager': self.manager.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)

    def test_user_project_creation_forbidden(self):
        """Test project creation by regular user (should be forbidden)"""
        self.client.force_authenticate(user=self.user)
        url = reverse('projet-list')
        data = {
            'nom': 'New Project',
            'description': 'New Description',
            'manager': self.user.id
        }
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_403_FORBIDDEN)

    def test_project_user_assignment(self):
        """Test project user assignment functionality"""
        self.client.force_authenticate(user=self.manager)
        
        self.user.manager = self.manager
        self.user.save()
        
        user2 = User.objects.create_user(
            username='user2',
            email='user2@test.com',
            password='userpass123'
        )
        user2.manager = self.manager
        user2.save()
        
        url = reverse('projet-assign-users', kwargs={'pk': self.projet.id})
        data = {
            'user_ids': [self.user.id, user2.id]
        }
        
        response = self.client.post(url, data, format='json')
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        
        self.projet.refresh_from_db()
        self.assertEqual(self.projet.users.count(), 2)
        self.assertIn(self.user, self.projet.users.all())
        self.assertIn(user2, self.projet.users.all())

    def test_monthly_report_generation(self):
        """Test monthly report generation endpoint"""
        self.client.force_authenticate(user=self.manager)
        
        SaisieTemps.objects.create(
            user=self.user,
            projet=self.projet,
            date=date(2025, 2, 1),
            temps=Decimal('1.00')
        )
        
        url = reverse('saisietemps-report', kwargs={
            'user_id': self.user.id,
            'month': '2025-02'
        })
        
        response = self.client.get(url)
        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(response['Content-Type'], 'application/pdf')
