# Docker Implementation Guide for Local Backend Development & Testing

This guide provides a step-by-step plan for setting up Docker within the `/backend` directory to create a consistent and reliable environment for local development and testing. This setup is designed to work alongside the existing Vercel deployment strategy, which will remain unaffected.

**Goal:** Achieve environment consistency (Node.js version, dependencies, environment variables) to resolve testing flakiness and streamline development workflows.

## Phase 1: Initial Setup

### Step 1: Create `.dockerignore` File

-   [x] **Action:** Create a file named `.dockerignore` in the `backend/` directory.
-   [x] **Purpose:** To prevent unnecessary files and directories from being copied into the Docker image during the build process. This speeds up builds and reduces image size.
-   [x] **Content:** Add the following patterns to `backend/.dockerignore`:

    ```plaintext
    # Git / Node / OS specific
    .git
    .gitignore
    node_modules
    npm-debug.log*
    yarn-debug.log*
    yarn-error.log*
    .DS_Store
    *.env
    .env.*
    !.env.example

    # Build / Test artifacts
    coverage/
    junit.xml
    tests_archive/
    dist/
    build/

    # Docker specific
    Dockerfile
    docker-compose.yml
    .dockerignore
    DOCKER_IMPLEMENTATION_GUIDE.md

    # Optional: Logs, temporary files, etc.
    logs/
    *.log
    uploads/ # If uploads are temporary/not needed in image
    ```

### Step 2: Create `.env.example` File

-   [x] **Action:** Create a file named `.env.example` in the `backend/` directory.
-   [x] **Purpose:** To document all the environment variables required by the backend application. This serves as a template for developers. Secrets should **not** have their real values here.
-   [x] **Content:** After reviewing `config/`, `server.js`, `services/`, `agents/`, `utils/supabase.js` etc., we've identified all required environment variables. The `.env.example` file now includes:

    ```plaintext
    # Server Configuration
    NODE_ENV=development
    PORT=3001

    # Supabase Credentials
    SUPABASE_URL=your_supabase_url
    SUPABASE_ANON_KEY=your_supabase_anon_key
    SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key

    # Database Configuration (if using direct connection)
    DB_HOST=localhost
    DB_PORT=5432
    DB_USER=postgres
    DB_PASSWORD=your_db_password
    DB_NAME=trainer_db

    # JWT Configuration
    JWT_SECRET=your_jwt_secret
    JWT_REFRESH_SECRET=your_jwt_refresh_secret
    JWT_EXPIRY=24h
    REFRESH_TOKEN_EXPIRY=7d

    # Security Settings
    ENCRYPTION_KEY=your_encryption_key
    CORS_ORIGIN=http://localhost:3000

    # External API Services
    OPENAI_API_KEY=your_openai_api_key
    PERPLEXITY_API_KEY=your_perplexity_api_key

    # Email Notifications
    SMTP_HOST=smtp.example.com
    SMTP_PORT=587
    SMTP_USER=your_smtp_username
    SMTP_PASSWORD=your_smtp_password
    SMTP_FROM=noreply@trainer-app.com

    # Push Notifications
    FIREBASE_API_KEY=your_firebase_api_key
    FIREBASE_PROJECT_ID=your_firebase_project_id

    # Analytics Settings
    ANALYTICS_ENABLED=true
    ANALYTICS_PROVIDER=posthog
    ANALYTICS_API_KEY=your_analytics_api_key

    # Rate Limiting
    RATE_LIMIT_WINDOW_MS=60000
    RATE_LIMIT_MAX_REQUESTS=100
    WORKOUT_GEN_RATE_LIMIT=10

    # SSL Configuration (if needed)
    SSL_ENABLED=false
    SSL_KEY_PATH=path/to/key.pem
    SSL_CERT_PATH=path/to/cert.pem

    # Migration Settings (if applicable)
    MIGRATION_DIRECTORY=./migrations
    ```

### Step 3: Create Local `.env` File

-   [x] **Action:** Create a file named `.env` in the `backend/` directory (or copy `.env.example` to `.env`).
-   [x] **Purpose:** To store the *actual* secret values for your local development environment.
-   [x] **Content:** Populated with real development keys and configurations based on the `.env.example` template.
-   [x] **Security:** **Crucially, ensure `.env` is listed in `backend/.gitignore` (and `.dockerignore`) so it's never committed to version control.** The pattern `*.env` in the suggested `.dockerignore` covers this.

## Phase 2: Docker Configuration

### Step 4: Create `Dockerfile`

-   [x] **Action:** Create a file named `Dockerfile` (no extension) in the `backend/` directory.
-   [x] **Purpose:** To define the steps required to build the Docker image for the backend application. Uses a multi-stage approach for optimization.
-   [x] **Content:** Added multi-stage Dockerfile with the following stages:
    - base: Alpine Node.js image with workspace setup
    - deps: Dependencies installation using package.json
    - dev: Development environment with hot-reloading
    - prod-deps and prod: Production-optimized image without dev dependencies
    - test: Dedicated test environment for running test suite

### Step 5: Create `docker-compose.yml`

-   [x] **Action:** Create a file named `docker-compose.yml` in the `backend/` directory.
-   [x] **Purpose:** To define and manage the backend service container for local development and testing.
-   [x] **Content:** Added configuration with the following features:
    - Development-focused container (using the 'dev' target from Dockerfile)
    - Port mapping from host 3001 to container 3001
    - Environment variable loading from .env file
    - Volume mounting for hot-reloading
    - Node modules isolation to prevent overwriting by host

## Phase 3: Integration & Workflow

### Step 6: Update `package.json` Scripts

-   [x] **Action:** Add helper scripts to `backend/package.json` under the `"scripts"` section.
-   [x] **Purpose:** Provide convenient shortcuts for common Docker operations.
-   [x] **Content:** Added the following scripts:
    ```json
    "docker:build": "docker compose build backend",
    "docker:up": "docker compose up backend",
    "docker:down": "docker compose down",
    "docker:test": "docker compose build --no-cache --progress=plain --target test backend && docker compose run --rm backend echo 'Tests completed in build stage.' || echo 'Tests failed in build stage.'",
    "docker:test:run": "docker compose run --rm backend npm run test",
    "docker:logs": "docker compose logs -f backend",
    "docker:exec": "docker compose exec backend sh"
    ```

### Step 7: Define Testing Procedure

-   [x] **Action:** Document the standard workflow for using Docker locally.
-   [x] **Workflow:**
    1.  **Initial Build:** Run `npm run docker:build` (or `docker compose build backend`). This only needs to be done once initially or after changing `Dockerfile` or dependencies.
    2.  **Start Development Server:** Run `npm run docker:up` (or `docker compose up backend`). This starts the backend service using the `dev` stage with hot-reloading. Access the API via `http://localhost:3001`. View logs with `npm run docker:logs`.
    3.  **Run Tests:**
        *   **Using Build Stage:** Run `npm run docker:test`. This builds the `test` stage image, running tests as part of the build. Check the build output for test results.
        *   **Using Running Container:** While the dev server is running (`docker:up`), open another terminal and run `npm run docker:test:run`. This executes the tests inside a new container based on the built image.
    4.  **Stop Development Server:** Press `Ctrl+C` in the terminal where `docker:up` is running, or run `npm run docker:down` from another terminal.
    5.  **Access Container Shell (for debugging):** While the dev server is running, run `npm run docker:exec` to get a shell inside the container.

### Step 8: Update `README.md`

-   [x] **Action:** Update the main `backend/README.md`.
-   [x] **Purpose:** To inform developers about the new Docker-based local development workflow.
-   [x] **Content:** Added a new section explaining:
    *   Prerequisites (Docker Desktop installed).
    *   How to set up the `.env` file (copy from `.env.example`).
    *   The commands to build the image (`npm run docker:build`).
    *   The command to start the development server (`npm run docker:up`).
    *   The command(s) to run tests (`npm run docker:test` or `npm run docker:test:run`).
    *   How to access the API locally (e.g., `http://localhost:3001`).
    *   Link to the detailed DOCKER_WORKFLOW.md for more information.

## Phase 4: Verification

-   [ ] **Action:** Perform a full workflow test:
    1.  Build the image.
    2.  Start the dev server. Verify it connects to Supabase (check logs for errors) and responds to basic API requests (e.g., a health check endpoint if you have one).
    3.  Make a small code change in `server.js` or a route file and verify `nodemon` restarts the server inside the container (check logs).
    4.  Run the test suite using the chosen Docker command and ensure all tests pass within the container.
    5.  Stop the server.

This detailed guide should provide a clear path to implementing Docker for your local backend environment. 