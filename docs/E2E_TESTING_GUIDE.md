# E2E Testing Guide for trAIner App

This guide provides comprehensive instructions for setting up and running End-to-End (E2E) tests using Docker + Local Supabase, following industry best practices.

## 🏗️ **Architecture Overview**

Our E2E testing approach leverages:
- **Local Supabase**: Production-equivalent database and auth
- **Docker**: Containerized backend for consistency
- **Playwright**: Modern E2E testing framework
- **Real Authentication**: Tests actual auth flows

## 📋 **Prerequisites**

1. **Docker Desktop** installed and running
2. **Supabase CLI** installed: `npm install -g @supabase/cli`
3. **Node.js** 18+ with npm

## 🚀 **Quick Start**

### **Option 1: Automated Setup (Recommended)**
```bash
# 1. Start local Supabase stack
npm run e2e:supabase:start

# 2. Set up E2E environment
npm run e2e:setup

# 3. Run full E2E test suite
npm run e2e:full
```

### **Option 2: Manual Setup**
```bash
# 1. Start Supabase locally
cd backend && supabase start

# 2. Create E2E environment file
cp env.e2e.template .env.e2e

# 3. Start backend in Docker
npm run docker:up

# 4. Start frontend
npm run dev

# 5. Run E2E tests
npm run e2e
```

### **Option 3: Full Docker Setup**
```bash
# Run everything in Docker
npm run e2e:docker
```

## 🔧 **Configuration**

### **Local Supabase Configuration**
The backend contains a complete Supabase configuration in `backend/supabase/config.toml`:
- **API**: Port 54321
- **Database**: Port 54322  
- **Studio**: Port 54323
- **Inbucket** (Email testing): Port 54324

### **Environment Variables**
Copy `env.e2e.template` to `.env.e2e` and update with your local Supabase credentials:
```bash
NEXT_PUBLIC_SUPABASE_URL=http://localhost:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-local-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-local-service-key
```

### **Playwright Configuration**
The `playwright.config.ts` is configured for:
- **Base URL**: http://localhost:3000
- **Automatic server startup**: Backend and frontend
- **Real authentication**: Via Supabase API
- **Screenshots and videos**: On failure
- **Parallel execution**: Optimized for CI

## 🧪 **Test Structure**

### **Authentication Helper**
`e2e/helpers/auth-helper.ts` provides:
```typescript
// API-based authentication (fast)
await signInTestUser(page);

// UI-based authentication (for testing auth flow)
await signInViaUI(page);

// Complete profile creation
await createTestUserProfile(page, profileData);

// Auth state management
await waitForAuthState(page, true);
```

### **Test Categories**
1. **Profile Management**: Multi-step form creation, validation
2. **Authentication**: Login, signup, logout flows  
3. **Responsive Design**: Mobile, tablet, desktop testing
4. **Accessibility**: Keyboard navigation, screen readers
5. **Performance**: Load times, Core Web Vitals
6. **Error Handling**: Network failures, validation errors

## 📊 **Running Tests**

### **Development Commands**
```bash
# Run tests with UI (interactive)
npm run e2e:ui

# Run in headed mode (see browser)
npm run e2e:headed

# Debug specific test
npm run e2e:debug

# View test reports
npm run e2e:report
```

### **CI/CD Commands**
```bash
# Full test suite
npm run e2e

# Docker-based testing
npm run e2e:docker:test
```

### **Specific Test Patterns**
```bash
# Run only profile tests
npx playwright test profile-management

# Run only authentication tests  
npx playwright test auth

# Run tests matching pattern
npx playwright test --grep "should complete full profile"
```

## 🔍 **Debugging**

### **Common Issues**

1. **Authentication Failures**
   ```bash
   # Check Supabase is running
   supabase status
   
   # Verify environment variables
   cat .env.e2e
   ```

2. **Port Conflicts**
   ```bash
   # Check what's running on ports
   lsof -i :3000 -i :3001 -i :54321
   
   # Kill conflicting processes
   killall node
   ```

3. **Docker Issues**
   ```bash
   # Rebuild containers
   docker-compose -f docker-compose.e2e.yml down
   docker-compose -f docker-compose.e2e.yml up --build
   ```

### **Debug Mode**
```bash
# Step through tests interactively
npm run e2e:debug

# Run with browser visible
npm run e2e:headed

# Inspect element selectors
npx playwright codegen http://localhost:3000
```

### **Logs and Artifacts**
- **Screenshots**: `test-results/` (on failure)
- **Videos**: `test-results/` (on failure)
- **Traces**: `playwright-report/` (detailed execution)
- **HTML Report**: `playwright-report/index.html`

## 🏥 **Health Checks**

### **Pre-Test Verification**
```bash
# 1. Verify Supabase is healthy
curl http://localhost:54321/health

# 2. Verify backend is responding
curl http://localhost:3001/health

# 3. Verify frontend is loading
curl http://localhost:3000

# 4. Check authentication endpoint
curl http://localhost:54321/auth/v1/settings
```

### **Database State**
```bash
# Connect to local Supabase DB
psql 'postgresql://postgres:postgres@localhost:54322/postgres'

# View auth users
SELECT email FROM auth.users;

# Check profile data
SELECT * FROM public.user_profiles;
```

## 🚀 **Best Practices**

### **Test Design**
1. **Isolation**: Each test should be independent
2. **Cleanup**: Remove test data after each test
3. **Real Data**: Use actual API calls, not mocks
4. **Deterministic**: Tests should pass consistently
5. **Fast Authentication**: Use API login, not UI

### **Performance**
1. **Parallel Execution**: Enable for faster runs
2. **Selective Testing**: Run only changed features locally
3. **Reuse Sessions**: Cache authentication when possible
4. **Optimize Waits**: Use specific element waits

### **Maintenance**
1. **Regular Updates**: Keep Playwright version current
2. **Selector Strategy**: Use data-testid attributes
3. **Page Objects**: Create reusable page components
4. **Error Messages**: Make failures informative

## 🔄 **CI/CD Integration**

### **GitHub Actions Example**
```yaml
name: E2E Tests
on: [push, pull_request]
jobs:
  e2e:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: 18
      - name: Install dependencies
        run: npm ci
      - name: Start Supabase
        run: npm run e2e:supabase:start
      - name: Run E2E tests
        run: npm run e2e
      - uses: actions/upload-artifact@v3
        if: failure()
        with:
          name: playwright-report
          path: playwright-report/
```

### **Docker Production Testing**
```bash
# Build production-like environment
docker-compose -f docker-compose.e2e.yml up --build

# Run tests against production build
docker-compose -f docker-compose.e2e.yml run playwright-e2e
```

## 📈 **Monitoring and Metrics**

### **Test Metrics**
- **Pass Rate**: Target >95%
- **Execution Time**: Target <5 minutes
- **Flakiness**: Target <2%
- **Coverage**: Critical user paths 100%

### **Performance Metrics**
- **Page Load**: <3 seconds
- **Time to Interactive**: <5 seconds
- **Authentication**: <2 seconds
- **Form Submission**: <3 seconds

## 🆘 **Troubleshooting**

### **Common Error Messages**

**"Connection refused"**
```bash
# Solution: Start required services
npm run e2e:supabase:start
npm run docker:up
```

**"Element not found"**
```bash
# Solution: Check test IDs exist in components
npx playwright codegen http://localhost:3000/profile/create
```

**"Authentication failed"**
```bash
# Solution: Verify Supabase credentials
supabase status
cat .env.e2e
```

**"Timeout waiting for element"**
```bash
# Solution: Increase timeout or check loading states
await page.waitForSelector('[data-testid="element"]', { timeout: 10000 });
```

For additional support, refer to:
- [Playwright Documentation](https://playwright.dev/docs)
- [Supabase Local Development](https://supabase.com/docs/guides/local-development)
- [Docker Compose Guide](https://docs.docker.com/compose/)

---

## 🎯 **Next Steps**

1. Run the setup commands to initialize your E2E environment
2. Verify all services start correctly
3. Run a single test to validate the setup
4. Add more test coverage for your specific user flows
5. Integrate with your CI/CD pipeline
