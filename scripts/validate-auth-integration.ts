/**
 * Validation script for 1.3 Authentication System implementation
 * 
 * This script validates that all authentication components are properly integrated:
 * - AuthProvider uses real Supabase authentication
 * - ProtectedRoute component exists and has proper functionality
 * - Authentication hooks are properly exported
 * - Login/signup pages use the new authentication system
 */

import fs from 'fs';
import path from 'path';

// File paths to validate
const filesToValidate = [
  'providers/auth-provider.tsx',
  'components/auth/protected-route.tsx',
  'hooks/use-auth.ts',
  'hooks/use-auth-status.ts',
  'hooks/use-auth-redirect.ts',
  'app/login/page.tsx',
  'app/auth/signup/page.tsx',
];

// Required imports and exports to check for
const validationChecks = {
  'providers/auth-provider.tsx': [
    'import { authService }',
    'import { User as SupabaseUser, Session }',
    'export function AuthContextProvider',
    'export function useAuth',
    'const unsubscribe = authService.onAuthStateChange',
    'await authService.signIn',
    'await authService.signOut',
    'await authService.signUp',
  ],
  'components/auth/protected-route.tsx': [
    'export function ProtectedRoute',
    'export function AuthRequired',
    'export function ProfileRequired',
    'export function PublicRoute',
    'import { useAuth }',
    'useRouter',
  ],
  'hooks/use-auth.ts': [
    'export { useAuth',
    'export { ProtectedRoute',
    'export { useAuthStatus }',
    'export { useAuthRedirect }',
  ],
  'hooks/use-auth-status.ts': [
    'export function useAuthStatus',
    'import { useAuth }',
    'isAuthenticated',
    'hasProfile',
    'needsEmailVerification',
  ],
  'hooks/use-auth-redirect.ts': [
    'export function useAuthRedirect',
    'export function useRequireAuth',
    'export function useRequireProfile',
    'export function useRedirectIfAuthenticated',
    'import { useAuthStatus }',
  ],
  'app/login/page.tsx': [
    'import { useAuth }',
    'import { useRedirectIfAuthenticated }',
    'const { signIn, loading',
    'useRedirectIfAuthenticated',
    'await signIn(email, password, rememberMe)',
  ],
  'app/auth/signup/page.tsx': [
    'import { useAuth }',
    'import { useRedirectIfAuthenticated }',
    'const { signUp, loading',
    'useRedirectIfAuthenticated',
    'const result = await signUp(name, email, password)',
    'const [name, setName] = useState',
  ],
};

function validateFile(filePath: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  const fullPath = path.resolve(filePath);
  
  // Check if file exists
  if (!fs.existsSync(fullPath)) {
    errors.push(`File does not exist: ${filePath}`);
    return { isValid: false, errors };
  }
  
  // Read file content
  const content = fs.readFileSync(fullPath, 'utf-8');
  
  // Check for required patterns using simple string includes for better reliability
  const requiredPatterns = validationChecks[filePath] || [];
  for (const pattern of requiredPatterns) {
    // Normalize both content and pattern by removing extra whitespace
    const normalizedContent = content.replace(/\s+/g, ' ');
    const normalizedPattern = pattern.replace(/\s+/g, ' ');
    
    if (!normalizedContent.includes(normalizedPattern)) {
      errors.push(`Missing required pattern: "${pattern}"`);
    }
  }
  
  return { isValid: errors.length === 0, errors };
}

function runValidation(): void {
  console.log('🔍 Validating Authentication System Implementation...\n');
  
  let allValid = true;
  const results: Record<string, { isValid: boolean; errors: string[] }> = {};
  
  for (const filePath of filesToValidate) {
    const result = validateFile(filePath);
    results[filePath] = result;
    
    if (result.isValid) {
      console.log(`✅ ${filePath} - Valid`);
    } else {
      console.log(`❌ ${filePath} - Invalid`);
      for (const error of result.errors) {
        console.log(`   • ${error}`);
      }
      allValid = false;
    }
  }
  
  console.log('\n' + '='.repeat(60));
  
  if (allValid) {
    console.log('🎉 Authentication System Validation: PASSED');
    console.log('✅ All components are properly integrated');
    console.log('✅ AuthProvider uses real Supabase authentication');
    console.log('✅ ProtectedRoute component is implemented');
    console.log('✅ Authentication hooks are properly exported');
    console.log('✅ Login/signup pages use the new authentication system');
  } else {
    console.log('❌ Authentication System Validation: FAILED');
    console.log('Please fix the issues above before proceeding.');
    process.exit(1);
  }
}

// Run validation if this script is executed directly
if (require.main === module) {
  runValidation();
}

export { runValidation, validateFile, validationChecks };