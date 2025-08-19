### Environment Variables Setup for Supabase with Node.js Backend and Next.js Frontend

To ensure your Next.js frontend and Node.js backend connect to the same Supabase instance (your actual remote Supabase database, not a local Docker one), complete JWT verification, and support E2E testing with Playwright in development/testing, follow these steps based on official Supabase documentation. This setup assumes you're using the Supabase CLI for tasks like linking your project (`supabase link`) and generating types (`supabase gen types`), but connecting to your remote database via the CLI-integrated MCP (which likely refers to Supabase's management tools in Cursor for schema syncing and types). All details are verified against up-to-date Supabase docs as of August 15, 2025.

Supabase handles JWT generation and basic verification internally via its SDKs (e.g., `@supabase/supabase-js` and `@supabase/ssr`), so you don't typically need to manually verify JWTs unless implementing custom logic. The SDK uses the provided keys to authenticate requests and validate sessions. For the same instance connection, both frontend and backend must use identical `SUPABASE_URL` and `SUPABASE_ANON_KEY` values. JWT consistency is ensured by Supabase's remote service (no local `JWT_SECRET` needed for remote DBs; it's managed in the dashboard).

#### Step 1: Retrieve Your Supabase Project Credentials from the Dashboard
- Log in to your Supabase dashboard at https://supabase.com/dashboard.
- Navigate to **Settings > API** (or directly: https://supabase.com/dashboard/project/[your-project-ref]/settings/api).
- Copy the following:
  - **Project URL** (e.g., `https://your-project-ref.supabase.co`): This is your `SUPABASE_URL`.
  - **anon public** key: This is your `SUPABASE_ANON_KEY` (safe for client-side use; respects Row Level Security/RLS).
  - **service_role secret** key: This is your `SUPABASE_SERVICE_ROLE_KEY` (admin key; bypasses RLS—keep it server-side only, never expose to frontend).
- These keys are used for all environments. For JWT-related auth, Supabase generates and verifies tokens server-side using these; the SDK handles client-side session management.
- **Note on JWT_SECRET**: For remote Supabase instances, you don't set or manage `JWT_SECRET` in your env vars—it's configured in the dashboard under **Authentication > Settings > JWT Settings**. Supabase uses this secret internally to sign JWTs. If you need custom verification (e.g., in a Node.js middleware), export the public key from the dashboard and use a library like `jsonwebtoken` to verify tokens. However, for standard SDK usage, this isn't required as `supabase.auth.getUser()` verifies implicitly.

#### Step 2: Frontend Setup (Next.js)
- Create or update a `.env.local` file in your Next.js project root (this file is git-ignored by default for security).
- Add the following variables (replace with your dashboard values):
  ```
  NEXT_PUBLIC_SUPABASE_URL=https://your-project-ref.supabase.co
  NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ... (your anon key)
  ```
- **Why these?** Next.js exposes vars prefixed with `NEXT_PUBLIC_` to the browser/client-side code. The SDK (`@supabase/supabase-js` or `@supabase/ssr`) uses them to initialize the client and handle JWT-based auth (e.g., signIn, getUser). This ensures connection to your remote instance and automatic JWT verification via the SDK.
- In your code (e.g., `utils/supabase/client.ts`):
  ```ts
  import { createClient } from '@supabase/supabase-js';

  export const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  ```
- Restart your dev server (`npm run dev`) to load changes. This setup supports JWT flows like email confirmation and session refresh.

#### Step 3: Backend Setup (Node.js)
- Create or update a `.env` file in your Node.js backend root (add to `.gitignore`).
- Add the following (use the same URL and anon key as frontend for consistency; add service role for admin tasks):
  ```
  SUPABASE_URL=https://your-project-ref.supabase.co
  SUPABASE_ANON_KEY=eyJ... (your anon key)
  SUPABASE_SERVICE_ROLE_KEY=eyJ... (your service role key)
  ```
- **Why these?** The backend uses the SDK to connect to the same remote instance. `SUPABASE_ANON_KEY` for public operations (with RLS), `SUPABASE_SERVICE_ROLE_KEY` for privileged actions (e.g., user creation in tests). JWT verification happens via SDK methods like `supabase.auth.admin.getUserById()`.
- Install `dotenv` (`npm install dotenv`) and load in your entry file (e.g., `server.js`):
  ```js
  require('dotenv').config();
  const { createClient } = require('@supabase/supabase-js');

  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_ANON_KEY // or SERVICE_ROLE_KEY for admin
  );
  ```
- For JWT verification in custom routes, use the SDK or manually with `jsonwebtoken` and the dashboard's public key.

#### Step 4: E2E Testing Setup with Playwright
- Supabase doesn't have a dedicated Playwright integration doc (tool returned nothing for that URL), but general testing guidance applies: Use the same env vars as dev, and tools like Supawright for auth fixtures.
- In your Playwright config (`playwright.config.ts`), load env vars:
  ```ts
  import { defineConfig } from '@playwright/test';
  import dotenv from 'dotenv';

  dotenv.config();

  export default defineConfig({
    // ... other config
    env: {
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
      SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },
  });
  ```
- For JWT/auth in tests: Use Supawright (install: `npm i -D @supawright/playwright`) to create test users and sessions automatically. It uses `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` to connect and handle JWT creation/verification.
- Example test fixture:
  ```ts
  import { test as base } from '@playwright/test';
  import { supawright } from '@supawright/playwright';

  const test = base.extend({
    context: supawright({ /* options */ }),
  });
  ```
- Run tests: `npx playwright test`. This ensures tests connect to your remote DB, perform auth (JWT flows), and verify without mismatches.

#### Additional Notes
- **Security**: Never commit `.env` files. Use Supabase CLI to link (`supabase link --project-ref your-ref`) and pull schema (`supabase db pull`) for consistency with MCP in Cursor.
- **Troubleshooting**: If JWT verification fails (e.g., invalid signature), confirm keys match dashboard values. For remote DB in tests, enable RLS and test with real users.
- Test locally first, then in CI (e.g., GitHub Actions) with secure env vars.