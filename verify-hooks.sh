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
