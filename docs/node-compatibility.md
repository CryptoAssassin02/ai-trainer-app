# Node.js Compatibility Utilities

This document describes the Node.js version checking utilities implemented in this project to ensure that the application runs in a compatible environment.

## Minimum Requirements

The application requires Node.js version `18.17.0` or higher to run properly. This requirement is defined in the `utils/node/version.ts` file as `MIN_NODE_VERSION`.

## Available Utilities

### 1. Version Utilities (`utils/node/version.ts`)

These utilities provide functions for checking the Node.js version:

- **isNodeInstalled()**: Checks if Node.js is installed on the system
- **getNodeVersion()**: Gets the current Node.js version
- **compareVersions(version1, version2)**: Compares two semantic version strings
- **meetsVersionRequirement(minVersion)**: Checks if the installed Node.js version meets the minimum required version
- **checkNodeVersion()**: Performs a comprehensive check and returns detailed status

Example usage:

```typescript
import { checkNodeVersion } from './utils/node/version';

async function checkSystem() {
  const nodeStatus = await checkNodeVersion();
  
  if (!nodeStatus.installed) {
    console.error('Node.js is not installed');
    return;
  }
  
  if (!nodeStatus.meetsRequirement) {
    console.error(`Node.js version ${nodeStatus.version} is too old. Minimum required: ${nodeStatus.requiredVersion}`);
    return;
  }
  
  console.log(`Node.js version ${nodeStatus.version} is compatible`);
}
```

### 2. Environment Utilities (`utils/node/environment.ts`)

These utilities provide higher-level functions for checking the Node.js environment:

- **checkEnvironment()**: Checks if the current Node.js environment is compatible with the application
- **getEnvironmentStatusMessage()**: Returns a formatted message about the environment status

The environment check returns one of the following statuses:
- `COMPATIBLE`: The Node.js version is compatible
- `NODE_NOT_INSTALLED`: Node.js is not installed
- `VERSION_TOO_LOW`: The installed Node.js version is below the required minimum
- `UNKNOWN`: An error occurred during the check

Example usage:

```typescript
import { getEnvironmentStatusMessage } from './utils/node/environment';

async function displayEnvironmentStatus() {
  const message = await getEnvironmentStatusMessage();
  console.log(message);
}
```

## CLI Script

A command-line script is available to check the Node.js version before running the application. The script is located at `scripts/check-node-version.js`.

You can run it directly:

```bash
node scripts/check-node-version.js
```

Or using the npm script:

```bash
npm run check-node
```

The script will:
- Check if Node.js is installed
- Check if the installed version meets the minimum requirements
- Display a colored message about the compatibility status
- Exit with code 0 if compatible, 1 otherwise

## Automatic Checks

The Node.js version is automatically checked before running the development server or building the application, as configured in `package.json`:

```json
"scripts": {
  "predev": "npm run check-node",
  "prebuild": "npm run check-node"
}
```

This ensures that the application is always run in a compatible environment.

## Testing

The utilities are tested using Vitest:

- `__tests__/utils/node/version.test.ts`: Tests for the version comparison function
- `__tests__/utils/node/environment.test.ts`: Tests for the environment utilities

To run the tests:

```bash
npx vitest run __tests__/utils/node
``` 