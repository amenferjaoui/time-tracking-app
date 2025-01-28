# Time Tracking App

This repository orchestrates the Time Tracking application's frontend and backend services using Docker Compose.

## Structure

- Frontend service (React + Vite) runs on port 5173
- Backend service (Django) runs on port 8000
- PostgreSQL database

## Getting Started

1. Clone all repositories:
```bash
git clone <this-repo-url>
git clone <frontend-repo-url>
git clone <backend-repo-url>
```

2. Ensure all repositories are in the same parent directory:
```
parent-directory/
  ├── time-tracking-app/
  ├── time-tracking-frontend/
  └── time-tracking-backend/
```

3. Start all services:
```bash
docker compose up
```

## Automatic Docker Builds

This repository includes GitHub Actions workflows that automatically build Docker images when changes are pushed to the main branch. The images are stored in GitHub Container Registry (ghcr.io).

To use the pre-built images:

1. Authenticate with GitHub Container Registry:
```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

2. Pull the images:
```bash
docker pull ghcr.io/[username]/time-tracking-app/frontend:latest
docker pull ghcr.io/[username]/time-tracking-app/backend:latest
```

## Development

- Frontend code changes in `time-tracking-frontend/` will automatically reload in the browser
- Backend code changes in `time-tracking-backend/` will automatically reload the Django server
- Database data is persisted in a Docker volume
