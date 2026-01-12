#!/bin/bash
echo "🔍 COMPREHENSIVE CONSOLIDATION VALIDATION"
echo "==========================================="

echo ""
echo "1. Hook Import Check (excluding test files):"
OLD_HOOKS=$(grep -r "from.*@/lib/profile-context" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v "__tests__" | wc -l)
NEW_HOOKS=$(grep -r "from.*@/hooks/use-profile-queries" --include="*.tsx" --include="*.ts" . 2>/dev/null | grep -v "__tests__" | wc -l)
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
echo "   Profile page uses UserProfileForm: $PROFILE_PAGE (should be 2: import + usage)"
echo "   Create page uses MultiStepProfileForm: $CREATE_PAGE (should be 2: import + usage)"

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
if [ $OLD_HOOKS -eq 0 ] && [ $NEW_HOOKS -ge 8 ] && [ $SHARED_LOGIC -eq 1 ] && [ $PROFILE_PAGE -eq 2 ] && [ $CREATE_PAGE -eq 2 ] && [ $OLD_PROVIDER -eq 0 ] && [ $QUERY_PROVIDER -ge 1 ]; then
  echo "✅ CONSOLIDATION VALIDATION PASSED"
  echo "All critical components successfully consolidated!"
else
  echo "❌ CONSOLIDATION VALIDATION FAILED"
  echo "Review the checks above and fix any issues."
fi
