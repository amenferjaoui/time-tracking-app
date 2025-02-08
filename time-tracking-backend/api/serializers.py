from rest_framework import serializers
from django.contrib.auth import get_user_model
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from .models import Projet, SaisieTemps, CompteRendu
from django.db.models import Sum

User = get_user_model()


class UserSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)

    class Meta:
        model = User
        fields = ('id', 'username', 'email', 'password', 'role', 'manager',
                  'first_name', 'last_name', 'is_active', 'is_staff', 'is_superuser')
        read_only_fields = ('id',)  # role n'est plus en lecture seule
        extra_kwargs = {
            'manager': {'required': False},
            'is_superuser': {'required': False},
            'is_staff': {'required': False}
        }

    def create(self, validated_data):
        if 'password' not in validated_data:
            raise serializers.ValidationError({'password': 'Password is required when creating a user'})
        password = validated_data.pop('password')
        user = User(**validated_data)
        user.set_password(password)  # Hashage ici
        user.save()
        return user

    def update(self, instance, validated_data):
        if 'password' in validated_data:
            password = validated_data.pop('password')
            instance.set_password(password)  # Hashage ici
        return super().update(instance, validated_data)

    def validate_manager(self, value):
        if not value:
            return value
            
        # If we got a User object
        if isinstance(value, User):
            if not value.is_staff:
                raise serializers.ValidationError(
                    "Le manager assigné doit être un staff member (manager ou admin)")
            return value
            
        # If we got an ID
        try:
            manager = User.objects.get(id=value)
            if not manager.is_staff:
                raise serializers.ValidationError(
                    "Le manager assigné doit être un staff member (manager ou admin)")
            return manager
        except User.DoesNotExist:
            raise serializers.ValidationError("Manager spécifié n'existe pas")

    def validate(self, data):
        # Seul un superuser peut créer/modifier d'autres superusers
        request = self.context.get('request')
        if request and not request.user.is_superuser:
            if data.get('role') == 'admin' or data.get('is_superuser'):
                raise serializers.ValidationError(
                    "Seul un administrateur peut créer ou modifier des administrateurs")
            if data.get('role') == 'manager' or data.get('is_staff'):
                raise serializers.ValidationError(
                    "Seul un administrateur peut créer ou modifier des managers")

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
    users = UserSerializer(many=True, read_only=True)
    user_ids = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=User.objects.all(),
        required=False,
        write_only=True,
        source='users'
    )

    class Meta:
        model = Projet
        fields = ('id', 'nom', 'description', 'manager', 'users', 'user_ids')
        read_only_fields = ('id',)

    def validate_manager(self, value):
        if not value.is_staff and not value.is_superuser:
            raise serializers.ValidationError(
                "Seuls les administrateurs et les managers peuvent être managers d'un projet.")
        return value

    def validate_users(self, value):
        request = self.context.get('request')
        if not request or not request.user:
            raise serializers.ValidationError("Utilisateur non authentifié")

        # Get the manager from the data or instance
        manager = self.initial_data.get(
            'manager') if self.instance is None else self.instance.manager
        if isinstance(manager, str):
            manager = User.objects.get(id=manager)

        # Admin can assign any user
        if request.user.role == 'admin':
            return value

        # Manager can only assign their own users
        if request.user.role == 'manager':
            if request.user.id != manager.id:
                raise serializers.ValidationError(
                    "Vous ne pouvez pas assigner des utilisateurs à un projet que vous ne gérez pas")

            invalid_users = [
                user for user in value if user.manager_id != request.user.id]
            if invalid_users:
                usernames = ', '.join(
                    [user.username for user in invalid_users])
                raise serializers.ValidationError(
                    f"Vous ne pouvez pas assigner les utilisateurs suivants: {usernames}")

        return value


class SaisieTempsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaisieTemps
        fields = ('id', 'user', 'projet', 'date', 'temps', 'description')
        read_only_fields = ('id', 'user')
        extra_kwargs = {
            'description': {'required': False}
        }

    # def validate(self, data):
    #     # Vérifier que l'utilisateur a accès au projet
    #     user = self.context['request'].user
    #     projet = data['projet']
    #     if not user.is_staff and projet.manager != user.manager:
    #         # Vérifier si l'utilisateur est assigné à ce manager
    #         if not user.manager or user.manager != projet.manager:
    #             raise serializers.ValidationError(
    #                 "Vous n'avez pas accès à ce projet")
    #     return data

    from django.db.models import Sum


class SaisieTempsSerializer(serializers.ModelSerializer):
    class Meta:
        model = SaisieTemps
        fields = ('id', 'user', 'projet', 'date', 'temps', 'description')
        read_only_fields = ('id', 'user')
        extra_kwargs = {
            'description': {'required': False}
        }

    def validate(self, data):
        user = self.context['request'].user
        date = data['date']
        new_temps = data['temps']
        projet = data['projet']

        # Vérifier que l'utilisateur a accès au projet (règle existante)
        if not user.is_staff and projet.manager != user.manager:
            if not user.manager or user.manager != projet.manager:
                raise serializers.ValidationError(
                    "Vous n'avez pas accès à ce projet.")

        # Calculer le temps total déjà enregistré pour cet utilisateur à cette date
        total_temps = SaisieTemps.objects.filter(
            user=user, date=date
        ).exclude(id=self.instance.id if self.instance else None).aggregate(
            total=Sum('temps')
        )['total'] or 0  # Si aucune entrée trouvée, total = 0

        # Vérifier que la nouvelle saisie ne dépasse pas 1.0 jour
        if total_temps + new_temps > 1.0:
            raise serializers.ValidationError(
                f"La somme totale du temps ne peut pas dépasser 1 journée pour {date}."
            )

        return data

    def validate_temps(self, value):
        if value not in [0, 0.5, 1]:
            raise serializers.ValidationError(
                "Le temps doit être 0, 0.5 (demi-journée) ou 1 (journée entière)")
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
            raise serializers.ValidationError(
                "Vous ne pouvez pas créer/modifier le compte rendu d'un autre utilisateur")
        return data
