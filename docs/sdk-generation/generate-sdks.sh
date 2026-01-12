#!/bin/bash

# SDK Generation Script for trAIner API
# This script generates client SDKs for multiple programming languages

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
OPENAPI_GENERATOR_VERSION="7.2.0"
OPENAPI_SPEC="../openapi.yaml"
OUTPUT_BASE_DIR="./generated-sdks"
CUSTOM_TEMPLATES_DIR="./custom-templates"

# Ensure OpenAPI Generator CLI is available
if ! command -v openapi-generator-cli &> /dev/null; then
    echo -e "${YELLOW}OpenAPI Generator CLI not found. Installing...${NC}"
    npm install -g @openapitools/openapi-generator-cli@$OPENAPI_GENERATOR_VERSION
fi

# Validate OpenAPI spec
echo -e "${YELLOW}Validating OpenAPI specification...${NC}"
if openapi-generator-cli validate -i "$OPENAPI_SPEC"; then
    echo -e "${GREEN}✓ OpenAPI specification is valid${NC}"
else
    echo -e "${RED}✗ OpenAPI specification validation failed${NC}"
    exit 1
fi

# Create output directory
mkdir -p "$OUTPUT_BASE_DIR"

# Function to generate SDK for a specific language
generate_sdk() {
    local LANGUAGE=$1
    local GENERATOR=$2
    local OUTPUT_DIR="$OUTPUT_BASE_DIR/$LANGUAGE"
    
    echo -e "\n${YELLOW}Generating $LANGUAGE SDK...${NC}"
    
    # Create language-specific output directory
    mkdir -p "$OUTPUT_DIR"
    
    # Generate SDK
    if openapi-generator-cli generate \
        -i "$OPENAPI_SPEC" \
        -g "$GENERATOR" \
        -o "$OUTPUT_DIR" \
        --config "./configs/${LANGUAGE}.yaml" \
        --template-dir "$CUSTOM_TEMPLATES_DIR/$LANGUAGE" 2>/dev/null || \
       openapi-generator-cli generate \
        -i "$OPENAPI_SPEC" \
        -g "$GENERATOR" \
        -o "$OUTPUT_DIR" \
        --config "./configs/${LANGUAGE}.yaml"; then
        
        echo -e "${GREEN}✓ $LANGUAGE SDK generated successfully${NC}"
        
        # Run language-specific post-processing
        if [ -f "./post-process/${LANGUAGE}.sh" ]; then
            echo -e "${YELLOW}  Running post-processing for $LANGUAGE...${NC}"
            bash "./post-process/${LANGUAGE}.sh" "$OUTPUT_DIR"
        fi
        
        # Generate SDK documentation
        if [ -f "$OUTPUT_DIR/README.md" ]; then
            echo -e "${GREEN}  ✓ Documentation generated${NC}"
        fi
        
        return 0
    else
        echo -e "${RED}✗ Failed to generate $LANGUAGE SDK${NC}"
        return 1
    fi
}

# Generate SDKs for all configured languages
echo -e "${YELLOW}Starting SDK generation for all languages...${NC}"

# TypeScript/JavaScript
generate_sdk "typescript" "typescript-axios"

# Python
generate_sdk "python" "python"

# Java
generate_sdk "java" "java"

# C#
generate_sdk "csharp" "csharp-netcore"

# Ruby
generate_sdk "ruby" "ruby"

# Go
generate_sdk "go" "go"

# PHP
generate_sdk "php" "php"

# Swift (iOS)
generate_sdk "swift" "swift5"

# Kotlin (Android)
generate_sdk "kotlin" "kotlin"

# Generate SDK comparison matrix
echo -e "\n${YELLOW}Generating SDK feature comparison matrix...${NC}"
cat > "$OUTPUT_BASE_DIR/SDK_COMPARISON.md" << EOF
# SDK Feature Comparison Matrix

| Feature | TypeScript | Python | Java | C# | Ruby | Go | PHP | Swift | Kotlin |
|---------|------------|--------|------|----|------|----|-----|-------|--------|
| Async Support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Type Safety | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ❌ | ✅ | ✅ |
| Auto-retry | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Rate Limit Handling | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Streaming Support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ❌ | ✅ | ✅ |
| File Upload | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Custom Headers | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
| Middleware Support | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |
EOF

echo -e "${GREEN}✓ SDK comparison matrix generated${NC}"

# Generate consolidated README
echo -e "\n${YELLOW}Generating consolidated SDK documentation...${NC}"
cat > "$OUTPUT_BASE_DIR/README.md" << EOF
# trAIner API Client SDKs

This directory contains auto-generated client SDKs for the trAIner API in multiple programming languages.

## Available SDKs

- **TypeScript/JavaScript**: Modern TypeScript client with full type safety
- **Python**: Async-first Python client with type hints
- **Java**: Java 8+ client with OkHttp and Gson
- **C#**: .NET 6+ client with async/await support
- **Ruby**: Ruby client with intuitive API design
- **Go**: Idiomatic Go client with struct-based models
- **PHP**: PHP 7.4+ client with PSR compliance
- **Swift**: iOS-optimized Swift 5 client
- **Kotlin**: Android-optimized Kotlin client

## Installation

### TypeScript/JavaScript
\`\`\`bash
npm install @trainerapp/api-client
\`\`\`

### Python
\`\`\`bash
pip install trainerapp-client
\`\`\`

### Java
\`\`\`xml
<dependency>
    <groupId>com.trainerapp</groupId>
    <artifactId>trainerapp-java-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
\`\`\`

### C#
\`\`\`bash
dotnet add package TrainerApp.Client
\`\`\`

### Ruby
\`\`\`bash
gem install trainerapp
\`\`\`

### Go
\`\`\`bash
go get github.com/trainerapp/go-sdk
\`\`\`

### PHP
\`\`\`bash
composer require trainerapp/php-sdk
\`\`\`

## Quick Start

See language-specific README files in each SDK directory for detailed usage examples.

## Support

For issues or questions about the SDKs, please visit:
- Documentation: https://docs.trainer-app.com/sdks
- GitHub Issues: https://github.com/trainerapp/api-sdks/issues
- Developer Forum: https://forum.trainer-app.com/sdks
EOF

echo -e "${GREEN}✓ Consolidated documentation generated${NC}"

# Summary
echo -e "\n${GREEN}SDK generation completed!${NC}"
echo -e "Generated SDKs are available in: ${YELLOW}$OUTPUT_BASE_DIR${NC}"
echo -e "\nNext steps:"
echo -e "1. Review generated SDKs in each language directory"
echo -e "2. Run language-specific tests"
echo -e "3. Publish SDKs to respective package managers"
echo -e "4. Update documentation with SDK examples" 