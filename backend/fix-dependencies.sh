#!/bin/sh
# Comprehensive dependency fixer for Docker environment
# This script automatically detects and installs all required modules

echo "🔍 Scanning project for dependencies..."

# Find all JS files in the project
find_output=$(find . -type f -name "*.js" ! -path "./node_modules/*" ! -path "./coverage/*")

# Extract all requires using more reliable approach
echo "⚙️ Extracting required modules..."
temp_requires=$(mktemp)

for file in $find_output; do
  # Look for require statements, skipping comments
  grep -o "require(['\"][^\.][^'\"]*['\"])" "$file" | \
    sed -E "s/require\(['\"]([^'\"]*)['\"].*/\1/" >> "$temp_requires"
done

echo "🔄 Processing module list..."
# Get unique module names (first segment before any /)
sort "$temp_requires" | uniq | \
  sed -E 's/(.+)\/.*/\1/' | \
  sort | uniq > "${temp_requires}.unique"

# List of built-in Node.js modules to skip
NODE_BUILTINS="assert async_hooks buffer child_process cluster console constants crypto dns domain events fs http http2 https inspector module net os path perf_hooks process punycode querystring readline repl stream string_decoder sys timers tls trace_events tty url util v8 vm wasi worker_threads zlib"

# Get list of modules from package.json
installed_deps=$(node -e "
  try {
    const pkg = require('./package.json');
    const deps = Object.keys(pkg.dependencies || {}).concat(Object.keys(pkg.devDependencies || {}));
    console.log(deps.join('\n'));
  } catch (err) {
    console.error('Error reading package.json');
    process.exit(1);
  }
")

# Extract modules that need to be installed
missing_modules=""
while read -r module; do
  # Skip empty lines
  if [ -z "$module" ]; then
    continue
  fi
  
  # Skip Node.js built-in modules
  if echo "$NODE_BUILTINS" | grep -q -w "$module"; then
    continue
  fi
  
  # Skip modules with @ in the name (we handle these differently)
  if echo "$module" | grep -q "@"; then
    # This is a special case for modules like @types/node
    base_module=$(echo "$module" | sed -E 's/@([^/]+).*/\1/')
    if ! echo "$installed_deps" | grep -q -w "$base_module"; then
      missing_modules="$missing_modules $module"
    fi
    continue
  fi
  
  # Check if the module is already installed
  if ! echo "$installed_deps" | grep -q -w "$module"; then
    missing_modules="$missing_modules $module"
  fi
done < "${temp_requires}.unique"

# Clean up temp files
rm -f "$temp_requires" "${temp_requires}.unique"

# Install missing modules
if [ -n "$missing_modules" ]; then
  echo "🚀 Installing missing modules: $missing_modules"
  npm install $missing_modules --save
  
  if [ $? -eq 0 ]; then
    echo "✅ Successfully installed all missing modules!"
  else
    echo "❌ Some modules failed to install. Please check npm error messages."
    exit 1
  fi
else
  echo "✅ All required modules are already installed."
fi

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
  echo "📄 Creating .env file from .env.example..."
  if [ -f .env.example ]; then
    cp .env.example .env
    echo "✅ Created .env file from template."
  else
    echo "⚠️ No .env.example found to create .env from."
  fi
fi

echo "🎉 Dependency check and setup complete!" 