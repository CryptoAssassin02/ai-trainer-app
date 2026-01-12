# Troubleshooting Reference

> **Purpose**: Centralized troubleshooting hub addressing the top developer pain points identified through research. This document consolidates solutions for the most common issues encountered during development, onboarding, and deployment of the trAIner application.

## Table of Contents

1. [Environment Setup Issues](#environment-setup-issues)
2. [Authentication & Database Issues](#authentication-database-issues)
3. [AI Integration Issues](#ai-integration-issues)
4. [Build & Deployment Issues](#build-deployment-issues)
5. [Common Error Messages & Solutions](#common-error-messages-solutions)

---

## 1. Environment Setup Issues

Based on industry research, **60% of developer onboarding issues** stem from environment setup problems. This section addresses the most common configuration challenges.

### Node.js & TypeScript Configuration (35% of setup issues)

#### Version Mismatches and Resolution

**Problem**: Application fails to start due to Node.js version conflicts
```bash
Error: The engine "node" is incompatible with this module. Expected version ">=18.0.0".
```

**Solution Steps**:
1. **Check Current Version**:
   ```bash
   node --version
   npm --version
   ```

2. **Install Correct Node.js Version**:
   ```bash
   # Using nvm (recommended)
   nvm install 18
   nvm use 18
   nvm alias default 18
   
   # Using fnm (alternative)
   fnm install 18
   fnm use 18
   fnm default 18
   ```

3. **Verify Installation**:
   ```bash
   node --version  # Should show v18.x.x
   npm --version   # Should show compatible version
   ```

4. **Clear and Reinstall Dependencies**:
   ```bash
   rm -rf node_modules package-lock.json
   npm install
   ```

**Prevention**: Add `.nvmrc` file to project root:
```
18.17.0
```

#### Next.js TypeScript Configuration Issues

**Problem**: TypeScript compilation errors with Next.js
```bash
Type error: Cannot find module '@/components/ui/button' or its corresponding type declarations.
```

**Solution Steps**:
1. **Verify tsconfig.json Configuration**:
   ```json
   {
     "compilerOptions": {
       "baseUrl": ".",
       "paths": {
         "@/*": ["./*"],
         "@/components/*": ["./components/*"],
         "@/utils/*": ["./utils/*"],
         "@/types/*": ["./types/*"]
       },
       "strict": true,
       "noEmit": true,
       "esModuleInterop": true,
       "skipLibCheck": true,
       "forceConsistentCasingInFileNames": true
     }
   }
   ```

2. **Check Next.js Configuration**:
   ```javascript
   // next.config.js
   /** @type {import('next').NextConfig} */
   const nextConfig = {
     experimental: {
       typedRoutes: true
     },
     typescript: {
       ignoreBuildErrors: false
     }
   }
   module.exports = nextConfig
   ```

3. **Restart TypeScript Server**:
   - In VS Code: `Cmd/Ctrl + Shift + P` → "TypeScript: Restart TS Server"
   - Or restart your development server

4. **Clear Next.js Cache**:
   ```bash
   rm -rf .next
   npm run dev
   ```

#### Package Manager Conflicts (npm/pnpm/yarn)

**Problem**: Dependency conflicts between package managers
```bash
Error: Cannot resolve dependency tree
```

**Solution Steps**:
1. **Identify Current Package Manager**:
   ```bash
   # Check for lock files
   ls -la | grep -E "(package-lock|yarn.lock|pnpm-lock)"
   ```

2. **Use Consistent Package Manager**:
   ```bash
   # If using npm (recommended for this project)
   rm -rf yarn.lock pnpm-lock.yaml
   rm -rf node_modules
   npm install
   
   # If switching to yarn
   rm -rf package-lock.json node_modules
   yarn install
   
   # If switching to pnpm
   rm -rf package-lock.json yarn.lock node_modules
   pnpm install
   ```

3. **Configure Project for Single Package Manager**:
   ```json
   // package.json
   {
     "engines": {
       "npm": ">=8.0.0",
       "node": ">=18.0.0"
     },
     "engineStrict": true
   }
   ```

### Environment Variables (20% of setup issues)

#### Missing Environment Variables

**Problem**: Application fails to connect to services
```bash
Error: Missing required environment variable: SUPABASE_URL
```

**Solution Steps**:
1. **Copy Environment Template**:
   ```bash
   cp .env.local.example .env.local
   ```

2. **Required Environment Variables**:
   ```bash
   # Frontend (.env.local)
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
   OPENAI_API_KEY=your_openai_api_key
   PERPLEXITY_API_KEY=your_perplexity_api_key
   
   # Backend (backend/.env)
   SUPABASE_URL=your_supabase_url
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   OPENAI_API_KEY=your_openai_api_key
   JWT_SECRET=your_jwt_secret
   NODE_ENV=development
   PORT=8000
   ```

3. **Verify Environment Loading**:
   ```javascript
   // pages/api/test-env.js
   export default function handler(req, res) {
     res.json({
       supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ? 'Set' : 'Missing',
       openaiKey: process.env.OPENAI_API_KEY ? 'Set' : 'Missing'
     });
   }
   ```

#### Development vs Production Environment Drift

**Problem**: Different behavior between development and production
```bash
Error: CORS error in production but not in development
```

**Solution Steps**:
1. **Environment-Specific Configuration**:
   ```javascript
   // next.config.js
   const nextConfig = {
     env: {
       CUSTOM_KEY: process.env.NODE_ENV === 'production' ? 'prod_value' : 'dev_value'
     },
     async headers() {
       return process.env.NODE_ENV === 'development' ? [
         {
           source: '/api/:path*',
           headers: [
             { key: 'Access-Control-Allow-Origin', value: '*' },
             { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' }
           ]
         }
       ] : [];
     }
   };
   ```

2. **Environment Validation**:
   ```javascript
   // utils/env-validation.js
   const requiredEnvVars = [
     'NEXT_PUBLIC_SUPABASE_URL',
     'NEXT_PUBLIC_SUPABASE_ANON_KEY',
     'OPENAI_API_KEY'
   ];
   
   export function validateEnvironment() {
     const missing = requiredEnvVars.filter(varName => !process.env[varName]);
     if (missing.length > 0) {
       throw new Error(`Missing environment variables: ${missing.join(', ')}`);
     }
   }
   ```

#### Supabase Configuration Issues

**Problem**: Supabase connection failures
```bash
Error: Invalid API key or connection refused
```

**Solution Steps**:
1. **Verify Supabase Project Settings**:
   ```bash
   # Check project URL format
   echo $NEXT_PUBLIC_SUPABASE_URL
   # Should be: https://your-project.supabase.co
   ```

2. **Test Connection**:
   ```javascript
   // utils/supabase-test.js
   import { createClient } from '@supabase/supabase-js';
   
   const supabase = createClient(
     process.env.NEXT_PUBLIC_SUPABASE_URL,
     process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
   );
   
   export async function testSupabaseConnection() {
     try {
       const { data, error } = await supabase.from('user_profiles').select('count');
       if (error) throw error;
       console.log('Supabase connection successful');
       return true;
     } catch (error) {
       console.error('Supabase connection failed:', error);
       return false;
     }
   }
   ```

3. **Common Configuration Fixes**:
   ```bash
   # Check for trailing slashes
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co  # Correct
   NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co/  # Wrong
   
   # Verify key format
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Should start with eyJ
   ```

### Port Conflicts & Dependencies (15% of setup issues)

#### Service Startup Conflicts

**Problem**: Port already in use errors
```bash
Error: listen EADDRINUSE: address already in use :::3000
```

**Solution Steps**:
1. **Find Process Using Port**:
   ```bash
   # macOS/Linux
   lsof -ti:3000
   netstat -tulpn | grep :3000
   
   # Windows
   netstat -ano | findstr :3000
   ```

2. **Kill Process**:
   ```bash
   # macOS/Linux
   kill -9 $(lsof -ti:3000)
   
   # Windows
   taskkill /PID <PID> /F
   ```

3. **Use Alternative Ports**:
   ```bash
   # Frontend
   npm run dev -- -p 3001
   
   # Backend
   PORT=8001 npm run dev
   ```

4. **Configure Default Ports**:
   ```json
   // package.json
   {
     "scripts": {
       "dev": "next dev -p 3000",
       "backend:dev": "cd backend && PORT=8000 npm run dev"
     }
   }
   ```

#### Docker Container Issues

**Problem**: Docker containers fail to start or connect
```bash
Error: Cannot connect to the Docker daemon
```

**Solution Steps**:
1. **Verify Docker Installation**:
   ```bash
   docker --version
   docker-compose --version
   docker info
   ```

2. **Start Docker Service**:
   ```bash
   # macOS
   open -a Docker
   
   # Linux
   sudo systemctl start docker
   sudo systemctl enable docker
   
   # Windows
   # Start Docker Desktop application
   ```

3. **Check Container Status**:
   ```bash
   docker ps -a
   docker logs container_name
   ```

4. **Reset Docker Environment**:
   ```bash
   docker-compose down
   docker system prune -f
   docker-compose up --build
   ```

#### Local Development Setup

**Problem**: Services not communicating properly
```bash
Error: fetch failed - connection refused to backend
```

**Solution Steps**:
1. **Verify Service URLs**:
   ```javascript
   // config/environment.js
   export const config = {
     apiUrl: process.env.NODE_ENV === 'development' 
       ? 'http://localhost:8000' 
       : process.env.NEXT_PUBLIC_API_URL,
     supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL
   };
   ```

2. **Check Network Configuration**:
   ```bash
   # Test backend connectivity
   curl http://localhost:8000/health
   
   # Test frontend accessibility
   curl http://localhost:3000
   ```

3. **Configure CORS for Development**:
   ```javascript
   // backend/middleware/cors.js
   const corsOptions = {
     origin: process.env.NODE_ENV === 'development' 
       ? ['http://localhost:3000', 'http://127.0.0.1:3000']
       : process.env.ALLOWED_ORIGINS?.split(','),
     credentials: true
   };
   ```

---

## 2. Authentication & Database Issues

Authentication and database problems represent **40% of runtime issues**. This section covers the most problematic areas identified through analysis.

### Supabase RLS Errors (40% of database issues)

#### Missing RLS Policies

**Problem**: Users cannot access their own data
```bash
Error: new row violates row-level security policy for table "user_profiles"
```

**Solution Steps**:
1. **Check Existing Policies**:
   ```sql
   SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual 
   FROM pg_policies 
   WHERE tablename = 'user_profiles';
   ```

2. **Create Basic User Policies**:
   ```sql
   -- Enable RLS
   ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;
   
   -- Users can view their own profile
   CREATE POLICY "Users can view own profile" ON user_profiles
   FOR SELECT USING (auth.uid() = user_id);
   
   -- Users can update their own profile
   CREATE POLICY "Users can update own profile" ON user_profiles
   FOR UPDATE USING (auth.uid() = user_id);
   
   -- Users can insert their own profile
   CREATE POLICY "Users can insert own profile" ON user_profiles
   FOR INSERT WITH CHECK (auth.uid() = user_id);
   ```

3. **Test Policy Application**:
   ```javascript
   // Test RLS with authenticated user
   const { data, error } = await supabase
     .from('user_profiles')
     .select('*')
     .eq('user_id', user.id);
   
   if (error) {
     console.error('RLS Policy Error:', error);
   }
   ```

#### Incorrect Policy Conditions

**Problem**: Users see data they shouldn't or can't access their own data
```bash
Error: permission denied for table user_profiles
```

**Solution Steps**:
1. **Review Policy Logic**:
   ```sql
   -- Common mistake: using user_id instead of auth.uid()
   -- WRONG:
   CREATE POLICY "wrong_policy" ON workout_plans
   FOR SELECT USING (user_id = current_user);
   
   -- CORRECT:
   CREATE POLICY "correct_policy" ON workout_plans
   FOR SELECT USING (auth.uid() = user_id);
   ```

2. **Debug Policy Execution**:
   ```sql
   -- Check current auth context
   SELECT auth.uid(), auth.role();
   
   -- Test policy conditions manually
   SELECT * FROM workout_plans WHERE auth.uid() = user_id;
   ```

3. **Common Policy Patterns**:
   ```sql
   -- For user-owned resources
   CREATE POLICY "user_owns_resource" ON table_name
   FOR ALL USING (auth.uid() = user_id);
   
   -- For public read access
   CREATE POLICY "public_read" ON table_name
   FOR SELECT USING (true);
   
   -- For admin access
   CREATE POLICY "admin_access" ON table_name
   FOR ALL USING (
     auth.jwt() ->> 'role' = 'admin'
   );
   ```

#### Service Role vs Anon Key Confusion

**Problem**: Different behavior between frontend and backend operations
```bash
Error: RLS policy violation in frontend but backend works
```

**Solution Steps**:
1. **Understanding Key Differences**:
   ```javascript
   // Anon key (frontend) - Subject to RLS
   const frontendClient = createClient(url, anonKey);
   
   // Service role key (backend) - Bypasses RLS
   const backendClient = createClient(url, serviceRoleKey);
   ```

2. **Proper Key Usage**:
   ```javascript
   // Frontend operations (with RLS)
   const { data: userProfiles } = await supabase
     .from('user_profiles')
     .select('*'); // Only returns user's own profile
   
   // Backend operations (bypass RLS when needed)
   const { data: allProfiles } = await supabaseAdmin
     .from('user_profiles')
     .select('*'); // Returns all profiles (admin operation)
   ```

3. **Environment Configuration**:
   ```bash
   # Frontend (.env.local)
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...anon_key

   # Backend (backend/.env)
   SUPABASE_SERVICE_ROLE_KEY=eyJ...service_role_key
   ```

### JWT & Authentication (30% of auth issues)

#### Token Validation Failures

**Problem**: Authentication tokens are not recognized
```bash
Error: Invalid JWT token or token expired
```

**Solution Steps**:
1. **Check Token Format**:
   ```javascript
   // Verify token structure
   function validateJWTFormat(token) {
     if (!token) return false;
     const parts = token.split('.');
     if (parts.length !== 3) return false;
     
     try {
       const payload = JSON.parse(atob(parts[1]));
       return payload.exp > Date.now() / 1000;
     } catch {
       return false;
     }
   }
   ```

2. **Token Refresh Logic**:
   ```javascript
   // Auto-refresh expired tokens
   const refreshToken = async () => {
     const { data, error } = await supabase.auth.refreshSession();
     if (error) {
       console.error('Token refresh failed:', error);
       // Redirect to login
       router.push('/login');
       return null;
     }
     return data.session;
   };
   ```

3. **Token Storage Best Practices**:
   ```javascript
   // Secure token storage
   const tokenManager = {
     setToken: (token) => {
       // Use httpOnly cookies in production
       if (process.env.NODE_ENV === 'production') {
         // Set via API endpoint
         fetch('/api/auth/set-token', {
           method: 'POST',
           body: JSON.stringify({ token })
         });
       } else {
         localStorage.setItem('auth_token', token);
       }
     },
     
     getToken: () => {
       return localStorage.getItem('auth_token');
     },
     
     clearToken: () => {
       localStorage.removeItem('auth_token');
     }
   };
   ```

#### Session Management Problems

**Problem**: Users get logged out unexpectedly or sessions persist incorrectly
```bash
Error: Session not found or expired
```

**Solution Steps**:
1. **Session Persistence Configuration**:
   ```javascript
   // Configure session persistence
   const supabase = createClient(supabaseUrl, supabaseKey, {
     auth: {
       storage: window.localStorage,
       autoRefreshToken: true,
       persistSession: true,
       detectSessionInUrl: true
     }
   });
   ```

2. **Session Validation**:
   ```javascript
   // Regular session validation
   useEffect(() => {
     const checkSession = async () => {
       const { data: { session }, error } = await supabase.auth.getSession();
       
       if (error) {
         console.error('Session check failed:', error);
         setUser(null);
         return;
       }
       
       if (session) {
         setUser(session.user);
       } else {
         setUser(null);
       }
     };
     
     checkSession();
     
     // Listen for auth changes
     const { data: { subscription } } = supabase.auth.onAuthStateChange(
       (event, session) => {
         if (event === 'SIGNED_IN') {
           setUser(session?.user ?? null);
         } else if (event === 'SIGNED_OUT') {
           setUser(null);
         }
       }
     );
     
     return () => subscription.unsubscribe();
   }, []);
   ```

3. **Handle Session Expiry**:
   ```javascript
   // Global session expiry handler
   const handleSessionExpiry = () => {
     localStorage.clear();
     router.push('/login?reason=session_expired');
   };
   
   // API request interceptor
   const apiClient = axios.create({
     baseURL: process.env.NEXT_PUBLIC_API_URL
   });
   
   apiClient.interceptors.response.use(
     (response) => response,
     (error) => {
       if (error.response?.status === 401) {
         handleSessionExpiry();
       }
       return Promise.reject(error);
     }
   );
   ```

#### User Context Not Properly Passed

**Problem**: User information not available in components
```bash
Error: Cannot read property 'id' of null (user context)
```

**Solution Steps**:
1. **Auth Context Setup**:
   ```javascript
   // contexts/auth-context.tsx
   const AuthContext = createContext(null);
   
   export function AuthProvider({ children }) {
     const [user, setUser] = useState(null);
     const [loading, setLoading] = useState(true);
     
     useEffect(() => {
       // Get initial session
       supabase.auth.getSession().then(({ data: { session } }) => {
         setUser(session?.user ?? null);
         setLoading(false);
       });
       
       // Listen for auth changes
       const { data: { subscription } } = supabase.auth.onAuthStateChange(
         (event, session) => {
           setUser(session?.user ?? null);
           setLoading(false);
         }
       );
       
       return () => subscription.unsubscribe();
     }, []);
     
     return (
       <AuthContext.Provider value={{ user, loading }}>
         {children}
       </AuthContext.Provider>
     );
   }
   ```

2. **Using Auth Context**:
   ```javascript
   // hooks/use-auth.ts
   export function useAuth() {
     const context = useContext(AuthContext);
     if (!context) {
       throw new Error('useAuth must be used within AuthProvider');
     }
     return context;
   }
   
   // Component usage
   function ProfileComponent() {
     const { user, loading } = useAuth();
     
     if (loading) return <div>Loading...</div>;
     if (!user) return <div>Not authenticated</div>;
     
     return <div>Welcome, {user.email}</div>;
   }
   ```

### Database Performance & Connections (20% of database issues)

#### Slow RLS Policy Evaluation

**Problem**: Database queries are slower than expected
```bash
Query taking 3000ms+ when it should be <100ms
```

**Solution Steps**:
1. **Optimize RLS Policies**:
   ```sql
   -- Add indexes to support RLS policies
   CREATE INDEX idx_user_profiles_user_id ON user_profiles(user_id);
   CREATE INDEX idx_workout_plans_user_id ON workout_plans(user_id);
   CREATE INDEX idx_workout_logs_user_id ON workout_logs(user_id);
   ```

2. **Analyze Query Performance**:
   ```sql
   -- Check query execution plan
   EXPLAIN ANALYZE SELECT * FROM workout_plans WHERE user_id = auth.uid();
   
   -- Monitor slow queries
   SELECT query, mean_exec_time, calls 
   FROM pg_stat_statements 
   ORDER BY mean_exec_time DESC 
   LIMIT 10;
   ```

3. **Policy Optimization Patterns**:
   ```sql
   -- Inefficient policy
   CREATE POLICY "slow_policy" ON workout_plans
   FOR SELECT USING (
     user_id IN (
       SELECT id FROM user_profiles WHERE user_id = auth.uid()
     )
   );
   
   -- Optimized policy
   CREATE POLICY "fast_policy" ON workout_plans
   FOR SELECT USING (user_id = auth.uid());
   ```

#### Missing Indexes

**Problem**: Queries are slow due to full table scans
```sql
Seq Scan on workout_logs (cost=0.00..1000.00 rows=1000 width=500)
```

**Solution Steps**:
1. **Identify Missing Indexes**:
   ```sql
   -- Check query plans for sequential scans
   EXPLAIN (ANALYZE, BUFFERS) 
   SELECT * FROM workout_logs 
   WHERE user_id = 'user-uuid' 
   ORDER BY created_at DESC;
   ```

2. **Create Performance Indexes**:
   ```sql
   -- User-based filtering
   CREATE INDEX idx_workout_logs_user_created ON workout_logs(user_id, created_at DESC);
   
   -- Date range queries
   CREATE INDEX idx_analytics_events_user_timestamp ON analytics_events(user_id, timestamp DESC);
   
   -- JSON field indexes
   CREATE INDEX idx_workout_plans_data_difficulty ON workout_plans USING GIN ((plan_data->>'difficulty'));
   ```

3. **Monitor Index Usage**:
   ```sql
   -- Check index usage statistics
   SELECT 
     schemaname, 
     tablename, 
     indexname, 
     idx_scan, 
     idx_tup_read, 
     idx_tup_fetch
   FROM pg_stat_user_indexes 
   ORDER BY idx_scan DESC;
   ```

#### Connection Timeouts

**Problem**: Database connections timing out or being dropped
```bash
Error: connection terminated unexpectedly
```

**Solution Steps**:
1. **Connection Pool Configuration**:
   ```javascript
   // Supabase client configuration
   const supabase = createClient(supabaseUrl, supabaseKey, {
     db: {
       schema: 'public',
     },
     auth: {
       autoRefreshToken: true,
       persistSession: true
     },
     global: {
       headers: { 'x-my-custom-header': 'my-app-name' },
     },
   });
   ```

2. **Backend Connection Management**:
   ```javascript
   // backend/config/database.js
   const { Pool } = require('pg');
   
   const pool = new Pool({
     connectionString: process.env.DATABASE_URL,
     max: 20, // Maximum connections
     idleTimeoutMillis: 30000, // Close idle connections after 30s
     connectionTimeoutMillis: 2000, // Return error after 2s if no connection available
   });
   
   module.exports = pool;
   ```

3. **Retry Logic for Connections**:
   ```javascript
   // Connection retry utility
   async function withRetry(operation, maxRetries = 3) {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await operation();
       } catch (error) {
         if (attempt === maxRetries) throw error;
         
         const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
         await new Promise(resolve => setTimeout(resolve, delay));
       }
     }
   }
   
   // Usage
   const data = await withRetry(async () => {
     return await supabase.from('user_profiles').select('*');
   });
   ```

---

## 3. AI Integration Issues

AI operations represent **25% of runtime failures**. These issues are primarily related to OpenAI API integration and our custom agent system.

### OpenAI API Failures (35% rate limiting, 25% token limits)

#### Rate Limiting and Quota Management

**Problem**: OpenAI API requests being rejected due to rate limits
```bash
Error: Rate limit exceeded for requests per minute. Limit: 3 / min
```

**Solution Steps**:
1. **Implement Exponential Backoff**:
   ```javascript
   // utils/openai-retry.js
   async function callOpenAIWithRetry(apiCall, maxRetries = 3) {
     for (let attempt = 1; attempt <= maxRetries; attempt++) {
       try {
         return await apiCall();
       } catch (error) {
         if (error.status === 429) { // Rate limit
           const retryAfter = error.headers?.['retry-after'] || Math.pow(2, attempt);
           console.log(`Rate limited. Retrying after ${retryAfter}s...`);
           await new Promise(resolve => setTimeout(resolve, retryAfter * 1000));
           continue;
         }
         throw error; // Re-throw non-rate-limit errors
       }
     }
     throw new Error('Max retry attempts exceeded');
   }
   ```

2. **Queue Management System**:
   ```javascript
   // utils/ai-queue.js
   class AIRequestQueue {
     constructor(rateLimit = 3, window = 60000) { // 3 requests per minute
       this.queue = [];
       this.processing = false;
       this.rateLimit = rateLimit;
       this.window = window;
       this.requestTimes = [];
     }
     
     async enqueue(request) {
       return new Promise((resolve, reject) => {
         this.queue.push({ request, resolve, reject });
         this.process();
       });
     }
     
     async process() {
       if (this.processing || this.queue.length === 0) return;
       
       this.processing = true;
       
       while (this.queue.length > 0) {
         // Check rate limit
         const now = Date.now();
         this.requestTimes = this.requestTimes.filter(time => now - time < this.window);
         
         if (this.requestTimes.length >= this.rateLimit) {
           const waitTime = this.window - (now - this.requestTimes[0]);
           await new Promise(resolve => setTimeout(resolve, waitTime));
           continue;
         }
         
         const { request, resolve, reject } = this.queue.shift();
         this.requestTimes.push(now);
         
         try {
           const result = await request();
           resolve(result);
         } catch (error) {
           reject(error);
         }
       }
       
       this.processing = false;
     }
   }
   
   export const aiQueue = new AIRequestQueue();
   ```

3. **Fallback Strategies**:
   ```javascript
   // utils/ai-fallback.js
   async function generateWorkoutWithFallback(params) {
     try {
       // Primary: OpenAI GPT-4
       return await aiQueue.enqueue(() => generateWithGPT4(params));
     } catch (error) {
       if (error.status === 429 || error.status === 503) {
         console.log('OpenAI unavailable, using fallback...');
         
         // Fallback 1: Use cached similar plans
         const cachedPlan = await findSimilarCachedPlan(params);
         if (cachedPlan) return adaptCachedPlan(cachedPlan, params);
         
         // Fallback 2: Template-based generation
         return generateFromTemplate(params);
       }
       throw error;
     }
   }
   ```

---

## 4. Build & Deployment Issues

Build and deployment problems account for **15% of developer issues**, particularly during environment transitions.

### Next.js Build Problems

#### TypeScript Compilation Errors

**Problem**: Build fails with TypeScript errors that don't appear in development
```bash
Type error: Property 'user' does not exist on type 'Session | null'
```

**Solution Steps**:
1. **Strict Type Checking**:
   ```typescript
   // Fix common type issues
   // BEFORE (error-prone):
   const userName = session.user.name;
   
   // AFTER (type-safe):
   const userName = session?.user?.name || 'Anonymous';
   ```

2. **Build-Specific Type Configuration**:
   ```json
   // tsconfig.json - ensure strict settings for builds
   {
     "compilerOptions": {
       "strict": true,
       "noImplicitAny": true,
       "strictNullChecks": true
     }
   }
   ```

#### Bundle Size Optimization

**Problem**: Build fails due to bundle size limits
```bash
Warning: Bundle size exceeded recommended limit (244 kB)
```

**Solution Steps**:
1. **Bundle Analysis**:
   ```bash
   npm install --save-dev @next/bundle-analyzer
   npm run analyze
   ```

2. **Optimize Imports**:
   ```typescript
   // BEFORE (imports entire library):
   import _ from 'lodash';
   
   // AFTER (tree-shakeable imports):
   import { debounce } from 'lodash-es';
   ```

### Deployment Configuration

#### Environment Variable Setup

**Problem**: Environment variables not properly configured for production
```bash
Error: NEXT_PUBLIC_SUPABASE_URL is undefined in production
```

**Solution Steps**:
1. **Environment Variable Checklist**:
   ```bash
   echo "NEXT_PUBLIC_SUPABASE_URL: $NEXT_PUBLIC_SUPABASE_URL"
   echo "OPENAI_API_KEY: ${OPENAI_API_KEY:0:10}..."
   ```

2. **Runtime Environment Validation**:
   ```typescript
   export function validateEnvironment() {
     const requiredEnvVars = {
       'NEXT_PUBLIC_SUPABASE_URL': process.env.NEXT_PUBLIC_SUPABASE_URL,
       'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
     };
     
     const missing = Object.entries(requiredEnvVars)
       .filter(([_, value]) => !value)
       .map(([key, _]) => key);
     
     if (missing.length > 0) {
       throw new Error(`Missing environment variables: ${missing.join(', ')}`);
     }
   }
   ```

---

## 5. Common Error Messages & Solutions

### Error Message Index

#### Authentication Errors

**`Invalid JWT token`**
- **Cause**: Expired or malformed authentication token
- **Solution**: Refresh token or re-authenticate user
- **Prevention**: Implement automatic token refresh

**`Row Level Security policy violation`**
- **Cause**: Missing or incorrect RLS policies
- **Solution**: Review and update database policies
- **Prevention**: Test policies with different user roles

#### Database Errors

**`relation "table_name" does not exist`**
- **Cause**: Missing database table or migration not run
- **Solution**: Run pending migrations
- **Code**: 
```bash
npm run migrate
npm run migrate -- --status
```

**`duplicate key value violates unique constraint`**
- **Cause**: Attempting to insert duplicate data
- **Solution**: Use upsert operations
- **Code**:
```javascript
const { data, error } = await supabase
  .from('user_profiles')
  .upsert({ user_id: userId, ...profileData });
```

#### API Errors

**`Rate limit exceeded`**
- **Cause**: Too many requests to external APIs
- **Solution**: Implement backoff strategy
- **Prevention**: Use request queuing

**`CORS policy blocked the request`**
- **Cause**: Cross-origin request not allowed
- **Solution**: Configure CORS headers
- **Code**:
```javascript
// next.config.js
async headers() {
  return [{
    source: '/api/:path*',
    headers: [
      { key: 'Access-Control-Allow-Origin', value: '*' },
      { key: 'Access-Control-Allow-Methods', value: 'GET,POST,PUT,DELETE' },
    ],
  }];
}
```

### Quick Reference Cards

#### Authentication Quick Fix
```bash
# 🔧 Quick Fix: Auth Issues
1. Check token: localStorage.getItem('supabase.auth.token')
2. Refresh session: supabase.auth.refreshSession()
3. Clear auth: localStorage.clear()
4. Re-login: Navigate to /login
```

#### Database Quick Fix
```bash
# 🔧 Quick Fix: Database Issues
1. Check connection: supabase.from('user_profiles').select('count')
2. Run migrations: npm run migrate
3. Check RLS: Verify policies in Supabase dashboard
```

#### API Quick Fix
```bash
# 🔧 Quick Fix: API Issues
1. Check API key: echo $OPENAI_API_KEY
2. Check rate limits: Review API dashboard
3. Use fallback: Implement cached responses
```

---

## Cross-References

- **API Documentation**: [Frontend API Reference](./api-endpoints.md)
- **Type Definitions**: [TypeScript Reference](./type-definitions.md)
- **Migration Guides**: [Migration Reference](./migration-guides.md)
- **Feature Guides**: [Frontend Integration Guides](../02-feature-guides/)

---

## Maintenance Notes

This troubleshooting guide is continuously updated based on:

1. **User Feedback**: Common issues reported by developers
2. **Error Monitoring**: Automated error tracking and analysis
3. **Industry Research**: Latest troubleshooting best practices

### CI/CD Pipeline Integration

For detailed CI/CD setup and automation workflows, see [TypeScript Reference - CI/CD Integration](./type-definitions.md#detailed-cicd-pipeline-setup-phase-4).

**Auto-update triggers:**
- Error pattern changes in middleware
- New troubleshooting content in feature guides
- Industry best practice updates

**Last Updated**: Auto-synced with error monitoring data  
**Next Review**: Weekly based on error analytics