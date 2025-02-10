# Tests du Backend Time Tracking

Ce document décrit les différents tests implémentés dans notre application de suivi du temps.

## Tests des Modèles

### UserModelTests
- **test_user_creation**: Vérifie que les rôles sont correctement assignés lors de la création des utilisateurs (admin, manager, user)
- **test_user_str**: Vérifie que la représentation string d'un utilisateur renvoie bien son username

### ProjetModelTests
- **test_projet_creation**: Vérifie qu'un projet peut être créé avec un manager valide
- **test_projet_str**: Vérifie que la représentation string d'un projet renvoie bien son nom

### SaisieTempsModelTests
- **test_saisie_temps_creation**: Vérifie qu'une saisie de temps peut être créée avec les bonnes valeurs
- **test_saisie_temps_str**: Vérifie que la représentation string d'une saisie de temps inclut l'utilisateur, le projet et la date
- **test_saisie_temps_validation**: Vérifie que les règles de validation sont appliquées (temps doit être 0, 0.5, ou 1)

### CompteRenduModelTests
- **test_compte_rendu_creation**: Vérifie qu'un compte rendu mensuel peut être créé avec le bon statut et total
- **test_compte_rendu_str**: Vérifie que la représentation string inclut l'utilisateur et le mois/année

## Tests API

### Tests d'Authentification et Permissions
- **test_user_login**: Vérifie que l'authentification fonctionne et renvoie les tokens JWT
- **test_unauthorized_access**: Vérifie que l'accès non autorisé est bien bloqué
- **test_user_project_creation_forbidden**: Vérifie qu'un utilisateur normal ne peut pas créer de projet

### Tests de Gestion de Projet
- **test_projet_list**: Vérifie que la liste des projets est accessible avec authentification
- **test_manager_project_creation**: Vérifie qu'un manager peut créer un projet
- **test_project_user_assignment**: Vérifie l'assignation des utilisateurs aux projets

### Tests de Saisie de Temps
- **test_saisie_temps_creation**: Vérifie la création d'une saisie de temps via l'API
- **test_compte_rendu_list**: Vérifie l'accès à la liste des comptes rendus mensuels
- **test_monthly_report_generation**: Vérifie la génération du rapport mensuel en PDF

## Points Clés Testés

1. **Sécurité**:
   - Authentification JWT
   - Permissions basées sur les rôles
   - Protection des endpoints sensibles

2. **Validation des Données**:
   - Validation des saisies de temps
   - Règles métier sur les projets et utilisateurs

3. **Fonctionnalités Métier**:
   - Gestion des projets
   - Saisie du temps
   - Génération des rapports

4. **Intégrité des Données**:
   - Relations entre les modèles
   - Calculs et agrégations
