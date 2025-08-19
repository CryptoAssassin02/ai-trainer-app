Based on my thorough investigation using current documentation and best practices, here's my comprehensive recommendation for resolving the E2E test issues:

## 📋 Recommended Approach

### **The Core Problem**
You have **two competing data management systems** that don't communicate:
1. **Multi-step form** (`/profile/create`) → Uses React Query hooks
2. **UserProfileForm** (`/profile`) → Uses ProfileContext

When the multi-step form saves data, the UserProfileForm can't see it because they use different data sources.

### **Recommended Solution: Unified React Query Approach**

Based on TanStack Query best practices and Supabase integration patterns, I recommend:

#### **1. Standardize on React Query for All Profile Operations**

React Query is the modern, recommended approach for server state management with Supabase. Here's the implementation plan:

```typescript
// Step 1: Fix the multi-step form's mutation to properly invalidate cache
// In components/profile/multi-step-profile-form.tsx
const onSubmit = async (data: FormData) => {
  try {
    await updateProfile(data as any);
    
    // Critical: Invalidate and refetch profile data after successful update
    await queryClient.invalidateQueries({ 
      queryKey: ['profile'], 
      refetchType: 'active' 
    });
    
    setSubmitSuccess(true);
    onSuccess?.(data);
  } catch (error) {
    console.error('Form submission error:', error);
    setSubmitSuccess(false);
  }
};
```

#### **2. Wrap the App with ProfileQueryProvider**

The `ProfileQueryProvider` should wrap both pages to ensure data synchronization:

```typescript
// In app/(dashboard)/layout.tsx
import { ProfileQueryProvider } from '@/components/profile/profile-query-provider';

export default function DashboardLayout({ children }) {
  return (
    <ProfileQueryProvider>
      {children}
    </ProfileQueryProvider>
  );
}
```

#### **3. Update UserProfileForm to Use React Query**

The UserProfileForm should use the same React Query hooks:

```typescript
// In components/profile/user-profile-form.tsx
import { useProfileQueryContext } from '@/components/profile/profile-query-provider';

export function UserProfileForm() {
  const { 
    profile, 
    updateProfile, 
    isLoading, 
    error,
    refetch 
  } = useProfileQueryContext();
  
  // Use effect to refetch on mount to ensure fresh data
  useEffect(() => {
    refetch();
  }, [refetch]);
  
  // Rest of the component...
}
```

#### **4. Implement Proper Cache Invalidation**

According to TanStack Query documentation, after mutations you should:

```typescript
// In hooks/use-profile-queries.ts
export function useProfileMutation(options?: {
  onSuccess?: (data: UserProfile) => void;
  onError?: (error: Error) => void;
}) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: async (data: UpdateProfileRequest) => {
      const response = await profileService.updateProfile(data);
      return response;
    },
    onSuccess: async (data, variables) => {
      // Update the cache immediately
      queryClient.setQueryData(['profile'], data);
      
      // Then invalidate to ensure consistency
      await queryClient.invalidateQueries({ 
        queryKey: ['profile'],
        exact: false // This will invalidate all profile-related queries
      });
      
      options?.onSuccess?.(data);
    }
  });
}
```

### **Immediate Actions to Fix the Test**

1. **Add missing synchronization after profile creation:**

```typescript
// In app/(dashboard)/profile/create/page.tsx
<MultiStepProfileForm 
  mode="create"
  onSuccess={async (profile) => {
    // Ensure cache is updated before redirect
    await queryClient.invalidateQueries({ queryKey: ['profile'] });
    // Small delay to ensure cache propagation
    await new Promise(resolve => setTimeout(resolve, 100));
    router.push('/profile');
  }}
/>
```

2. **Update the test to wait for profile data:**

```typescript
// In e2e/user-profile-management-comprehensive.spec.ts
// After redirect, wait for profile data to be loaded
await page.waitForURL('**/profile');
await page.waitForTimeout(500); // Allow React Query to refetch
await page.waitForSelector(`text=${COMPLETE_PROFILE_DATA.personal.name}`, { 
  timeout: 10000 
});
```

3. **Verify Supabase is actually saving the data:**

```typescript
// Add debugging in multi-step form
const onSubmit = async (data: FormData) => {
  console.log('Submitting profile data:', data);
  const result = await updateProfile(data);
  console.log('Profile saved:', result);
  
  // Verify it's in the database
  const { data: savedProfile } = await supabase
    .from('user_profiles')
    .select('*')
    .single();
  console.log('Verified in database:', savedProfile);
};
```

### **Why This Approach Is Best**

1. **Single Source of Truth**: React Query manages all profile state
2. **Automatic Synchronization**: Cache invalidation ensures data consistency
3. **Better Performance**: Built-in caching reduces unnecessary API calls
4. **Industry Standard**: TanStack Query is the recommended approach for Supabase
5. **Type Safety**: Full TypeScript support with proper types
6. **Optimistic Updates**: Can show UI updates immediately while saving

### **Testing the Fix**

After implementing these changes:

1. Clear your browser cache and local storage
2. Run the E2E test with debugging:
   ```bash
   npx playwright test user-profile-management-comprehensive.spec.ts:139:7 --headed --slowmo=500
   ```
3. Watch for:
   - Profile data being saved after form submission
   - Successful redirect to `/profile`
   - Profile data appearing in the UserProfileForm

### **Alternative Quick Fix (Not Recommended)**

If you need a quick workaround without refactoring:

```typescript
// In lib/profile-context.tsx ProfileProvider
// Add a manual refetch on route change
useEffect(() => {
  const handleRouteChange = () => {
    fetchUserProfile(); // Re-fetch when route changes
  };
  
  window.addEventListener('popstate', handleRouteChange);
  return () => window.removeEventListener('popstate', handleRouteChange);
}, []);
```

But this is a band-aid solution. The proper fix is to unify the data management system.

### **Summary**

The test is failing because of an **architecture mismatch**, not a test problem. You need to:
1. Choose one data management system (React Query recommended)
2. Ensure proper cache invalidation after mutations
3. Wrap both pages with the same provider
4. Add proper error handling and loading states

This aligns with current best practices from both TanStack Query (v5) and Supabase documentation for August 2025.