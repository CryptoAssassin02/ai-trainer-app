# Docker Development Workflow

This document outlines the standard workflow for using Docker for local development and testing of the trAIner backend.

## Prerequisites

- Docker Desktop installed and running
- `.env` file properly configured (see `.env.example` for required variables)

## Development Workflow

### 1. Initial Build

Build the Docker image for the backend:

```bash
npm run docker:build
```

This only needs to be done once initially or after changing the `Dockerfile`, `docker-compose.yml` or dependencies in `package.json`.

### 2. Starting the Development Server

Start the backend service with hot-reloading:

```bash
npm run docker:up
```

This starts the backend service using the `dev` stage from the Dockerfile. The service will be accessible at http://localhost:3001.

### 3. Viewing Logs

In a separate terminal, you can view the logs of the running container:

```bash
npm run docker:logs
```

### 4. Running Tests

#### Option A: Run tests as part of the build process

This approach builds a new image with the `test` stage and runs the tests during the build:

```bash
npm run docker:test
```

If tests fail, the build will fail, providing immediate feedback.

#### Option B: Run tests in an ephemeral container

This approach executes tests in a new container based on the built image:

```bash
npm run docker:test:run
```

### 5. Accessing the Container Shell

To get a shell inside the running container (for debugging or running commands):

```bash
npm run docker:exec
```

### 6. Stopping the Development Server

To stop the running container:

```bash
# Either press Ctrl+C in the terminal where docker:up is running
# Or in another terminal:
npm run docker:down
```

## Troubleshooting

### Common Issues

1. **Port conflict**: If port 3001 is already in use, edit `docker-compose.yml` to map to a different host port.

2. **Environment variables missing**: Ensure your `.env` file is complete with all required variables.

3. **Volume mounting issues**: On Windows, you may need to adjust the volume paths in `docker-compose.yml`.

### Resetting the Environment

If you encounter persistent issues, try resetting the Docker environment:

```bash
# Remove containers
npm run docker:down

# Rebuild the image
npm run docker:build
```

## Additional Commands

- **Clean rebuild**: `docker compose build --no-cache backend`
- **View all containers**: `docker compose ps`
