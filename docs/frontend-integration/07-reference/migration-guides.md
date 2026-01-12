# Migration Guides Reference

> **Purpose**: Version upgrade and migration documentation for 6-12 month development cycles. This guide provides comprehensive procedures for managing dependencies, database schema changes, API versioning, and configuration updates across the trAIner application stack.

## Table of Contents

1. [Frontend Dependency Migrations](#frontend-dependency-migrations)
2. [Backend Dependency Migrations](#backend-dependency-migrations)
3. [Database Schema Migrations](#database-schema-migrations)
4. [API Versioning Strategy](#api-versioning-strategy)
5. [Configuration & Environment Migrations](#configuration-environment-migrations)

---

## 1. Frontend Dependency Migrations

Frontend dependencies require updates every **6-12 months** to maintain security, performance, and feature compatibility.

### React & Next.js Upgrades (6-12 month cycles)

#### Current Version Baseline (as of implementation)
```json
{
  "react": "^18.0.0",
  "react-dom": "^18.0.0",
  "next": "^14.2.26",
  "typescript": "^5.0.0"
}
```

#### Version Compatibility Matrix

| React | Next.js | TypeScript | Node.js | Status |
|-------|---------|------------|---------|---------|
| 18.x  | 14.x    | 5.x        | 18.x    | ✅ Current |
| 18.x  | 15.x    | 5.x        | 18.x    | 🔄 Next Target |
| 19.x  | 15.x    | 5.x        | 20.x    | 🎯 Future |

#### Breaking Changes Documentation

**Next.js 14 → 15 Migration**:
1. **App Router Changes**:
   ```diff
   // BEFORE (Next.js 14)
   export default function Layout({ children }) {
     return <div>{children}</div>;
   }
   
   // AFTER (Next.js 15)
   export default function Layout({ children }) {
     return <div>{children}</div>;
   }
   // No major breaking changes expected
   ```

2. **Image Component Updates**:
   ```diff
   // Check for any deprecated props
   - <Image layout="fill" />
   + <Image fill />
   ```

3. **TypeScript Configuration**:
   ```diff
   // tsconfig.json updates
   {
     "compilerOptions": {
   +   "moduleResolution": "bundler",
       "strict": true
     }
   }
   ```

#### Step-by-Step Upgrade Procedures

**React 18.x Upgrade Process**:
1. **Pre-upgrade Checklist**:
   ```bash
   # Create backup branch
   git checkout -b upgrade/react-18
   
   # Run full test suite
   npm test
   npm run test:integration
   
   # Check for deprecation warnings
   npm run dev 2>&1 | grep -i "deprecat"
   ```

2. **Dependency Updates**:
   ```bash
   # Update React and related packages
   npm update react react-dom @types/react @types/react-dom
   
   # Update Next.js
   npm update next
   
   # Check for peer dependency warnings
   npm ls
   ```

3. **Code Migration**:
   ```typescript
   // Update root component for React 18
   // pages/_app.tsx
   import { createRoot } from 'react-dom/client';
   
   // Replace ReactDOM.render with createRoot (if using custom _document)
   // This is typically handled by Next.js automatically
   ```

4. **Testing & Validation**:
   ```bash
   # Clear caches
   rm -rf .next node_modules/.cache
   
   # Reinstall dependencies
   npm install
   
   # Run development server
   npm run dev
   
   # Run all tests
   npm test
   npm run test:e2e
   
   # Build for production
   npm run build
   ```

#### Rollback Strategies

**Emergency Rollback Procedure**:
1. **Quick Rollback**:
   ```bash
   # Revert package.json changes
   git checkout HEAD~1 -- package.json package-lock.json
   
   # Reinstall previous versions
   rm -rf node_modules
   npm install
   
   # Clear Next.js cache
   rm -rf .next
   ```

2. **Staged Rollback**:
   ```bash
   # Create rollback branch
   git checkout -b rollback/react-upgrade
   
   # Identify specific problematic packages
   npm ls --depth=0
   
   # Downgrade specific packages
   npm install react@17.0.2 react-dom@17.0.2
   ```

3. **Rollback Validation**:
   ```bash
   # Verify application functionality
   npm run dev
   npm test
   
   # Check critical user paths
   # - Authentication flow
   # - Workout generation
   # - Profile management
   ```

### UI Library Migrations

#### Radix UI Updates

**Current Versions**:
```json
{
  "@radix-ui/react-accordion": "^1.2.2",
  "@radix-ui/react-dialog": "^1.1.5",
  "@radix-ui/react-select": "^2.1.5"
}
```

**Migration Procedure**:
1. **Check Breaking Changes**:
   ```bash
   # Review changelog
   npm info @radix-ui/react-dialog versions --json
   
   # Check for breaking changes
   curl -s https://api.github.com/repos/radix-ui/primitives/releases/latest
   ```

2. **Component-by-Component Updates**:
   ```typescript
   // Example: Dialog component migration
   // BEFORE:
   import * as Dialog from '@radix-ui/react-dialog';
   
   // Check for API changes
   <Dialog.Root>
     <Dialog.Trigger />
     <Dialog.Content />
   </Dialog.Root>
   
   // AFTER (if changes required):
   // Update according to new API
   ```

3. **Test UI Components**:
   ```bash
   # Visual regression testing
   npm run storybook
   
   # Component unit tests
   npm test -- --testNamePattern="Dialog|Select|Accordion"
   ```

#### Tailwind CSS Migrations

**Version Tracking**:
```json
{
  "tailwindcss": "^3.4.0",
  "@tailwindcss/forms": "^0.5.0",
  "@tailwindcss/typography": "^0.5.0"
}
```

**Migration Steps**:
1. **Configuration Updates**:
   ```diff
   // tailwind.config.js
   module.exports = {
   + darkMode: 'class',
     content: [
       './pages/**/*.{js,ts,jsx,tsx}',
       './components/**/*.{js,ts,jsx,tsx}',
     ],
     theme: {
       extend: {
   +     colors: {
   +       primary: 'rgb(var(--primary))',
   +     }
       }
     }
   }
   ```

2. **CSS Class Updates**:
   ```bash
   # Use automated migration tools
   npx @tailwindcss/upgrade
   
   # Manual review of deprecated classes
   grep -r "bg-gray-50" components/ --include="*.tsx"
   ```

#### Component Library Changes

**Custom Component Updates**:
1. **Button Component Migration**:
   ```typescript
   // components/ui/button.tsx
   // Update to handle new Radix primitives
   interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
     variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
     size?: 'default' | 'sm' | 'lg' | 'icon';
   + asChild?: boolean; // New Radix pattern
   }
   ```

2. **Form Component Updates**:
   ```typescript
   // Update form validation with latest react-hook-form
   import { useForm, FieldValues } from 'react-hook-form';
   
   // Check for breaking changes in validation
   const { register, handleSubmit, formState: { errors } } = useForm({
     mode: 'onChange', // Verify this still works
   });
   ```

---

## 2. Backend Dependency Migrations

Backend dependencies require updates every **3-6 months** for security patches and **6-12 months** for major versions.

### Node.js & Express Updates

#### Current Version Baseline
```json
{
  "node": ">=18.0.0",
  "express": "^4.18.3",
  "typescript": "^5.0.0"
}
```

#### Runtime Version Upgrades

**Node.js LTS Migration**:
1. **Version Planning**:
   ```bash
   # Check current Node.js version
   node --version
   
   # Check LTS schedule
   curl -s https://api.github.com/repos/nodejs/node/releases
   
   # Verify compatibility
   npm ls engines
   ```

2. **Development Environment Update**:
   ```bash
   # Update .nvmrc
   echo "20.10.0" > .nvmrc
   
   # Update CI/CD configuration
   # .github/workflows/ci.yml
   # Update node-version matrix
   ```

3. **Dependency Compatibility Check**:
   ```bash
   # Check for Node.js compatibility issues
   npm audit
   npm outdated
   
   # Test with new Node.js version
   nvm install 20
   nvm use 20
   npm install
   npm test
   ```

#### Express Migration (4.x → 5.x)

**Breaking Changes Assessment**:
1. **Middleware Changes**:
   ```diff
   // Express 5.x changes
   - app.use(express.bodyParser()); // Removed
   + app.use(express.json());
   + app.use(express.urlencoded({ extended: true }));
   ```

2. **Error Handling Updates**:
   ```diff
   // Express 5.x error handling
   app.use((err, req, res, next) => {
   - if (err.status) {
   + if (err.statusCode || err.status) {
       res.status(err.status || err.statusCode).json({
         error: err.message
       });
     }
   });
   ```

#### Security Patch Procedures

**Automated Security Updates**:
1. **Vulnerability Scanning**:
   ```bash
   # Regular security audits
   npm audit
   npm audit fix
   
   # Check for high-severity issues
   npm audit --audit-level high
   ```

2. **Dependency Updates**:
   ```bash
   # Update security patches
   npm update
   
   # Check for breaking changes
   npm run test
   npm run test:integration
   ```

3. **Security Validation**:
   ```bash
   # Run security tests
   npm run test:security
   
   # Verify no new vulnerabilities
   npm audit --production
   ```

### Supabase Platform Updates (3-6 month cycles)

#### Client Library Updates

**Current Version**:
```json
{
  "@supabase/supabase-js": "^2.49.4",
  "@supabase/auth-helpers-nextjs": "^0.10.0"
}
```

**Migration Procedure**:
1. **Version Compatibility Check**:
   ```bash
   # Check latest versions
   npm info @supabase/supabase-js versions --json
   
   # Review breaking changes
   curl -s https://api.github.com/repos/supabase/supabase-js/releases/latest
   ```

2. **Client Configuration Updates**:
   ```typescript
   // lib/supabase/client.ts
   import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
   
   // Check for API changes
   export const supabase = createClientComponentClient({
     // Verify configuration options
   });
   ```

3. **Feature Migration**:
   ```typescript
   // Update auth helpers if needed
   // Check for changes in:
   // - Session management
   // - Cookie handling
   // - Middleware functions
   ```

#### Platform Feature Migrations

**Database Feature Updates**:
1. **RLS Policy Updates**:
   ```sql
   -- Check for new RLS features
   -- Update policies to use new syntax if available
   ALTER POLICY "user_access_policy" ON user_profiles
   RENAME TO "user_access_policy_v2";
   ```

2. **Function Updates**:
   ```sql
   -- Update database functions for new features
   -- Check migration guide for SQL changes
   ```

### AI Service Migrations (quarterly adjustments)

#### OpenAI API Version Changes

**Current Integration**:
```json
{
  "openai": "^4.82.0"
}
```

**API Version Migration**:
1. **Model Updates**:
   ```typescript
   // config/openai.ts
   const openaiConfig = {
   - model: 'gpt-4-turbo-preview',
   + model: 'gpt-4-turbo',
     maxTokens: 2000,
     temperature: 0.7
   };
   ```

2. **Function Calling Updates**:
   ```typescript
   // Check for function calling API changes
   const completion = await openai.chat.completions.create({
     model: 'gpt-4-turbo',
     messages: [...],
   + tools: [...], // New tools format
   - functions: [...], // Deprecated
   });
   ```

#### Model Deprecations

**Migration Strategy**:
1. **Model Mapping**:
   ```typescript
   // utils/model-mapping.ts
   const modelMigrationMap = {
     'gpt-4-turbo-preview': 'gpt-4-turbo',
     'gpt-3.5-turbo-0613': 'gpt-3.5-turbo',
   };
   
   export function getMigratedModel(oldModel: string): string {
     return modelMigrationMap[oldModel] || oldModel;
   }
   ```

2. **Performance Testing**:
   ```bash
   # Test new models with existing prompts
   npm run test:ai-models
   
   # Compare response quality
   npm run benchmark:model-comparison
   ```

#### Pricing Tier Adjustments

**Cost Optimization**:
1. **Usage Monitoring**:
   ```typescript
   // utils/usage-tracking.ts
   export async function trackTokenUsage(tokens: number, model: string) {
     const cost = calculateCost(tokens, model);
     
     await supabase.from('ai_usage_tracking').insert({
       tokens_used: tokens,
       model_used: model,
       estimated_cost: cost,
       timestamp: new Date().toISOString()
     });
   }
   ```

2. **Budget Alerts**:
   ```typescript
   // Set up monitoring for cost thresholds
   const MONTHLY_BUDGET = 100; // USD
   const checkBudget = async () => {
     const monthlyUsage = await getMonthlyUsage();
     if (monthlyUsage > MONTHLY_BUDGET * 0.8) {
       await sendBudgetAlert(monthlyUsage);
     }
   };
   ```

---

## 3. Database Schema Migrations

Database migrations are critical for maintaining data integrity while evolving the application schema.

### Migration File Patterns

#### Schema Evolution Strategy

**Migration Naming Convention**:
```
YYYYMMDDHHMMSS_descriptive_name.sql
Example: 20241201120000_add_workout_templates_table.sql
```

**Migration Template**:
```sql
-- Migration: Add workout templates functionality
-- Date: 2024-12-01
-- Author: Development Team
-- Description: Adds workout_templates table for reusable workout patterns

BEGIN;

-- Create the new table
CREATE TABLE IF NOT EXISTS workout_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  template_data JSONB NOT NULL,
  category VARCHAR(100),
  difficulty_level difficulty_enum NOT NULL,
  estimated_duration INTEGER, -- in minutes
  created_by UUID REFERENCES auth.users(id),
  is_public BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Add RLS policies
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view public templates" ON workout_templates
FOR SELECT USING (is_public = true OR created_by = auth.uid());

CREATE POLICY "Users can create their own templates" ON workout_templates
FOR INSERT WITH CHECK (created_by = auth.uid());

CREATE POLICY "Users can update their own templates" ON workout_templates
FOR UPDATE USING (created_by = auth.uid());

-- Add indexes for performance
CREATE INDEX idx_workout_templates_category ON workout_templates(category);
CREATE INDEX idx_workout_templates_difficulty ON workout_templates(difficulty_level);
CREATE INDEX idx_workout_templates_public ON workout_templates(is_public) WHERE is_public = true;

-- Update migration tracking
INSERT INTO migrations (name, hash, applied_at, success) 
VALUES (
  '20241201120000_add_workout_templates_table.sql',
  md5('20241201120000_add_workout_templates_table.sql'),
  CURRENT_TIMESTAMP,
  true
);

COMMIT;
```

#### Data Preservation Techniques

**Safe Column Addition**:
```sql
-- Add new column with default value
ALTER TABLE user_profiles 
ADD COLUMN timezone VARCHAR(50) DEFAULT 'UTC';

-- Backfill data for existing users
UPDATE user_profiles 
SET timezone = 'America/New_York' 
WHERE created_at < '2024-01-01' AND timezone = 'UTC';
```

**Column Type Changes**:
```sql
-- Safe type conversion with validation
-- Step 1: Add new column
ALTER TABLE workout_logs 
ADD COLUMN duration_minutes INTEGER;

-- Step 2: Migrate data
UPDATE workout_logs 
SET duration_minutes = EXTRACT(EPOCH FROM duration_interval) / 60
WHERE duration_interval IS NOT NULL;

-- Step 3: Add constraints
ALTER TABLE workout_logs 
ADD CONSTRAINT check_duration_positive 
CHECK (duration_minutes > 0);

-- Step 4: (In future migration) Drop old column
-- ALTER TABLE workout_logs DROP COLUMN duration_interval;
```

#### Rollback Procedures

**Migration Rollback Template**:
```sql
-- Rollback for: 20241201120000_add_workout_templates_table.sql
-- Description: Remove workout templates functionality

BEGIN;

-- Drop dependent objects first
DROP POLICY IF EXISTS "Users can update their own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can create their own templates" ON workout_templates;
DROP POLICY IF EXISTS "Users can view public templates" ON workout_templates;

-- Drop indexes
DROP INDEX IF EXISTS idx_workout_templates_category;
DROP INDEX IF EXISTS idx_workout_templates_difficulty;
DROP INDEX IF EXISTS idx_workout_templates_public;

-- Drop table
DROP TABLE IF EXISTS workout_templates;

-- Remove from migration tracking
DELETE FROM migrations 
WHERE name = '20241201120000_add_workout_templates_table.sql';

COMMIT;
```

### Breaking Schema Changes

#### Foreign Key Modifications

**Safe Foreign Key Updates**:
1. **Add New Foreign Key**:
   ```sql
   -- Step 1: Add nullable FK column
   ALTER TABLE workout_logs 
   ADD COLUMN template_id UUID REFERENCES workout_templates(id);
   
   -- Step 2: Populate data
   UPDATE workout_logs 
   SET template_id = wt.id
   FROM workout_templates wt
   WHERE workout_logs.plan_data->>'template_name' = wt.name;
   
   -- Step 3: Add constraint (in separate migration)
   -- ALTER TABLE workout_logs 
   -- ALTER COLUMN template_id SET NOT NULL;
   ```

2. **Remove Foreign Key**:
   ```sql
   -- Step 1: Create backup column
   ALTER TABLE workout_logs 
   ADD COLUMN template_name_backup VARCHAR(255);
   
   -- Step 2: Copy data
   UPDATE workout_logs 
   SET template_name_backup = wt.name
   FROM workout_templates wt
   WHERE workout_logs.template_id = wt.id;
   
   -- Step 3: Drop FK constraint
   ALTER TABLE workout_logs 
   DROP CONSTRAINT workout_logs_template_id_fkey;
   
   -- Step 4: Drop column (in separate migration)
   -- ALTER TABLE workout_logs DROP COLUMN template_id;
   ```

#### Column Type Changes

**JSONB to Structured Columns**:
```sql
-- Migration from JSONB to structured data
-- Step 1: Add new columns
ALTER TABLE workout_plans 
ADD COLUMN exercise_count INTEGER,
ADD COLUMN total_duration INTEGER,
ADD COLUMN difficulty_score DECIMAL(3,2);

-- Step 2: Extract data from JSONB
UPDATE workout_plans 
SET 
  exercise_count = (plan_data->>'exercise_count')::INTEGER,
  total_duration = (plan_data->>'total_duration')::INTEGER,
  difficulty_score = (plan_data->>'difficulty_score')::DECIMAL;

-- Step 3: Add constraints
ALTER TABLE workout_plans 
ADD CONSTRAINT check_exercise_count_positive 
CHECK (exercise_count > 0);

-- Step 4: Update application code to use new columns
-- Step 5: (Future migration) Remove JSONB fields or entire column
```

#### Index Management

**Performance Index Migrations**:
```sql
-- Add composite indexes for common queries
CREATE INDEX CONCURRENTLY idx_workout_logs_user_date 
ON workout_logs(user_id, created_at DESC);

-- Add partial indexes for specific conditions
CREATE INDEX CONCURRENTLY idx_workout_plans_active 
ON workout_plans(user_id, created_at) 
WHERE status = 'active';

-- Add GIN indexes for JSONB searches
CREATE INDEX CONCURRENTLY idx_workout_plans_metadata 
ON workout_plans USING GIN (plan_data);

-- Drop unused indexes
DROP INDEX IF EXISTS old_inefficient_index;
```

**Index Monitoring**:
```sql
-- Check index usage before dropping
SELECT 
  schemaname,
  tablename,
  indexname,
  idx_scan,
  idx_tup_read
FROM pg_stat_user_indexes 
WHERE idx_scan < 100  -- Rarely used indexes
ORDER BY idx_scan;
```

---

## 4. API Versioning Strategy

API versioning ensures backward compatibility while allowing feature evolution.

### Internal API Evolution (2-3 versions/year)

#### Current API Structure
```
/api/v1/auth/*
/api/v1/profile/*
/api/v1/workouts/*
/api/v1/analytics/*
```

#### v1 to v2 Migration Paths

**API Route Structure**:
```typescript
// backend/routes/v2/workouts.js
// New enhanced workout generation with additional features

router.post('/generate', async (req, res) => {
  try {
    // v2: Enhanced generation with templates and AI insights
    const { 
      profile, 
      preferences, 
      templateId,        // New in v2
      aiInsightsLevel    // New in v2
    } = req.body;
    
    // Backward compatibility check
    if (req.headers['api-version'] === '1.0') {
      return generateV1Workout(req, res);
    }
    
    const workout = await generateEnhancedWorkout({
      profile,
      preferences,
      templateId,
      aiInsightsLevel: aiInsightsLevel || 'standard'
    });
    
    res.json({
      version: '2.0',
      data: workout,
      deprecationNotice: null
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
```

**Version Header Handling**:
```typescript
// middleware/api-versioning.js
const API_VERSIONS = {
  '1.0': { supported: true, deprecated: false },
  '1.1': { supported: true, deprecated: true, sunsetDate: '2025-06-01' },
  '2.0': { supported: true, deprecated: false }
};

export function versionMiddleware(req, res, next) {
  const version = req.headers['api-version'] || '1.0';
  
  if (!API_VERSIONS[version]?.supported) {
    return res.status(400).json({
      error: 'Unsupported API version',
      supportedVersions: Object.keys(API_VERSIONS).filter(v => 
        API_VERSIONS[v].supported
      )
    });
  }
  
  if (API_VERSIONS[version]?.deprecated) {
    res.set('Deprecation', 'true');
    res.set('Sunset', API_VERSIONS[version].sunsetDate);
  }
  
  req.apiVersion = version;
  next();
}
```

#### Backwards Compatibility Approach

**Response Format Compatibility**:
```typescript
// utils/response-formatter.js
export function formatResponse(data, version) {
  switch (version) {
    case '1.0':
      return {
        // v1 format
        success: true,
        data: transformToV1Format(data)
      };
    
    case '2.0':
      return {
        // v2 format with additional metadata
        status: 'success',
        data: data,
        metadata: {
          version: '2.0',
          processingTime: data._processingTime,
          aiConfidence: data._aiConfidence
        }
      };
    
    default:
      return data;
  }
}

function transformToV1Format(v2Data) {
  // Remove v2-specific fields for v1 compatibility
  const { _processingTime, _aiConfidence, ...v1Data } = v2Data;
  return v1Data;
}
```

#### Deprecation Timeline (6-month notice)

**Deprecation Communication**:
```typescript
// API deprecation headers and responses
const DEPRECATION_NOTICES = {
  '1.1': {
    message: 'API v1.1 is deprecated. Please migrate to v2.0 by June 1, 2025.',
    migrationGuide: 'https://docs.trainer.app/api/migration/v1-to-v2',
    sunsetDate: '2025-06-01'
  }
};

export function addDeprecationHeaders(res, version) {
  const notice = DEPRECATION_NOTICES[version];
  if (notice) {
    res.set('Deprecation', 'true');
    res.set('Sunset', notice.sunsetDate);
    res.set('Link', `<${notice.migrationGuide}>; rel="migration-guide"`);
  }
}
```

### Client Integration Updates

#### Frontend API Client Changes

**Version-Aware API Client**:
```typescript
// lib/api-client.ts
class APIClient {
  private version: string;
  private baseURL: string;
  
  constructor(version = '2.0') {
    this.version = version;
    this.baseURL = process.env.NEXT_PUBLIC_API_URL;
  }
  
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${this.baseURL}/v${this.version.split('.')[0]}${endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'API-Version': this.version,
        ...options.headers
      }
    });
    
    // Handle deprecation warnings
    if (response.headers.get('Deprecation')) {
      console.warn(`API v${this.version} is deprecated. Sunset date: ${response.headers.get('Sunset')}`);
    }
    
    if (!response.ok) {
      throw new APIError(response.status, await response.text());
    }
    
    return response.json();
  }
  
  async generateWorkout(params: WorkoutGenerationRequest): Promise<WorkoutPlan> {
    return this.request('/workouts/generate', {
      method: 'POST',
      body: JSON.stringify(params)
    });
  }
}

// Usage with version migration
export const apiClient = new APIClient('2.0');
export const legacyAPIClient = new APIClient('1.1'); // For gradual migration
```

#### Type Definition Updates

**Versioned Type Definitions**:
```typescript
// types/api-v1.ts
export interface WorkoutPlanV1 {
  id: string;
  name: string;
  exercises: Exercise[];
  difficulty: string;
}

// types/api-v2.ts
export interface WorkoutPlanV2 extends WorkoutPlanV1 {
  templateId?: string;        // New in v2
  aiInsights?: AIInsight[];   // New in v2
  metadata: {
    version: string;
    processingTime: number;
    aiConfidence: number;
  };
}

// types/api.ts - Export current version
export type WorkoutPlan = WorkoutPlanV2;
export type { WorkoutPlanV1 }; // For legacy support
```

#### Error Handling Modifications

**Version-Specific Error Handling**:
```typescript
// utils/error-handler.ts
export class APIError extends Error {
  constructor(
    public status: number, 
    public message: string,
    public version?: string
  ) {
    super(message);
    this.name = 'APIError';
  }
}

export function handleAPIError(error: APIError, apiVersion: string) {
  // Version-specific error handling
  switch (apiVersion) {
    case '1.0':
    case '1.1':
      // Legacy error format
      return {
        success: false,
        error: error.message,
        code: error.status
      };
    
    case '2.0':
      // Enhanced error format
      return {
        status: 'error',
        error: {
          message: error.message,
          code: error.status,
          timestamp: new Date().toISOString(),
          version: apiVersion
        }
      };
  }
}
```

---

## 5. Configuration & Environment Migrations

Configuration changes require careful coordination across environments to maintain service availability.

### Environment Variable Changes

#### New Configuration Requirements

**Configuration Audit Process**:
1. **Inventory Current Variables**:
   ```bash
   # Frontend environment variables
   grep -r "process.env" pages/ components/ --include="*.ts" --include="*.tsx" | \
     grep -o "process.env\.[A-Z_]*" | sort | uniq > frontend-env-vars.txt
   
   # Backend environment variables
   grep -r "process.env" backend/ --include="*.js" --include="*.ts" | \
     grep -o "process.env\.[A-Z_]*" | sort | uniq > backend-env-vars.txt
   ```

2. **Document Required Variables**:
   ```typescript
   // config/environment.ts
   interface EnvironmentConfig {
     // Database
     SUPABASE_URL: string;
     SUPABASE_SERVICE_ROLE_KEY: string;
     
     // AI Services
     OPENAI_API_KEY: string;
     PERPLEXITY_API_KEY: string;
     
     // Application
     NEXTAUTH_SECRET: string;
     NEXTAUTH_URL: string;
     
     // New features (to be added)
     REDIS_URL?: string;              // For caching
     STRIPE_SECRET_KEY?: string;      // For payments
     ANALYTICS_API_KEY?: string;      // For tracking
   }
   
   export function validateEnvironment(): EnvironmentConfig {
     const config = {
       SUPABASE_URL: process.env.SUPABASE_URL,
       SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
       OPENAI_API_KEY: process.env.OPENAI_API_KEY,
       PERPLEXITY_API_KEY: process.env.PERPLEXITY_API_KEY,
       NEXTAUTH_SECRET: process.env.NEXTAUTH_SECRET,
       NEXTAUTH_URL: process.env.NEXTAUTH_URL,
     };
     
     // Validate required variables
     const missing = Object.entries(config)
       .filter(([key, value]) => !value)
       .map(([key]) => key);
     
     if (missing.length > 0) {
       throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
     }
     
     return config as EnvironmentConfig;
   }
   ```

#### Security Credential Updates

**Credential Rotation Procedure**:
1. **API Key Rotation**:
   ```bash
   # OpenAI API key rotation
   # Step 1: Generate new key in OpenAI dashboard
   # Step 2: Update environment variables
   export OPENAI_API_KEY_NEW="sk-new-key-here"
   
   # Step 3: Test new key
   curl -H "Authorization: Bearer $OPENAI_API_KEY_NEW" \
        https://api.openai.com/v1/models
   
   # Step 4: Update production environment
   # Step 5: Revoke old key
   ```

2. **Database Credential Updates**:
   ```bash
   # Supabase key rotation
   # Step 1: Generate new service role key
   # Step 2: Update environment in staging
   # Step 3: Test application functionality
   # Step 4: Update production
   # Step 5: Revoke old key
   ```

3. **JWT Secret Rotation**:
   ```bash
   # JWT secret rotation (requires user re-authentication)
   # Step 1: Generate new secret
   openssl rand -base64 32
   
   # Step 2: Update environment
   export NEXTAUTH_SECRET="new-secret-here"
   
   # Step 3: Deploy with user session invalidation notice
   # Step 4: Monitor for authentication issues
   ```

#### Service Endpoint Changes

**API Endpoint Migration**:
```typescript
// config/api-endpoints.ts
export const API_ENDPOINTS = {
  development: {
    backend: 'http://localhost:8000',
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  staging: {
    backend: 'https://staging-api.trainer.app',
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
  },
  production: {
    backend: 'https://api.trainer.app',
    supabase: process.env.NEXT_PUBLIC_SUPABASE_URL,
  }
};

export function getAPIEndpoints() {
  const env = process.env.NODE_ENV || 'development';
  return API_ENDPOINTS[env] || API_ENDPOINTS.development;
}
```

### Feature Flag Migrations

#### Rolling Deployment Strategies

**Feature Flag Implementation**:
```typescript
// lib/feature-flags.ts
interface FeatureFlags {
  enableAIInsights: boolean;
  enableWorkoutTemplates: boolean;
  enablePayments: boolean;
  enableAnalytics: boolean;
}

export class FeatureFlagManager {
  private flags: FeatureFlags;
  
  constructor() {
    this.flags = {
      enableAIInsights: process.env.FEATURE_AI_INSIGHTS === 'true',
      enableWorkoutTemplates: process.env.FEATURE_WORKOUT_TEMPLATES === 'true',
      enablePayments: process.env.FEATURE_PAYMENTS === 'true',
      enableAnalytics: process.env.FEATURE_ANALYTICS === 'true',
    };
  }
  
  isEnabled(feature: keyof FeatureFlags): boolean {
    return this.flags[feature] || false;
  }
  
  // For gradual rollout
  isEnabledForUser(feature: keyof FeatureFlags, userId: string): boolean {
    if (!this.isEnabled(feature)) return false;
    
    // Use user ID hash for consistent experience
    const hash = this.hashUserId(userId);
    const rolloutPercentage = this.getRolloutPercentage(feature);
    
    return hash % 100 < rolloutPercentage;
  }
  
  private getRolloutPercentage(feature: keyof FeatureFlags): number {
    const percentages = {
      enableAIInsights: 25,        // 25% rollout
      enableWorkoutTemplates: 50,  // 50% rollout
      enablePayments: 100,         // Full rollout
      enableAnalytics: 10,         // 10% rollout
    };
    
    return percentages[feature] || 0;
  }
}

export const featureFlags = new FeatureFlagManager();
```

#### A/B Testing Transitions

**A/B Test Configuration**:
```typescript
// lib/ab-testing.ts
interface ABTest {
  name: string;
  variants: {
    control: any;
    treatment: any;
  };
  trafficSplit: number; // 0-100 percentage for treatment
  startDate: string;
  endDate: string;
}

export const abTests: Record<string, ABTest> = {
  workoutGenerationUI: {
    name: 'Workout Generation UI Test',
    variants: {
      control: { layout: 'vertical', showAdvanced: false },
      treatment: { layout: 'horizontal', showAdvanced: true }
    },
    trafficSplit: 50,
    startDate: '2024-12-01',
    endDate: '2024-12-31'
  }
};

export function getABTestVariant(testName: string, userId: string) {
  const test = abTests[testName];
  if (!test) return test?.variants.control;
  
  const now = new Date();
  const startDate = new Date(test.startDate);
  const endDate = new Date(test.endDate);
  
  if (now < startDate || now > endDate) {
    return test.variants.control;
  }
  
  const hash = hashUserId(userId);
  const inTreatment = hash % 100 < test.trafficSplit;
  
  return inTreatment ? test.variants.treatment : test.variants.control;
}
```

#### Feature Deprecation

**Deprecation Timeline**:
```typescript
// lib/deprecation.ts
interface DeprecatedFeature {
  name: string;
  deprecatedDate: string;
  removalDate: string;
  replacement?: string;
  migrationGuide?: string;
}

export const deprecatedFeatures: Record<string, DeprecatedFeature> = {
  legacyWorkoutGenerator: {
    name: 'Legacy Workout Generator',
    deprecatedDate: '2024-12-01',
    removalDate: '2025-06-01',
    replacement: 'AI-Enhanced Workout Generator',
    migrationGuide: '/docs/migration/workout-generator-v2'
  }
};

export function checkDeprecation(featureName: string) {
  const feature = deprecatedFeatures[featureName];
  if (!feature) return null;
  
  const now = new Date();
  const deprecatedDate = new Date(feature.deprecatedDate);
  const removalDate = new Date(feature.removalDate);
  
  if (now < deprecatedDate) {
    return { status: 'active' };
  } else if (now < removalDate) {
    return { 
      status: 'deprecated', 
      warning: `${feature.name} is deprecated and will be removed on ${feature.removalDate}`,
      replacement: feature.replacement,
      migrationGuide: feature.migrationGuide
    };
  } else {
    return { 
      status: 'removed',
      error: `${feature.name} has been removed. Please use ${feature.replacement}`
    };
  }
}
```

---

## Cross-References

- **API Documentation**: [Frontend API Reference](./api-endpoints.md)
- **Type Definitions**: [TypeScript Reference](./type-definitions.md)
- **Troubleshooting**: [Common Issues & Solutions](./troubleshooting.md)
- **Deployment Guide**: [Deployment Documentation](../06-deployment/)

---

## Maintenance Notes

This migration guide is updated with each major release and dependency update:

1. **Version Tracking**: All version changes are documented with migration paths
2. **Breaking Changes**: Comprehensive documentation of API and schema changes
3. **Rollback Procedures**: Tested rollback strategies for all major migrations
4. **Timeline Planning**: 6-month advance notice for deprecations

### Migration Planning Schedule

- **Monthly**: Review dependency updates and security patches
- **Quarterly**: Plan major version upgrades and feature migrations
- **Bi-annually**: Review and update migration procedures
- **Annually**: Complete documentation audit and user feedback integration

### CI/CD Pipeline Integration

For detailed CI/CD setup and automation workflows, see [TypeScript Reference - CI/CD Integration](./type-definitions.md#detailed-cicd-pipeline-setup-phase-4).

**Auto-update triggers:**
- Dependency version changes (`package.json`, `backend/package.json`)
- Database migration additions (`backend/supabase/migrations/`)
- API versioning updates (`backend/routes/v*/`)

**Last Updated**: Synchronized with dependency versions  
**Next Review**: Monthly dependency audit cycle