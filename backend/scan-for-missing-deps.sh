#!/bin/sh
# This script scans the codebase for require statements
# and checks if the corresponding packages are in package.json
# If not, it installs them automatically

echo "Scanning codebase for required modules..."

# Create a temporary file to store all requires
TEMP_FILE=$(mktemp)

# Find all require statements excluding node built-ins and relative paths
find . -type f -name "*.js" | xargs grep -h "require(" 2>/dev/null | grep -v "^\s*\/\/" | \
  grep -o "require(['\"][^\.][^'\"]*['\"])" | \
  sed -E "s/require\(['\"]([^'\"]*)['\"].*/\1/" | \
  sort | uniq > "$TEMP_FILE"

echo "Found $(wc -l < "$TEMP_FILE") unique module requires"

# Get a list of dependencies from package.json
DEPENDENCIES=$(node -e "const pkg = require('./package.json'); console.log(Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {})).join('\n'))")

# Check each required module against the dependencies
MISSING=""
while read -r MODULE; do
  # Extract the base package name (e.g., extract 'express' from 'express/lib/router')
  BASE_MODULE=$(echo "$MODULE" | cut -d'/' -f1)
  
  # Skip built-in Node.js modules
  if echo "$BASE_MODULE" | grep -qE "^(fs|path|http|https|util|crypto|os|stream|zlib|buffer|url|querystring|events|assert|net|dns|domain|dgram|child_process|cluster|module|process|readline|repl|tls|tty|vm)$"; then
    continue
  fi
  
  # Check if the module is in dependencies
  if ! echo "$DEPENDENCIES" | grep -q "^$BASE_MODULE$"; then
    MISSING="$MISSING $BASE_MODULE"
  fi
done < "$TEMP_FILE"

# Remove temp file
rm "$TEMP_FILE"

# If we found missing dependencies, install them
if [ -n "$MISSING" ]; then
  echo "Found missing dependencies: $MISSING"
  echo "Installing missing dependencies..."
  
  for MODULE in $MISSING; do
    echo "Installing $MODULE..."
    npm install "$MODULE" --save
  done
  
  echo "All missing dependencies have been installed!"
else
  echo "No missing dependencies found!"
fi 