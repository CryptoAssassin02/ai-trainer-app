# Getting Started with trAIner Frontend Integration

## Overview

This guide provides everything you need to quickly integrate with the trAIner AI Fitness App backend. Follow these steps to set up your development environment, configure authentication, and make your first API calls.

**Estimated Setup Time**: 30-60 minutes  
**Prerequisites**: Basic React/JavaScript knowledge, Node.js 18+  
**Target Outcome**: Working authentication and first API integration

---

## 📋 Prerequisites

### Required Knowledge
- JavaScript/TypeScript fundamentals
- React 18+ development experience  
- HTTP client usage (fetch, axios)
- JWT token concepts
- Environment variable management

### Required Tools
- **Node.js 18+** and npm/yarn
- **Modern browser** with developer tools
- **Text editor/IDE** (VS Code recommended)
- **API testing tool** (Postman, Insomnia, or browser dev tools)

### Recommended Experience
- State management (Context API, Redux, Zustand)
- Error boundary implementation
- Async/await patterns
- RESTful API integration

---

## 🚀 Quick Setup (5 Minutes)

### Step 1: Environment Configuration

Create your environment variables file:

```bash
# .env.local (for Next.js) or .env (for Create React App)
REACT_APP_API_URL=http://localhost:8000/v1
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=1.0.0
```

**Production URLs**:
- **Production API**: `https://api.trainer-app.com/v1`
- **Staging API**: `https://staging-api.trainer-app.com/v1`
- **Local Development**: `http://localhost:8000/v1`

### Step 2: Install Dependencies

```bash
# Core HTTP client (choose one)
npm install axios
# OR
npm install fetch-interceptor

# Authentication (if using Supabase directly)
npm install @supabase/supabase-js

# State management (choose one)
npm install zustand
# OR  
npm install @tanstack/react-query

# UI components (recommended)
npm install @shadcn/ui
npm install tailwindcss
```

### Step 3: Basic API Client Setup

```javascript
// lib/api-client.js
const API_CONFIG = {
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:8000/v1',
  timeout: 30000, // 30s for AI operations
  headers: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  }
};

// AI Operation Timeouts (AI operations take longer)
export const AI_TIMEOUTS = {
  workoutGeneration: 45000,    // 45s - Complex AI planning
  workoutAdjustment: 30000,    // 30s - Plan modifications  
  nutritionPlanning: 40000,    // 40s - Dietary calculations
  analyticsInsights: 35000,    // 35s - Data analysis
  standardOperations: 15000    // 15s - CRUD operations
};

export default API_CONFIG;
```

---

## 🔐 Authentication Setup

### Step 1: Authentication Functions

```javascript
// lib/auth.js
import API_CONFIG from './api-client.js';

// User Registration
export const signupUser = async (userData) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/signup`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({
        name: userData.name,
        email: userData.email,
        password: userData.password
      })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Signup failed');
    }
    
    const data = await response.json();
    
    // Store user ID for profile setup
    localStorage.setItem('tempUserId', data.userId);
    
    return {
      userId: data.userId,
      message: data.message,
      requiresEmailVerification: true
    };
  } catch (error) {
    throw new Error(`Signup error: ${error.message}`);
  }
};

// User Login with Token Management
export const loginUser = async (email, password, rememberMe = false) => {
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/login`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ email, password, rememberMe })
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      
      // Handle specific auth errors
      if (response.status === 429) {
        throw new Error('Too many login attempts. Please try again later.');
      }
      if (response.status === 401) {
        throw new Error('Invalid email or password.');
      }
      
      throw new Error(errorData.message || 'Login failed');
    }
    
    const data = await response.json();
    
    // Store authentication tokens
    localStorage.setItem('jwtToken', data.jwtToken);
    localStorage.setItem('userId', data.userId);
    
    // Store refresh token if remember me is enabled
    if (data.refreshToken) {
      localStorage.setItem('refreshToken', data.refreshToken);
    }
    
    return {
      userId: data.userId,
      jwtToken: data.jwtToken,
      user: data.user
    };
  } catch (error) {
    throw new Error(`Login error: ${error.message}`);
  }
};

// JWT Token Refresh
export const refreshToken = async () => {
  const refreshToken = localStorage.getItem('refreshToken');
  
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  
  try {
    const response = await fetch(`${API_CONFIG.baseURL}/auth/refresh`, {
      method: 'POST',
      headers: API_CONFIG.headers,
      body: JSON.stringify({ refreshToken })
    });
    
    if (!response.ok) {
      // Refresh token expired - logout user
      localStorage.clear();
      window.location.href = '/login';
      return;
    }
    
    const data = await response.json();
    
    // Update stored tokens
    localStorage.setItem('jwtToken', data.jwtToken);
    
    return data.jwtToken;
  } catch (error) {
    console.error('Token refresh failed:', error);
    localStorage.clear();
    window.location.href = '/login';
  }
};
```

### Step 2: Authenticated API Client

```javascript
// lib/authenticated-client.js
import API_CONFIG from './api-client.js';
import { refreshToken } from './auth.js';

class AuthenticatedAPIClient {
  constructor() {
    this.baseURL = API_CONFIG.baseURL;
  }
  
  // Get token with automatic refresh
  async getToken() {
    let token = localStorage.getItem('jwtToken');
    
    if (!token) {
      throw new Error('No authentication token found');
    }
    
    // Check if token is about to expire (basic check)
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const now = Date.now() / 1000;
      
      // Refresh if expires in next 5 minutes
      if (payload.exp - now < 300) {
        token = await refreshToken();
      }
    } catch (error) {
      console.warn('Token parsing failed, attempting refresh');
      token = await refreshToken();
    }
    
    return token;
  }
  
  // Authenticated request method
  async request(endpoint, options = {}) {
    const token = await this.getToken();
    
    const config = {
      ...options,
      headers: {
        ...API_CONFIG.headers,
        'Authorization': `Bearer ${token}`,
        ...options.headers
      }
    };
    
    const response = await fetch(`${this.baseURL}${endpoint}`, config);
    
    if (!response.ok) {
      if (response.status === 401) {
        // Token invalid, try refresh once
        try {
          const newToken = await refreshToken();
          config.headers['Authorization'] = `Bearer ${newToken}`;
          const retryResponse = await fetch(`${this.baseURL}${endpoint}`, config);
          return retryResponse.json();
        } catch (refreshError) {
          localStorage.clear();
          window.location.href = '/login';
          return;
        }
      }
      
      const errorData = await response.json();
      throw new Error(errorData.message || 'Request failed');
    }
    
    return response.json();
  }
  
  // Convenience methods
  async get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }
  
  async post(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'POST',
      body: JSON.stringify(data)
    });
  }
  
  async put(endpoint, data, options = {}) {
    return this.request(endpoint, {
      ...options,
      method: 'PUT',
      body: JSON.stringify(data)
    });
  }
  
  async delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export default new AuthenticatedAPIClient();
```

---

## 🎯 First Integration Test

### Test Authentication Flow

```javascript
// test-integration.js
import { signupUser, loginUser } from './lib/auth.js';
import apiClient from './lib/authenticated-client.js';

async function testIntegration() {
  try {
    console.log('🚀 Testing trAIner API Integration...');
    
    // Test 1: Health Check
    console.log('1. Testing API health...');
    const response = await fetch(`${process.env.REACT_APP_API_URL}/health`);
    const health = await response.json();
    console.log('✅ API Health:', health.status);
    
    // Test 2: Authentication (you'll need test credentials)
    console.log('2. Testing authentication...');
    const loginResult = await loginUser('test@example.com', 'your-test-password');
    console.log('✅ Login successful:', loginResult.userId);
    
    // Test 3: Authenticated Request
    console.log('3. Testing authenticated request...');
    const profile = await apiClient.get('/profile');
    console.log('✅ Profile loaded:', profile ? 'Success' : 'No profile found');
    
    console.log('🎉 Integration test completed successfully!');
    
  } catch (error) {
    console.error('❌ Integration test failed:', error.message);
    console.log('\n📋 Troubleshooting checklist:');
    console.log('- Check API_URL environment variable');
    console.log('- Verify backend is running');
    console.log('- Check network connectivity');
    console.log('- Verify test credentials');
  }
}

// Run test
testIntegration();
```

---

## 🔧 Basic Configuration Checklist

### Environment Setup
- [ ] Environment variables configured (`.env.local` or `.env`)
- [ ] API base URL pointing to correct backend
- [ ] Node.js 18+ installed and verified
- [ ] Dependencies installed (`npm install`)

### Authentication Setup  
- [ ] Authentication functions implemented (`signup`, `login`, `refresh`)
- [ ] JWT token storage configured (localStorage/sessionStorage)
- [ ] Authenticated API client created
- [ ] Token refresh logic implemented

### API Integration
- [ ] HTTP client configured with proper timeouts
- [ ] Request/response interceptors set up
- [ ] Error handling implemented
- [ ] First authenticated request working

### Testing
- [ ] Basic integration test passes
- [ ] Authentication flow works end-to-end
- [ ] Error handling tested
- [ ] Network error scenarios handled

---

## 🎯 Next Steps

### Immediate Next Steps (30 minutes)
1. **User Profiles**: Implement profile CRUD operations
   - Read: [User Profiles Guide](./02-feature-guides/user-profiles.md)
   - Start with profile creation and retrieval

2. **State Management**: Set up application state
   - Read: [State Management Core Patterns](./01-core-concepts/state-management/core-patterns.md)
   - Choose between Context API, Zustand, or Redux

3. **Error Handling**: Implement comprehensive error handling
   - Read: [Error Handling Patterns](./01-core-concepts/error-handling-patterns.md)
   - Set up error boundaries and user feedback

### Feature Implementation Order
Based on our [feature dependency graph](./02-feature-guides/README.md#-feature-dependency-graph):

| Phase | Features | Estimated Time | Priority |
|-------|----------|----------------|----------|
| **Phase 1** | User Profiles, Authentication | 1-2 weeks | 🔴 Critical |
| **Phase 2** | Workout Generation, Logging | 2-3 weeks | 🟡 High |
| **Phase 3** | Nutrition Tracking, Progress | 2-3 weeks | 🟡 High |
| **Phase 4** | Analytics, AI Insights, Goals | 3-4 weeks | 🟢 Medium |
| **Phase 5** | Notifications, Data Transfer | 1-2 weeks | 🔵 Low |
| **Phase 6** | Mobile, Performance, Deployment | 2-3 weeks | 🔵 Low |

### Key Documentation to Read Next
1. **[Core Concepts](./01-core-concepts/)** - Foundation patterns (essential)
2. **[Feature Guides](./02-feature-guides/)** - Feature implementation (choose your features)
3. **[UI Patterns](./03-ui-patterns/)** - Component patterns (as needed)
4. **[API Reference](./07-reference/api-endpoints.md)** - Complete endpoint documentation

---

## 🆘 Troubleshooting

### Common Setup Issues

#### "API_URL not defined"
```bash
# Solution: Check environment file location and naming
# Next.js: .env.local
# Create React App: .env
# Ensure REACT_APP_ prefix for CRA
```

#### "Network Error" or "CORS Issues"
```javascript
// Check these common issues:
// 1. Backend server running?
// 2. Correct port (usually 8000)?
// 3. CORS configured for your domain?
// 4. Firewall blocking requests?
```

#### "Invalid JWT Token"
```javascript
// Common JWT issues:
// 1. Token expired (implement refresh)
// 2. Token format incorrect (check Bearer prefix)
// 3. Token storage cleared (check localStorage)
// 4. Clock skew (check system time)
```

#### "Rate Limited (429 Error)"
```javascript
// Rate limiting in development:
// 1. Too many requests in short time
// 2. Wait 1 minute and retry
// 3. Implement exponential backoff
// 4. Check rate limits in docs
```

### Getting Help

**Documentation Hierarchy**:
1. **This guide** - Basic setup and configuration
2. **[Troubleshooting Guide](./07-reference/troubleshooting.md)** - Detailed problem solving
3. **[Main Integration Guide](./frontend-integration-guide.md)** - Comprehensive patterns
4. **[API Reference](./07-reference/api-endpoints.md)** - Complete endpoint documentation

**Support Escalation**:
1. Check relevant documentation section
2. Review error messages in browser dev tools
3. Test with API testing tool (Postman/Insomnia)
4. Check backend logs if available
5. Review network tab for request/response details

---

## ✅ Success Validation

### You're Ready to Proceed When:
- [ ] Environment variables load correctly
- [ ] API health check passes
- [ ] User can sign up and log in
- [ ] JWT tokens are stored and used
- [ ] Authenticated API requests work
- [ ] Basic error handling functions
- [ ] Integration test passes

### Validation Commands
```bash
# Check environment
node -e "console.log(process.env.REACT_APP_API_URL)"

# Test API connectivity  
curl -X GET "http://localhost:8000/v1/health"

# Verify JWT token format
node -e "const token='YOUR_JWT'; console.log(JSON.parse(atob(token.split('.')[1])))"
```

---

**Next**: Read [User Profiles Guide](./02-feature-guides/user-profiles.md) to implement your first feature integration.

**Last Updated**: January 2025  
**Guide Version**: 1.0  
**Backend Compatibility**: trAIner API v1.x