# Time Tracking Application

<div align="center">
  <img src="time-tracking-frontend/src/assets/logo.png" width="200" />
</div>


This application is a comprehensive time tracking tool designed to help individuals and teams monitor and manage their work hours effectively. It provides a user-friendly interface for logging time entries, categorizing them under different projects, and generating insightful reports. Built with a Django backend for robust API and data management, and a React frontend for a dynamic and responsive user experience, this application is ideal for freelancers, small businesses, and larger organizations looking to optimize productivity and track project time accurately.

## Project Structure

-   `time-tracking-backend`: Contains the Django backend code.
    -   `api`: Contains the API endpoints.
    -   `back`: Contains the project settings and configuration.
    -   `models.py`: Defines the database models (Project, TimeEntry, User).
    -   `serializers.py`: Defines the serializers for the API.
    -   `views.py`: Defines the API views.
    -   `urls.py`: Defines the API URLs.
-   `time-tracking-frontend`: Contains the React frontend code.
    -   `src`: Contains the source code for the frontend.
    -   `components`: Contains the React components.
    -   `services`: Contains the API service.
    -   `styles`: Contains the CSS styles.
    -   `App.tsx`: Main application component.
    -   `index.tsx`: Entry point for the React application.
    -   `vite.config.ts`: Vite configuration.
-   `docker-compose.yml`: Docker Compose file for running the application.

## Prerequisites

-   Python 3.x
-   Node.js and npm (or yarn)
-   Docker (optional, for running with Docker Compose)

## Backend Setup

1.  Navigate to the `time-tracking-backend` directory:
    ```bash
    cd time-tracking-app/time-tracking-backend
    ```
2.  Create a virtual environment (recommended):
    ```bash
    python -m venv venv
    ```
3.  Activate the virtual environment:
    -   On Windows:
        ```bash
        venv\\Scripts\\activate
        ```
    -   On macOS/Linux:
        ```bash
        source venv/bin/activate
        ```
4.  Install the dependencies:
    ```bash
    pip install -r requirements.txt
    ```
5.  Apply database migrations:
    ```bash
    python manage.py migrate
    ```
6.  Create a superuser (for admin access):
    ```bash
    python manage.py createsuperuser
    ```
7.  Run the development server:
    ```bash
    python manage.py runserver
    ```

## Frontend Setup

1.  Navigate to the `time-tracking-frontend` directory:
    ```bash
    cd time-tracking-app/time-tracking-frontend
    ```
2.  Install the dependencies:
    ```bash
    npm install
    # or
    yarn install
    ```
3.  Run the development server:
    ```bash
    npm run dev
    # or
    yarn dev
    ```

## Running with Docker Compose (Optional)

1.  Make sure you have Docker and Docker Compose installed.
2.  Navigate to the `time-tracking-app` directory:
    ```bash
    cd time-tracking-app
    ```
3.  Run the following command to build and start the containers:
    ```bash
    docker-compose up --build
    ```
4.  Access the application in your browser at `http://localhost:5173` (or the port specified in your frontend's `vite.config.ts`). The backend will be accessible at `http://localhost:8000`.

## API Endpoints

Here's a basic outline of the API endpoints. This section will be expanded with more specific details about each endpoint, including request methods, parameters, and response formats.

### Base URL

`/api/` (This will likely be prefixed by `http://localhost:8000` during local development)

### Authentication

-   `/api/token/`: Obtain JWT token (POST)
-   `/api/token/refresh/`: Refresh JWT token (POST)
- `/api/token/verify/`: Verify JWT Token (POST)

### Users

- `/api/users/` : User list (GET), Create user (POST)
- `/api/users/<int:pk>/`: Retrieve (GET), Update (PUT/PATCH), Delete (DELETE) a specific user.

### Projects

-   `/api/projects/`: Project list (GET), Create project (POST)
-   `/api/projects/<int:pk>/`: Retrieve (GET), Update (PUT/PATCH), Delete (DELETE) a specific project.

### Time Entries

-   `/api/time-entries/`: Time entry list (GET), Create time entry (POST)
-   `/api/time-entries/<int:pk>/`: Retrieve (GET), Update (PUT/PATCH), Delete (DELETE) a specific time entry.

## Contributing

Contributions are welcome! Please follow these guidelines when contributing to the project:

1.  **Fork the repository** and create your branch from `main`.
2.  **Code Style:** Follow the existing code style and conventions. For Python, adhere to PEP 8 standards. For JavaScript/TypeScript, use Prettier and ESLint to maintain code consistency.
3.  **Commit Messages:** Write clear and concise commit messages. Follow conventional commits guidelines.
4.  **Pull Requests:** Submit pull requests to the `main` branch. Ensure your pull request includes:
    -   A clear description of the changes.
    -   Any relevant tests for new features or bug fixes.
    -   Confirmation that all tests pass.

Before submitting a pull request, please ensure your changes are well-tested and adhere to the project's coding standards.

Thank you for contributing!
