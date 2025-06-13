# Auth Flow Refactoring Plan

**Overall Goal:** Transition to primarily leveraging Supabase's native authentication mechanisms for token generation, refresh, and session invalidation. Consolidate all core authentication business logic into `backend/controllers/auth.js` and ensure routes in `backend/routes/auth.js` correctly map to it. Middleware will be used for cross-cutting concerns like JWT verification and authorization.

---

## Phase 1: Preparation & Configuration

1.  [x] **Backup Critical Files:** Before starting, ensure you have backups or version control commits for:
    *   `backend/controllers/auth.js`
    *   `backend/controllers/auth.controller.js`
    *   `backend/routes/auth.js`
    *   `backend/middleware/auth.js`
    *   `backend/utils/jwt.js` (or any file named `jwtUtils.js`)
2.  [x] **Modify `backend/config/supabase.js` for Integration Test Client:**
    *   **Goal:** Ensure `createSupabaseClient` in `backend/config/supabase.js` initializes a *real* Supabase client (connecting to local Docker Supabase via `.env.test` variables) when `NODE_ENV=test` and a new environment variable `USE_MOCK_SUPABASE` is *not* set to `true`.
    *   If `NODE_ENV=test` AND `USE_MOCK_SUPABASE=true`, it should proceed with trying to load mocks (for unit tests).
    *   **Action:** Implement the conditional logic using `process.env.USE_MOCK_SUPABASE` within the `createSupabaseClient` function. (Completed)
3.  [x] **Verify Supabase Client Initialization (Post-Modification):**
    *   Confirm that `backend/services/supabase.js` (using the modified `backend/config/supabase.js`) correctly initializes and exports the Supabase JavaScript client. It should provide access to `supabase.auth` and `supabase.from()` for integration tests when `USE_MOCK_SUPABASE` is not true. (Verified - `services/supabase.js` calls `config/supabase.js` which now has the conditional logic. Env vars in `.env.test` are assumed correct for local Supabase connection).
    *   Ensure necessary environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, and `SUPABASE_SERVICE_ROLE_KEY` if admin actions are needed) are correctly configured in all relevant `.env` files (e.g., `.env`, `.env.development`, `.env.test`). (User confirmed env vars are set).

---

## Phase 2: Refactor JWT Utilities (`backend/utils/jwt.js` or equivalent)

**Goal:** Remove custom JWT generation, verification, and blacklisting logic that duplicates or conflicts with Supabase's native capabilities.

1.  [x] **Identify and Remove Custom Token Functions:**
    *   [x] `generateToken` (custom access token generation)
    *   [x] `generateRefreshToken` (custom refresh token generation, especially if it involves a separate database table)
    *   [x] `verifyRefreshToken` (custom logic that validates against a custom store or uses a different secret than Supabase's refresh token mechanism)
    *   [x] `isTokenBlacklisted` (and any associated database tables or stores for JTI blacklisting)
    *   [x] `blacklistToken`
    *   [x] `revokeRefreshToken` (custom logic for invalidating tokens in a custom store)
    *   [x] Any other helper functions exclusively built for the custom JWT/blacklist/custom refresh token system.
    *   **Action:** Comment out or delete these functions. (Completed - Functions commented out in `backend/utils/jwt.js`, `backend/utils/jwt-verification.js`, `backend/utils/auth-utils.js`)
2.  [x] **Evaluate Remaining Utility Functions:**
    *   [x] `verifyToken(token)`: If this function was designed to verify your *custom* JWTs, it will likely be removed. Server-side verification of Supabase-issued JWTs will be handled by `supabase.auth.getUser(token)` in the `authenticate` middleware. (Completed - Custom `verifyToken` instances commented out).
    *   [x] `decodeToken(token)`: A generic function that decodes any JWT payload without signature verification might still be useful for debugging. Assess its necessity. (Completed - Retained in `backend/utils/jwt.js`).
    *   [x] `extractTokenFromHeader(token)`: Generic helper. (Completed - Retained one instance in `backend/utils/jwt.js`, duplicate in `auth-utils.js` commented out).
    *   [x] `parseExpiry(expiryString)`: Generic helper. (Completed - Retained in `backend/utils/jwt.js`).
    *   **Action:** Remove functions if their sole purpose was supporting the now-removed custom token system. (Completed)

---

## Phase 3: Unify and Refactor Controller (`backend/controllers/auth.js`)

**Goal:** Establish `backend/controllers/auth.js` as the single, authoritative controller for all authentication-related business logic, ensuring it uses Supabase's native authentication methods.

1.  [x] **Standardize Supabase Client Usage:**
    *   Modify `backend/controllers/auth.js` to consistently import and use the shared Supabase client instance (e.g., `const supabase = supabaseService.getSupabaseClient();`). (Completed)
2.  [x] **Refactor `signup` Method:**
    *   Accept `(req, res, next)`.
    *   Logic:
        1.  Extract `email`, `password`, `name` from `req.body`.
        2.  Call `const { data, error: signUpError } = await supabase.auth.signUp({ email, password, options: { data: { name: name /* other app_metadata if needed */ } } });`.
        3.  Handle `signUpError` appropriately (e.g., if `signUpError.message` includes "User already registered", return 409; otherwise, consider a 500 or a more specific error).
        4.  If successful, `data.user` provides the user object. `data.session` (if present, depending on email confirmation settings) contains `access_token`, `refresh_token`.
        5.  Create a corresponding profile in your `public.profiles` table using `data.user.id`, `email`, and `name`.
        6.  Respond with status 201: `{ status: 'success', message: 'Account created', userId: data.user.id, accessToken: data.session?.access_token, refreshToken: data.session?.refresh_token }`. (Note: `accessToken` and `refreshToken` will be Supabase's). (Completed)
3.  [x] **Refactor `login` Method:**
    *   Accept `(req, res, next)`.
    *   Logic:
        1.  Extract `email`, `password` from `req.body`.
        2.  Call `const { data, error: signInError } = await supabase.auth.signInWithPassword({ email, password });`.
        3.  Handle `signInError` (e.g., invalid credentials should result in a 401 error).
        4.  If successful, `data.user` and `data.session` (with `access_token`, `refresh_token`) are available.
        5.  Respond with status 200: `{ status: 'success', message: 'Login successful', userId: data.user.id, jwtToken: data.session.access_token, refreshToken: data.session.refresh_token }`. (Using `jwtToken` key to match existing API if needed, but it holds Supabase's access token).
        6.  Remove any logic related to `rememberMe` affecting custom refresh token storage, as Supabase handles its refresh token lifecycle. (Completed)
4.  [x] **Refactor `refreshToken` Method:**
    *   Accept `(req, res, next)`.
    *   Logic:
        1.  Extract the Supabase `refreshToken` from `req.body.refreshToken`.
        2.  Call `const { data, error: refreshError } = await supabase.auth.refreshSession({ refresh_token: extractedRefreshToken });`. (If `refreshSession` is not directly available or preferred, use `await supabase.auth.setSession({ access_token: 'any_valid_or_expired_user_token_if_required_by_setSession', refresh_token: extractedRefreshToken });` followed by `const { data, error } = await supabase.auth.getSession();`).
        3.  Handle `refreshError` (e.g., invalid or expired refresh token should result in a 401 error).
        4.  If successful, `data.session` will contain the new `access_token` and potentially an updated `refresh_token` (Supabase may rotate refresh tokens).
        5.  Respond with status 200: `{ status: 'success', message: 'Token refreshed successfully', jwtToken: data.session.access_token, refreshToken: data.session.refresh_token }`.
        6.  Remove any validation against a custom `public.refresh_tokens` table. (Completed)
5.  [x] **Refactor `logout` Method:**
    *   Accept `(req, res, next)`. This method will be called *after* the `authenticate` middleware, making `req.user` (populated from a valid Supabase access token) available.
    *   Logic:
        1.  Extract the raw Supabase access token that the client sent: `const token = req.headers.authorization?.split(' ')[1];`.
        2.  If no token, this state should ideally be caught by `authenticate` middleware first. If it reaches here, log an anomaly.
        3.  Call `const { error: signOutError } = await supabaseAdmin.auth.admin.signOut(req.user.id);` (using an admin client for robust session invalidation across all user sessions).
        4.  Handle `signOutError` (though typically, `signOut` is robust).
        5.  Respond with status 200: `{ status: 'success', message: 'Logout successful' }`.
        6.  Remove any logic dealing with a custom `public.refresh_tokens` table or JTI blacklisting for access tokens. (Completed)
6.  [x] **Implement/Verify `validateSession` Method:**
    *   Accept `(req, res, next)`. Called *after* `authenticate` middleware.
    *   Logic: Since `authenticate` will have already validated the token and populated `req.user`, this method can simply confirm success.
    *   `return res.status(200).json({ status: 'success', message: 'Token is valid', user: { id: req.user.id, email: req.user.email, role: req.user.role /* any other relevant, non-sensitive fields from req.user */ } });` (Completed)
7.  [x] **Migrate and Refactor `getCurrentUser` from `backend/controllers/auth.controller.js`:**
    *   Ensure this method is present in the unified `backend/controllers/auth.js`.
    *   Accept `(req, res, next)`. Called *after* `authenticate` middleware.
    *   Logic:
        1.  `const userId = req.user.id;` (This ID comes from the Supabase JWT, decoded by `authenticate`).
        2.  `const { data: profileData, error: profileError } = await supabase.from('profiles').select(/* specified fields */).eq('id', userId).single();`
        3.  Handle `profileError` or if `profileData` is not found (e.g., return 404).
        4.  Respond with status 200 and the `profileData`. (Completed)
8.  [x] **Migrate and Refactor `updatePassword` from `backend/controllers/auth.controller.js`:**
    *   Ensure this method is present in the unified `backend/controllers/auth.js`.
    *   Accept `(req, res, next)`. Called *after* `authenticate` middleware.
    *   Logic:
        1.  Extract `newPassword` from `req.body`. (The need for `currentPassword` is removed if relying on the authenticated session to authorize a password update).
        2.  Call `const { data, error: updateError } = await supabase.auth.updateUser({ password: newPassword });`. (This updates the password for the currently authenticated user whose session is active in the `supabase` client instance, typically established via the access token passed to `supabase.auth.getUser()` in middleware).
        3.  Handle `updateError`.
        4.  Respond with status 200: `{ status: 'success', message: 'Password updated successfully' }`. (Completed)
9.  [x] **Delete `backend/controllers/auth.controller.js`:**
    *   After verifying that all its essential functionalities have been correctly migrated to and are working within the unified `backend/controllers/auth.js`. (Completed)

---

## Phase 4: Refactor Middleware (`backend/middleware/auth.js`)

**Goal:** Streamline authentication middleware to focus on verifying Supabase-issued JWTs and performing authorization, removing redundant business logic.

1.  [x] **Refactor `authenticate` Function (Primary JWT Verification Middleware):**
    *   Logic:
        1.  Extract the Bearer token from `req.headers.authorization`.
        2.  If no token or format is incorrect, respond with 401.
        3.  Verify the token and fetch user data using Supabase: `const { data: { user: supabaseUser }, error: authError } = await supabase.auth.getUser(token);` (where `supabase` is the shared Supabase client instance).
        4.  If `authError` occurs or `supabaseUser` is null (e.g., token invalid, expired, or user not found), respond with 401. Log the specific `authError` for debugging (e.g., if it indicates an expired token, the client might attempt a refresh).
        5.  If successful, populate `req.user` with essential, non-sensitive user details from `supabaseUser` (e.g., `req.user = { id: supabaseUser.id, email: supabaseUser.email, role: supabaseUser.role, ...supabaseUser.app_metadata };`).
        6.  Call `next()`.
    *   **Action:** Remove all logic related to JTI (JWT ID) blacklisting (e.g., `isTokenBlacklisted`, setting `req.tokenJti`). Supabase's `signOut` and session management handle token invalidation.
2.  [x] **Remove `logout` Function from this Middleware File:**
    *   The business logic for logout is now consolidated in `authController.logout`. The route will call `authenticate` (this middleware) then `authController.logout`.
    *   **Action:** Delete the `logout` function from `backend/middleware/auth.js`.
3.  [x] **Remove `refreshToken` Function from this Middleware File:**
    *   The business logic for token refresh is now consolidated in `authController.refreshToken`.
    *   **Action:** Delete the `refreshToken` function from `backend/middleware/auth.js`.
4.  [x] **Retain and Verify Authorization Middleware:**
    *   Functions like `requireRole(roles)`, `requireAdmin`, `requireOwnership(getResourceOwnerId)`, and `optionalAuth` should be retained.
    *   **Action:** Verify they correctly use `req.user.role` or `req.user.id` as populated by the refactored `authenticate` middleware (which now gets these details from a Supabase JWT).

---

## Phase 5: Refactor Routes (`backend/routes/auth.js`)

**Goal:** Ensure all authentication routes correctly and consistently map to the unified `authController` methods and use the refactored `authenticate` middleware.

1.  [x] **Update Controller and Middleware Imports:**
    *   `const authController = require('../controllers/auth.js'); // Path to the unified and refactored controller`
    *   `const { authenticate } = require('../middleware/auth.js'); // Path to the refactored authenticate middleware`
    *   Import any necessary validation middleware (e.g., from `../middleware/validation.js`) or rate-limiting middleware.
2.  [x] **Update All Route Definitions:**
    *   `router.post('/signup', /* any validation/rateLimit middleware, */ authController.signup);`
    *   `router.post('/login', /* any validation/rateLimit middleware, */ authController.login);`
    *   `router.post('/refresh', /* any validation/rateLimit middleware, */ authController.refreshToken);`
    *   `router.post('/logout', authenticate, authController.logout);`
    *   `router.get('/me', authenticate, authController.getCurrentUser);` (Or a similar route for fetching authenticated user's profile).
    *   `router.get('/validate-session', authenticate, authController.validateSession);` (This route confirms token validity).
    *   `router.post('/update-password', authenticate, /* any validation middleware for password, */ authController.updatePassword);`
3.  [x] **Verify Route Prefixing in `backend/routes/index.js`:**
    *   Confirm that `authRoutes` (this refactored router instance) is correctly mounted under the `/v1` prefix (e.g., `apiRouter.use('/auth', authRoutes); app.use('/v1', apiRouter);`).

---

## Phase 6: Database Cleanup (Post-Refactoring and Testing)

**Goal:** Remove obsolete database structures related to the old custom authentication system.

1.  [x] **Schedule Deletion of `public.refresh_tokens` Table:**
    *   After all refactoring is complete AND thoroughly tested (including manual and upcoming integration tests), create and apply a database migration to drop this table.
    *   SQL: `DROP TABLE IF EXISTS public.refresh_tokens;`
2.  [x] **Schedule Deletion of JTI Blacklist Table (if applicable):** (Skipped - No specific table name identified for JTI blacklist)
    *   If the previous custom JTI blacklisting mechanism used a database table, create and apply a migration to drop it as well.
---

## Phase 7: Final Review and Integration Testing Green Light

1.  [x] **Comprehensive Code Review:** Conduct a detailed review of all modified files (`controllers/auth.js`, `middleware/auth.js`, `routes/auth.js`, `utils/jwt.js`) for correctness, consistency, security considerations, and adherence to this refactoring plan.
2.  [x] **Environment Variable Check:** Re-verify that all necessary Supabase environment variables (`SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` if using admin functions) are correctly set up for all environments (development, testing, production).
3.  [ ] **Thorough Manual API Testing:** (Awaiting User Execution and Confirmation)
    *   Use a tool like Postman or Insomnia to manually test every authentication endpoint:
        *   Signup (success, existing user)
        *   Login (success, invalid credentials)
        *   Refresh token (success, invalid/expired refresh token)
        *   Access protected routes (`/me`, `/validate-session`) with valid and invalid/expired access tokens.
        *   Logout
        *   Update password
    *   Monitor backend logs for any errors or unexpected behavior.
4.  [ ] **Proceed with Integration Test Implementation:** Once manual testing confirms the refactored authentication flow is working as expected, begin implementing the planned integration tests against this new, cleaner architecture.

---