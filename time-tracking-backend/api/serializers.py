from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Projet, SaisieTemps, CompteRendu

User = get_user_model()

class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    
    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role', 'manager', 'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser')
        read_only_fields = ('id',)  # role n'est plus en lecture seule
        extra_kwargs = {
            'manager': {'required': False},
            'is_superuser': {'required': False},
            'is_staff': {'required': False}
        }

    def create(self, validated_data):
        # Ne pas hasher le mot de passe ici car il sera hashé dans le modèle
        user = User.objects.create(**validated_data)
        return user

    def update(self, instance, validated_data):
        # Pour la mise à jour, on doit quand même hasher le mot de passe car save() ne le fera pas
        if 'password' in validated_data:
            password = validated_data.pop('password')
            instance.set_password(password)
        return super().update(instance, validated_data)

    def validate_manager(self, value):
        if value and not value.is_staff:
            raise serializers.ValidationError("Le manager assigné doit être un staff member (manager ou admin)")
        return value

    def validate(self, data):
        # Seul un superuser peut créer/modifier d'autres superusers
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            if data.get('role') == 'admin' or data.get('is_superuser'):
                raise serializers.ValidationError("Seul un administrateur peut créer ou modifier des administrateurs")
            if data.get('role') == 'manager' or data.get('is_staff'):
                raise serializers.ValidationError("Seul un administrateur peut créer ou modifier des managers")

        # Synchroniser role avec is_superuser et is_staff
        role = data.get('role')
        if role:
            if role == 'admin':
                data['is_superuser'] = True
                data['is_staff'] = True
            elif role == 'manager':
                data['is_superuser'] = False
                data['is_staff'] = True
            else:  # user
                data['is_superuser'] = False
                data['is_staff'] = False

        return data

class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        # Add custom claims
        token['role'] = user.role
        token['username'] = user.username
        token['is_superuser'] = user.is_superuser
        token['is_staff'] = user.is_staff
        return token

    def validate(self, attrs):
        data = super().validate(attrs)
        # Add extra responses here
        data['id'] = self.user.id
        data['role'] = self.user.role
        data['username'] = self.user.username
        data['is_superuser'] = self.user.is_superuser
        data['is_staff'] = self.user.is_staff
        return data

class ProjetSerializer(serializers.ModelSerializer):
    class Meta:
        model = Projet
        fields = ('id', 'nom', 'description', 'manager')
        read_only_fields = ('id',)

    def validate_manager(self, value):
        if not value.is_staff:  # Vérifie si l'utilisateur est admin ou manager
            raise serializers.ValidationError("Seuls les administrateurs et les managers peuvent gérer des projets")
        return value

class SaisieTempsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaisieTemps
        fields = ('id', 'user', 'projet', 'date', 'temps', 'description')
        read_only_fields = ('id', 'user')
        extra_kwargs = {
            'description': {'required': False}
        }

    def validate(self, data):
        # Vérifier que l'utilisateur a accès au projet
        user = self.context['request'].user
        projet = data['projet']
        if not user.is_staff and projet.manager != user.manager:
            # Vérifier si l'utilisateur est assigné à ce manager
            if not user.manager or user.manager != projet.manager:
                raise serializers.ValidationError("Vous n'avez pas accès à ce projet")
        return data

    def validate_temps(self, value):
        if value not in [0, 0.5, 1]:
            raise serializers.ValidationError("Le temps doit être 0, 0.5 (demi-journée) ou 1 (journée entière)")
        return value

class CompteRenduSerializer(serializers.ModelSerializer):
    class Meta:
        model = CompteRendu
        fields = ('id', 'user', 'mois', 'total_temps', 'statut')
        read_only_fields = ('id', 'total_temps')

    def validate(self, data):
        # Vérifier que l'utilisateur a le droit de créer/modifier ce compte rendu
        user = self.context['request'].user
        if not user.is_staff and data['user'] != user:
            raise serializers.ValidationError("Vous ne pouvez pas créer/modifier le compte rendu d'un autre utilisateur")
        return data
