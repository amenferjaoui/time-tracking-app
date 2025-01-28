FROM python:3.10-slim

# Définir le répertoire de travail dans le conteneur
WORKDIR /app

# Copier le fichier requirements.txt et installer les dépendances
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copier le reste des fichiers du projet
COPY . .

# Exposer le port utilisé par Django
EXPOSE 8000

# Commande par défaut pour démarrer le serveur
CMD ["python", "manage.py", "runserver", "0.0.0.0:8000"]
