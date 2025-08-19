Ran tool
# 🎯 **COMPREHENSIVE PROFILES CONSOLIDATION PLAN - FINAL VERSION**

Based on the actual current state of the codebase after your recent commit, here is the complete consolidation strategy:

## **📊 CURRENT STATE ANALYSIS**

### **✅ WHAT'S ALREADY WORKING**
- **MultiStepProfileForm**: Modern component using new hook (`@/hooks/use-profile-queries`)
- **Migration Structure**: Moved to `supabase/migrations/` (✅ Done)
- **E2E Infrastructure**: Comprehensive test setup and debugging tools
- **Error Handling**: Enhanced boundaries and recovery mechanisms
- **ProfileQueryProvider**: Modern TanStack Query-based provider
- **Route Structure**: `/profile/create` → MultiStepProfileForm, `/profile` → UserProfileForm

### **❌ WHAT NEEDS CONSOLIDATION**
- **UserProfileForm**: Old component using old hook (`@/lib/profile-context`)
- **7 Other Components**: Still using old hook system
- **Migration Path**: Backend still points to wrong directory
- **E2E Tests**: May need selector updates for enhanced architecture
- **Provider Architecture**: Old ProfileProvider disabled but still referenced
- **Shared Logic**: Extract common patterns between form components

---

## **🛠️ SYSTEMATIC CONSOLIDATION PHASES**

### **PHASE 0: PRE-CONSOLIDATION SAFETY** ⚠️ **MANDATORY FIRST**

#### **Step 0.1: Current State Backup**
```bash
# Create safety backup branch from current dev state
git checkout dev
git tag pre-consolidation-backup-$(date +%Y%m%d_%H%M%S)
git checkout -b feature/profile-consolidation

# Verify clean working state
git status  # Should show "working tree clean"
```

#### **Step 0.2: Create Consolidation Tracking Issue**
```bash
# Document the scope for future reference
echo "CONSOLIDATION SCOPE: 
- 8 hook import updates
- 1 migration path fix  
- 3 E2E test updates
- 2 route component updates
- Component architecture enhancement with shared logic
" > consolidation-scope.md
```

---

### **PHASE 1: INFRASTRUCTURE FIXES** ⚠️ **CRITICAL FOUNDATION**

#### **Step 1.1: Fix Backend Migration Path**

**File: `backend/utils/migrations.js`**
```javascript
// Line 24 - CURRENT (WRONG):
const MIGRATIONS_DIR = env.migrations?.directory || path.join(__dirname, '../migrations');

// CHANGE TO (CORRECT):
const MIGRATIONS_DIR = env.migrations?.directory || path.join(__dirname, '../supabase/migrations');
```

**File: `backend/migration-tools/migrate-robust.js` (if exists)**
```javascript
// Line ~8 - CURRENT (WRONG):
const MIGRATIONS_DIR = path.resolve(__dirname, '../migrations');

// CHANGE TO (CORRECT):
const MIGRATIONS_DIR = path.resolve(__dirname, '../supabase/migrations');
```

#### **Step 1.2: Verification**
```bash
# Test migration path resolution
cd backend
node -e "
const { env } = require('./config');
const path = require('path');
const MIGRATIONS_DIR = env.migrations?.directory || path.join(__dirname, '../supabase/migrations');
const fs = require('fs');
console.log('Migration dir:', MIGRATIONS_DIR);
console.log('Exists:', fs.existsSync(MIGRATIONS_DIR));
console.log('Files:', fs.existsSync(MIGRATIONS_DIR) ? fs.readdirSync(MIGRATIONS_DIR).length : 0);
"
```

**Expected Output:**
```
Migration dir: /Users/dylanloberg/ai-trainer-app/backend/../supabase/migrations
Exists: true
Files: 26  # Or however many migration files you have
```

#### **Step 1.3: Commit Infrastructure Fixes**
```bash
git add backend/utils/migrations.js backend/migration-tools/migrate-robust.js
git commit -m "fix(backend): correct migration directory paths

- Fix backend/utils/migrations.js to point to supabase/migrations/
- Fix backend/migration-tools/migrate-robust.js path resolution
- Ensures backend can find migrations after directory restructure

Resolves migration path mismatch causing database connection issues."
```

---

### **PHASE 2: HOOK CONSOLIDATION** ⚠️ **HIGH PRIORITY**

#### **Step 2.1: Hook Interface Analysis**

**Old Hook Interface (`@/lib/profile-context`):**
```typescript
interface ProfileContextType {
  profile: UserProfile | null;
  isLoading: boolean;
  error: string | null;
  updateProfile: (data: Partial<UserProfile>) => Promise<void>;
  createProfile: (data: ProfileCreationFormData) => Promise<void>;
  refreshProfile: () => Promise<void>;
}
```

**New Hook Interface (`@/hooks/use-profile-queries`):**
```typescript
interface UseProfileReturn {
  profile: UseQueryResult<UserProfile | null>;
  updateProfileAsync: (data: Partial<UserProfile>) => Promise<UserProfile>;
  createProfileAsync: (data: ProfileCreationFormData) => Promise<UserProfile>;
  isLoading: boolean;
  error: Error | null;
  isUpdating: boolean;
  isCreating: boolean;
}
```

#### **Step 2.2: Interface Adaptation Strategy**

**Pattern for Data Access:**
```typescript
// OLD: Direct access
const { profile, isLoading } = useProfile();
const userName = profile?.name;

// NEW: Access via .data property
const { profile, isLoading } = useProfile();
const userName = profile.data?.name;
```

**Pattern for Updates:**
```typescript
// OLD: Void return
await updateProfile({ name: "New Name" });

// NEW: Returns updated profile
const updatedProfile = await updateProfileAsync({ name: "New Name" });
```

#### **Step 2.3: Update Hook Imports (8 Files)**

**Files to Update:**
1. `components/profile/user-profile-form.tsx`
2. `components/progress/body-metrics-chart.tsx`
3. `contexts/workout-context.tsx`
4. `contexts/workout-context-broken.tsx`
5. `components/progress/check-in-form.tsx`
6. `components/workout/workout-plan-form.tsx`
7. `components/profile/complete-profile-banner.tsx`
8. `__tests__/components/progress/check-in-form.test.tsx`

**Universal Search & Replace:**
```bash
# Find all files with old import
grep -r "from.*@/lib/profile-context" --include="*.tsx" --include="*.ts" .

# Manual replacement needed in each file:
# FROM: import { useProfile } from "@/lib/profile-context"
# TO:   import { useProfile } from "@/hooks/use-profile-queries"
```

#### **Step 2.4: Update Component Logic**

**For Each File, Update Usage Pattern:**

**Example: `components/profile/user-profile-form.tsx`**
```typescript
// OLD PATTERN:
const { profile, updateProfile, isLoading, error } = useProfile();

const handleSubmit = async (data: FormData) => {
  try {
    await updateProfile(data);
    // Success handling
  } catch (err) {
    // Error handling
  }
};

const currentName = profile?.name || '';

// NEW PATTERN:
const { profile, updateProfileAsync, isLoading, error } = useProfile();

const handleSubmit = async (data: FormData) => {
  try {
    const updatedProfile = await updateProfileAsync(data);
    // Success handling with returned profile
  } catch (err) {
    // Error handling
  }
};

const currentName = profile.data?.name || '';
```

#### **Step 2.5: Verification Script**
```bash
# Create verification script
cat > verify-hooks.sh << 'EOF'
#!/bin/bash
echo "Checking for old hook imports..."
OLD_IMPORTS=$(grep -r "from.*@/lib/profile-context" --include="*.tsx" --include="*.ts" . | wc -l)
echo "Old imports found: $OLD_IMPORTS"

if [ $OLD_IMPORTS -eq 0 ]; then
  echo "✅ All hooks updated successfully"
else
  echo "❌ Old hooks still found:"
  grep -r "from.*@/lib/profile-context" --include="*.tsx" --include="*.ts" .
fi

echo ""
echo "Checking for new hook usage..."
NEW_IMPORTS=$(grep -r "from.*@/hooks/use-profile-queries" --include="*.tsx" --include="*.ts" . | wc -l)
echo "New imports found: $NEW_IMPORTS"
EOF

chmod +x verify-hooks.sh
./verify-hooks.sh
```

#### **Step 2.6: Commit Hook Consolidation**
```bash
git add components/ contexts/ __tests__/
git commit -m "feat(hooks): consolidate useProfile hooks across codebase

- Update 8 components to use modern useProfile hook
- Replace @/lib/profile-context with @/hooks/use-profile-queries  
- Update component logic for new hook interface (.data access pattern)
- Maintain backward compatibility for component functionality
- Remove dependency on old ProfileProvider context

Files updated:
- components/profile/user-profile-form.tsx
- components/progress/body-metrics-chart.tsx
- contexts/workout-context.tsx
- contexts/workout-context-broken.tsx
- components/progress/check-in-form.tsx
- components/workout/workout-plan-form.tsx
- components/profile/complete-profile-banner.tsx
- __tests__/components/progress/check-in-form.test.tsx

All components now use consistent TanStack Query-based profile management."
```

---

### **PHASE 3: PROVIDER CONSOLIDATION** ⚠️ **ARCHITECTURE CLEANUP**

#### **Step 3.1: Remove Old Provider References**

**File: `components/providers/index.tsx`**
```typescript
// REMOVE THIS LINE:
// import { ProfileProvider } from "@/lib/profile-context" // DISABLED: Using ProfileQueryProvider in dashboard layout instead

// AND REMOVE ANY COMMENTED OR DISABLED REFERENCES TO ProfileProvider
```

**File: `app/(dashboard)/layout.tsx`**
```typescript
// ENSURE ProfileQueryProvider is properly included:
import { ProfileQueryProvider } from "@/components/profile/profile-query-provider"

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ProfileQueryProvider>
      {/* other providers */}
      {children}
    </ProfileQueryProvider>
  )
}
```

#### **Step 3.2: Remove Old Provider File**
```bash
# Move old provider to archive instead of deleting
mkdir -p archived-components
mv lib/profile-context.tsx archived-components/profile-context.tsx.bak

# Update any remaining references
grep -r "profile-context" --include="*.tsx" --include="*.ts" . || echo "No references found"
```

#### **Step 3.3: Commit Provider Cleanup**
```bash
git add components/providers/index.tsx app/(dashboard)/layout.tsx
git rm lib/profile-context.tsx  # This will stage the deletion
git add archived-components/profile-context.tsx.bak
git commit -m "feat(providers): complete ProfileProvider consolidation

- Remove old ProfileProvider from providers/index.tsx
- Ensure ProfileQueryProvider is active in dashboard layout
- Archive old profile-context.tsx for reference  
- Complete transition to TanStack Query-based profile management

All profile operations now use consistent modern provider architecture."
```

---

### **PHASE 4: COMPONENT ARCHITECTURE ENHANCEMENT** ⚠️ **BEST PRACTICE ALIGNMENT**

> **EVIDENCE-BASED DECISION**: Based on React's official documentation and 2024-2025 industry best practices, we are **maintaining separate components** that follow the Single Responsibility Principle rather than creating a unified component. This aligns with React's core guidance: *"A component should ideally only do one thing"*.

#### **Step 4.1: Create Shared Business Logic Layer**

**File: `hooks/use-profile-form-logic.ts`**
```typescript
/**
 * Shared Profile Form Business Logic
 * Extracted common patterns between UserProfileForm and MultiStepProfileForm
 * Maintains component separation while reducing code duplication
 */

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { UserProfile } from '@/lib/validation/profile-schemas';

interface UseProfileFormLogicProps {
  mode: 'create' | 'edit';
  onSuccess?: (profile: UserProfile) => void;
  onCancel?: () => void;
  redirectOnSuccess?: string;
  redirectOnCancel?: string;
}

export function useProfileFormLogic({
  mode,
  onSuccess,
  onCancel,
  redirectOnSuccess,
  redirectOnCancel,
}: UseProfileFormLogicProps) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSuccess = (profile: UserProfile) => {
    if (onSuccess) {
      onSuccess(profile);
    } else if (redirectOnSuccess) {
      router.push(redirectOnSuccess);
    }
  };

  const handleCancel = () => {
    if (onCancel) {
      onCancel();
    } else if (redirectOnCancel) {
      router.push(redirectOnCancel);
    }
  };

  const handleFormSubmit = async (
    submitFunction: () => Promise<UserProfile>
  ) => {
    setIsSubmitting(true);
    try {
      const profile = await submitFunction();
      handleSuccess(profile);
    } catch (error) {
      // Error handling logic
      throw error;
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    isSubmitting,
    handleSuccess,
    handleCancel,
    handleFormSubmit,
  };
}
```

#### **Step 4.2: Standardize Component Interfaces**

**File: `lib/validation/profile-form-types.ts`**
```typescript
/**
 * Standardized Profile Form Interfaces
 * Ensures consistent prop patterns across both form components
 */

import type { UserProfile } from './profile-schemas';

export interface BaseProfileFormProps {
  mode?: 'create' | 'edit';
  enableAutoSave?: boolean;
  onSuccess?: (profile: UserProfile) => void;
  onCancel?: () => void;
  redirectOnSuccess?: string;
  redirectOnCancel?: string;
}

export interface UserProfileFormProps extends BaseProfileFormProps {
  // Additional props specific to single-page edit form
  showAdvancedOptions?: boolean;
}

export interface MultiStepProfileFormProps extends BaseProfileFormProps {
  // Additional props specific to multi-step creation form
  enableOptimistic?: boolean;
  initialStep?: number;
  showProgress?: boolean;
}
```

#### **Step 4.3: Enhance UserProfileForm Component**

**Update: `components/profile/user-profile-form.tsx`**
```typescript
import { useProfileFormLogic } from '@/hooks/use-profile-form-logic';
import type { UserProfileFormProps } from '@/lib/validation/profile-form-types';

export function UserProfileForm({
  mode = 'edit',
  enableAutoSave = false,
  onSuccess,
  onCancel,
  redirectOnSuccess,
  redirectOnCancel,
  showAdvancedOptions = true,
}: UserProfileFormProps) {
  const formLogic = useProfileFormLogic({
    mode,
    onSuccess,
    onCancel,
    redirectOnSuccess,
    redirectOnCancel,
  });

  // Existing UserProfileForm implementation enhanced with shared logic
  // Maintains single responsibility: optimized for profile editing
}
```

#### **Step 4.4: Enhance MultiStepProfileForm Component**

**Update: `components/profile/multi-step-profile-form.tsx`**
```typescript
import { useProfileFormLogic } from '@/hooks/use-profile-form-logic';
import type { MultiStepProfileFormProps } from '@/lib/validation/profile-form-types';

export function MultiStepProfileForm({
  mode = 'create',
  enableAutoSave = false,
  enableOptimistic = true,
  onSuccess,
  onCancel,
  redirectOnSuccess,
  redirectOnCancel,
  initialStep = 0,
  showProgress = true,
}: MultiStepProfileFormProps) {
  const formLogic = useProfileFormLogic({
    mode,
    onSuccess,
    onCancel,
    redirectOnSuccess,
    redirectOnCancel,
  });

  // Existing MultiStepProfileForm implementation enhanced with shared logic
  // Maintains single responsibility: optimized for guided profile creation
}
```

#### **Step 4.5: Update Route Components with Enhanced Props**

**File: `app/(dashboard)/profile/page.tsx`**
```typescript
import { UserProfileForm } from "@/components/profile/user-profile-form"

export default function ProfilePage() {
  return (
    <div className="container py-10">
      <h1 className="text-3xl font-bold mb-6 text-center">Your Fitness Profile</h1>
      <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
        Update your profile to keep your workout recommendations personalized and effective.
      </p>
      <UserProfileForm 
        mode="edit" 
        enableAutoSave={true}
        onSuccess={async (profile) => {
          // Enhanced success handling
          router.push('/dashboard');
        }}
        showAdvancedOptions={true}
      />
    </div>
  )
}
```

**File: `app/(dashboard)/profile/create/page.tsx`**
```typescript
import { MultiStepProfileForm } from "@/components/profile/multi-step-profile-form"

export default function ProfileCreatePage() {
  return (
    <div className="container py-10">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold mb-4">Create Your Fitness Profile</h1>
        <p className="text-muted-foreground max-w-2xl mx-auto">
          Complete your personalized fitness profile to get AI-powered workout recommendations 
          tailored specifically to your goals, experience level, and available equipment.
        </p>
      </div>
      
      <MultiStepProfileForm 
        mode="create" 
        enableAutoSave={false}
        enableOptimistic={true}
        onSuccess={async (profile) => {
          // Enhanced success handling with cache invalidation
          await queryClient.invalidateQueries({ queryKey: ['profile'] });
          router.push('/profile');
        }}
        onCancel={() => {
          router.push('/dashboard');
        }}
        showProgress={true}
      />
    </div>
  )
}
```

#### **Step 4.6: Commit Component Enhancement**
```bash
git add hooks/use-profile-form-logic.ts lib/validation/profile-form-types.ts components/profile/ app/(dashboard)/profile/
git commit -m "feat(components): enhance profile form architecture with shared logic

- Extract shared business logic into useProfileFormLogic hook
- Standardize component interfaces across form types
- Enhance UserProfileForm with consistent prop patterns
- Enhance MultiStepProfileForm with consistent prop patterns
- Maintain component separation following Single Responsibility Principle
- Update route components to use enhanced interfaces

Benefits:
- Follows React best practices for component composition
- Reduces code duplication through shared business logic
- Maintains component focus and testability
- Enables independent optimization of creation vs editing flows
- Preserves existing component boundaries and responsibilities

Architecture follows React's guidance: 'A component should ideally only do one thing'"
```

---

### **PHASE 5: E2E TEST ALIGNMENT** ⚠️ **CRITICAL VALIDATION**

#### **Step 5.1: Analyze Current E2E Test State**

**Check test selectors and expectations:**
```bash
# Analyze profile creation test
grep -A 5 -B 5 "multi-step-form\|MultiStepProfileForm\|profile.*form" e2e/profile-creation.spec.ts

# Analyze profile editing test  
grep -A 5 -B 5 "name-input\|UserProfileForm\|profile.*form" e2e/profile-editing.spec.ts

# Check comprehensive auth flows
grep -A 5 -B 5 "profile.*form\|create.*profile\|edit.*profile" e2e/user-journeys/comprehensive-auth-flows.spec.ts
```

#### **Step 5.2: Update E2E Test Selectors**

**File: `e2e/profile-creation.spec.ts`**
```typescript
// ENSURE SELECTORS WORK WITH ENHANCED MULTISTEPPROFILEFORM
// Tests should continue working with existing selectors:

// VERIFY: await page.locator('[data-testid="multi-step-form"]')
// Tests should continue to work since MultiStepProfileForm is maintained
```

**File: `e2e/profile-editing.spec.ts`**
```typescript
// ENSURE SELECTORS WORK WITH ENHANCED USERPROFILEFORM
// Tests should continue working with existing selectors:

// VERIFY: await page.locator('[data-testid="name-input"]') // or other form elements
// Tests should continue to work since UserProfileForm is maintained
```

**File: `e2e/user-journeys/comprehensive-auth-flows.spec.ts`**
```typescript
// VERIFY AUTHENTICATION FLOWS WORK WITH ENHANCED COMPONENTS
// Ensure authentication flows continue working with enhanced component interfaces
```

#### **Step 5.3: Update E2E Auth Setup**

**File: `e2e/auth-dual.setup.ts`**
```typescript
// Verify auth setup works with enhanced component structure
// Check that existing selectors continue working with enhanced components
// Ensure both new and existing user flows work
```

**File: `e2e/auth.setup.ts`**
```typescript
// Verify auth setup works with enhanced component structure  
// Check that existing selectors continue working with enhanced components
// Ensure authentication flow works with enhanced components
```

#### **Step 5.4: E2E Test Validation**
```bash
# Run critical E2E tests to verify functionality
npm run test:e2e -- e2e/profile-creation.spec.ts --headed --reporter=list
npm run test:e2e -- e2e/profile-editing.spec.ts --headed --reporter=list
npm run test:e2e -- e2e/user-journeys/comprehensive-auth-flows.spec.ts --headed --reporter=list

# If tests fail, debug and adjust selectors as needed
```

#### **Step 5.5: Commit E2E Updates**
```bash
git add e2e/
git commit -m "feat(e2e): verify tests work with enhanced profile components

- Verify profile-creation.spec.ts works with enhanced MultiStepProfileForm
- Verify profile-editing.spec.ts works with enhanced UserProfileForm  
- Verify comprehensive-auth-flows.spec.ts works with enhanced interfaces
- Update auth setup files for enhanced component structure
- Ensure all E2E tests work with enhanced architecture

E2E tests now validate enhanced component architecture while
maintaining existing test coverage for both creation and editing flows."
```

---

### **PHASE 6: FINAL VALIDATION & CLEANUP** ⚠️ **QUALITY ASSURANCE**

#### **Step 6.1: Comprehensive Validation Script**
```bash
cat > final-validation.sh << 'EOF'
#!/bin/bash
echo "🔍 COMPREHENSIVE CONSOLIDATION VALIDATION"
echo "==========================================="

echo ""
echo "1. Hook Import Check:"
OLD_HOOKS=$(grep -r "from.*@/lib/profile-context" --include="*.tsx" --include="*.ts" . 2>/dev/null | wc -l)
NEW_HOOKS=$(grep -r "from.*@/hooks/use-profile-queries" --include="*.tsx" --include="*.ts" . 2>/dev/null | wc -l)
echo "   Old hooks remaining: $OLD_HOOKS (should be 0)"
echo "   New hooks found: $NEW_HOOKS (should be 8+)"

echo ""
echo "2. Component Architecture Check:"
SHARED_LOGIC=$(find . -name "use-profile-form-logic.ts" | wc -l)
echo "   Shared logic hook exists: $SHARED_LOGIC (should be 1)"

echo ""
echo "3. Route Component Check:"
PROFILE_PAGE=$(grep -c "UserProfileForm" app/\(dashboard\)/profile/page.tsx 2>/dev/null)
CREATE_PAGE=$(grep -c "MultiStepProfileForm" app/\(dashboard\)/profile/create/page.tsx 2>/dev/null)
echo "   Profile page uses UserProfileForm: $PROFILE_PAGE (should be 1)"
echo "   Create page uses MultiStepProfileForm: $CREATE_PAGE (should be 1)"

echo ""
echo "4. Migration Path Check:"
cd backend 2>/dev/null && node -e "
try {
  const path = require('path');
  const fs = require('fs');
  const MIGRATIONS_DIR = path.join(__dirname, '../supabase/migrations');
  const exists = fs.existsSync(MIGRATIONS_DIR);
  const count = exists ? fs.readdirSync(MIGRATIONS_DIR).length : 0;
  console.log('   Migration directory exists:', exists);
  console.log('   Migration files found:', count);
} catch(e) {
  console.log('   Migration check failed:', e.message);
}
" && cd ..

echo ""
echo "5. Provider Architecture Check:"
OLD_PROVIDER=$(grep -c "ProfileProvider" components/providers/index.tsx 2>/dev/null)
QUERY_PROVIDER=$(grep -c "ProfileQueryProvider" app/\(dashboard\)/layout.tsx 2>/dev/null)
echo "   Old ProfileProvider references: $OLD_PROVIDER (should be 0)"
echo "   ProfileQueryProvider active: $QUERY_PROVIDER (should be 1)"

echo ""
echo "6. Test File Check:"
E2E_TESTS=$(find e2e -name "*.spec.ts" | wc -l)
echo "   E2E test files found: $E2E_TESTS"

echo ""
if [ $OLD_HOOKS -eq 0 ] && [ $NEW_HOOKS -ge 8 ] && [ $SHARED_LOGIC -eq 1 ] && [ $PROFILE_PAGE -eq 1 ] && [ $CREATE_PAGE -eq 1 ] && [ $OLD_PROVIDER -eq 0 ] && [ $QUERY_PROVIDER -eq 1 ]; then
  echo "✅ CONSOLIDATION VALIDATION PASSED"
  echo "All critical components successfully consolidated!"
else
  echo "❌ CONSOLIDATION VALIDATION FAILED"
  echo "Review the checks above and fix any issues."
fi
EOF

chmod +x final-validation.sh
./final-validation.sh
```

#### **Step 6.2: Manual Testing Checklist**
```bash
# 1. Start development servers
npm run dev &
cd backend && npm run dev &

# 2. Manual test scenarios:
echo "Manual Testing Checklist:
- [ ] Navigate to /profile - UserProfileForm loads and functions
- [ ] Navigate to /profile/create - MultiStepProfileForm loads and functions  
- [ ] Edit existing profile data - updates save correctly
- [ ] Create new profile - creation flow works end-to-end
- [ ] Form validation works on both forms
- [ ] Error handling works consistently
- [ ] Auto-save functions correctly (if enabled)
- [ ] Navigation between forms works
- [ ] E2E tests pass without errors
"
```

#### **Step 6.3: Performance Verification**
```bash
# Check bundle size impact
npm run build
echo "Check bundle analyzer for profile-related imports"

# Verify no duplicate dependencies
npm run dev 2>&1 | grep -i "warn\|error" | head -10
```

#### **Step 6.4: Final Commit & Documentation**
```bash
# Commit validation tools and documentation
git add final-validation.sh consolidation-scope.md
git commit -m "docs(consolidation): add validation tools and documentation

- Add comprehensive validation script for consolidation verification
- Document consolidation scope and approach
- Provide manual testing checklist
- Enable future validation of consolidated architecture

Tools provided for ongoing verification of profile system consistency."

# Create consolidation summary
cat > CONSOLIDATION_SUMMARY.md << 'EOF'
# Profile System Consolidation Summary

## Completed Changes
- ✅ Fixed backend migration paths (2 files)
- ✅ Consolidated useProfile hooks (8 components)  
- ✅ Removed old ProfileProvider references
- ✅ Enhanced component architecture with shared business logic
- ✅ Updated route components with standardized interfaces
- ✅ Updated E2E tests for enhanced architecture
- ✅ Validated full system functionality

## Architecture Benefits
- Consistent data fetching with TanStack Query
- Shared business logic without compromising component separation
- Better error handling and loading states
- Improved test coverage and reliability
- Cleaner provider architecture
- Maintainable codebase following Single Responsibility Principle

## Files Modified
- Backend: 2 files (migration paths)
- Components: 8 files (hook updates) + 2 files (enhanced components)
- Hooks: 1 file (shared business logic)
- Validation: 1 file (standardized interfaces)
- Routes: 2 files (enhanced interfaces)
- E2E Tests: 5 files (updated selectors)
- Providers: 1 file (cleanup)

Total: 22 files modified across full-stack enhancement
EOF

git add CONSOLIDATION_SUMMARY.md
git commit -m "docs: add consolidation completion summary

Summary of all changes made during profile system consolidation.
Documents benefits, architecture improvements, and files modified."
```

---

### **PHASE 7: MERGE & DEPLOYMENT** ⚠️ **PRODUCTION READINESS**

#### **Step 7.1: Pre-Merge Validation**
```bash
# Ensure all E2E tests pass
npm run test:e2e

# Ensure build passes
npm run build

# Ensure linting passes  
npm run lint

# Run final validation
./final-validation.sh
```

#### **Step 7.2: Merge to Dev Branch**
```bash
# Switch to dev and merge feature branch
git checkout dev
git merge feature/profile-consolidation --no-ff -m "feat: enhance profile system with shared business logic

Merge feature/profile-consolidation into dev

Major Changes:
- Enhanced component architecture with shared business logic
- Consolidated useProfile hooks across all components  
- Fixed backend migration paths
- Updated E2E tests for enhanced architecture
- Cleaned up provider system

This enhancement provides:
- Consistent data management with TanStack Query
- Shared business logic following React Single Responsibility Principle
- Better error handling and loading states
- Improved maintainability
- Comprehensive test coverage

Architecture follows React best practices while maintaining component separation.
All functionality verified through E2E testing."

# Clean up feature branch
git branch -d feature/profile-consolidation
```

#### **Step 7.3: Push to Remote**
```bash
# Push consolidated dev branch
git push origin dev

# Verify GitHub reflects all changes
echo "Verify on GitHub that all consolidated changes are visible"
```

---

## **🔍 SUCCESS CRITERIA CHECKLIST**

### **✅ Technical Validation**
- [ ] All components use `@/hooks/use-profile-queries` (0 old imports remain)
- [ ] Backend migration paths point to correct directory
- [ ] Shared form logic hook exists and functions correctly
- [ ] Both `/profile` and `/profile/create` routes work with enhanced components
- [ ] E2E tests pass for all critical flows
- [ ] Build process completes without errors
- [ ] No console errors in development mode

### **✅ Functional Validation**  
- [ ] Profile creation works end-to-end
- [ ] Profile editing saves changes correctly
- [ ] Form validation works consistently  
- [ ] Error handling displays appropriate messages
- [ ] Loading states work correctly
- [ ] Auto-save functions when enabled
- [ ] Navigation between forms works smoothly

### **✅ Architecture Validation**
- [ ] Single source of truth for profile data (TanStack Query)
- [ ] Consistent error handling across all forms
- [ ] No duplicate provider systems
- [ ] Clean component interfaces following Single Responsibility Principle
- [ ] Shared business logic without component unification
- [ ] Proper separation of concerns between creation and editing flows

### **✅ Documentation & Maintenance**
- [ ] Consolidation summary document created
- [ ] Validation scripts provided for future use
- [ ] Git history shows clear progression
- [ ] All changes committed with descriptive messages
- [ ] Feature branch properly merged and cleaned up

---

## **🎯 ROLLBACK STRATEGY**

### **Complete Rollback (Nuclear Option)**
```bash
# Rollback to pre-consolidation state
git checkout dev
git reset --hard pre-consolidation-backup-$(date +%Y%m%d_%H%M%S)
git push origin dev --force-with-lease
```

### **Selective Rollback (Phase-by-Phase)**
```bash
# Rollback specific phases
git revert <commit-hash-of-phase-to-undo>
git push origin dev
```

### **Component-Level Rollback** 
```bash
# Restore specific files from backup
git checkout pre-consolidation-backup-$(date +%Y%m%d_%H%M%S) -- path/to/specific/file
git commit -m "fix: restore specific file from pre-consolidation state"
```

---

## **📋 ESTIMATED TIMELINE**

- **Phase 0**: Pre-consolidation Safety (15 minutes)
- **Phase 1**: Infrastructure Fixes (30 minutes)  
- **Phase 2**: Hook Consolidation (2 hours)
- **Phase 3**: Provider Consolidation (45 minutes)
- **Phase 4**: Component Enhancement (1.5 hours)
- **Phase 5**: E2E Test Alignment (1 hour)
- **Phase 6**: Final Validation (30 minutes)
- **Phase 7**: Merge & Deployment (15 minutes)

**Total Estimated Time: 6.25 hours**

This comprehensive plan ensures complete enhancement of the profile system following React best practices, with full traceability, validation, and rollback capabilities at every step. The approach maintains component separation while consolidating infrastructure, aligning with React's Single Responsibility Principle and modern component composition patterns.
Ran tool
This comprehensive consolidation plan addresses every aspect of the profile system enhancement based on the actual current state of your codebase and industry best practices. It provides:

1. **Complete technical scope** (22 files across 7 phases)
2. **Detailed implementation steps** with exact code changes
3. **Evidence-based architecture decisions** following React's Single Responsibility Principle
4. **Comprehensive validation** at each phase
5. **Full rollback capabilities** for risk mitigation
6. **Success criteria checklist** for verification
7. **Realistic timeline estimates** for planning

The plan is designed to be executed systematically with complete traceability and the ability to roll back any phase if issues arise. Each phase builds on the previous one and includes verification steps to ensure quality throughout the process. The approach maintains component separation while consolidating infrastructure, following React's official guidance and modern best practices for maintainable, testable, and performant code.