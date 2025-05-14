# Stage 1: Base Node image
ARG NODE_VERSION=18
FROM node:${NODE_VERSION}-alpine AS base
WORKDIR /app
# Install OS-level dependencies if needed (e.g., for bcrypt, canvas)
# RUN apk add --no-cache python3 make g++

# Stage 2: Install dependencies
FROM base AS deps
COPY package.json package-lock.json* ./
# Use npm install instead of npm ci for more flexibility
RUN npm install
# Explicitly install cookie-parser to ensure it's available
RUN npm install cookie-parser@1.4.6 --save
# Explicitly install compression to ensure it's available
RUN npm install compression@1.7.4 --save
# Explicitly install uuid to ensure it's available
RUN npm install uuid@9.0.1 --save

# Stage 3: Development environment
FROM deps AS dev
ENV NODE_ENV=development
# Copy source code and installed dependencies
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Expose port (ensure this matches the PORT env var and server.js)
EXPOSE 3001
# Use a debugging command instead of nodemon for investigation
CMD ["sh", "-c", "echo 'Debugging Supabase connection...' && node -e \"const { supabase } = require('./config'); console.log('Supabase config:', JSON.stringify(supabase, null, 2));\" && echo 'Starting server...' && npm run dev"]

# Stage 4: Production build (optional, but good practice)
# This stage creates a smaller image without dev dependencies
FROM base AS prod-deps
COPY package.json package-lock.json* ./
RUN npm install --omit=dev
# Ensure cookie-parser is installed in production as well
RUN npm install cookie-parser@1.4.6 --save
# Ensure compression is installed in production as well
RUN npm install compression@1.7.4 --save
# Ensure uuid is installed in production as well
RUN npm install uuid@9.0.1 --save

FROM base AS prod
ENV NODE_ENV=production
COPY --from=prod-deps /app/node_modules ./node_modules
COPY . .
USER node # Run as non-root user for security
EXPOSE 3001
CMD ["node", "server.js"]

# Stage 5: Test environment
FROM deps AS test
ENV NODE_ENV=test
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# Run tests and exit; if tests fail, the build fails
RUN npm run test:backend-coverage 