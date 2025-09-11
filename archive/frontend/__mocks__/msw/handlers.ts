import { http, HttpResponse } from 'msw';
import { mockAuthResponses } from './supabase/auth';
import { mockDatabaseResponses } from './supabase/database';
import { mockAgentResponses } from './openai/agents';

// Define handlers for Supabase authentication
export const supabaseAuthHandlers = [
  // Sign up handler
  http.post('https://*.supabase.co/auth/v1/signup', async ({ request }) => {
    const body = await request.json();
    const { email, password } = body;
    
    if (!email || !password) {
      return HttpResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }
    
    return HttpResponse.json(mockAuthResponses.signUp(email));
  }),
  
  // Sign in handler
  http.post('https://*.supabase.co/auth/v1/token', async ({ request }) => {
    const body = await request.json();
    
    // Handle password sign in
    if (body.grant_type === 'password') {
      const { email, password } = body;
      
      if (email === 'error@example.com') {
        return HttpResponse.json(
          { error: 'Invalid login credentials' },
          { status: 400 }
        );
      }
      
      return HttpResponse.json(mockAuthResponses.signIn(email));
    }
    
    // Handle refresh token
    if (body.grant_type === 'refresh_token') {
      return HttpResponse.json(mockAuthResponses.refreshToken(body.refresh_token));
    }
    
    return HttpResponse.json(
      { error: 'Unsupported grant type' },
      { status: 400 }
    );
  }),
  
  // Sign out handler
  http.post('https://*.supabase.co/auth/v1/logout', () => {
    return HttpResponse.json({ success: true });
  }),
  
  // Get user handler
  http.get('https://*.supabase.co/auth/v1/user', ({ request }) => {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return HttpResponse.json(
        { error: 'Not authenticated' },
        { status: 401 }
      );
    }
    
    const token = authHeader.split(' ')[1];
    return HttpResponse.json(mockAuthResponses.getUser(token));
  }),
];

// Define handlers for Supabase database operations
export const supabaseDatabaseHandlers = [
  // Profile operations
  http.get('https://*.supabase.co/rest/v1/user_profiles*', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      return HttpResponse.json(mockDatabaseResponses.getUserProfile(userId));
    }
    
    return HttpResponse.json(mockDatabaseResponses.getAllProfiles());
  }),
  
  http.post('https://*.supabase.co/rest/v1/user_profiles', async ({ request }) => {
    const profile = await request.json();
    return HttpResponse.json(mockDatabaseResponses.createProfile(profile));
  }),
  
  http.patch('https://*.supabase.co/rest/v1/user_profiles*', async ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const updates = await request.json();
    
    return HttpResponse.json(mockDatabaseResponses.updateProfile(userId, updates));
  }),
  
  // Workout plans operations
  http.get('https://*.supabase.co/rest/v1/workout_plans*', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const planId = url.searchParams.get('id');
    
    if (planId) {
      return HttpResponse.json(mockDatabaseResponses.getWorkoutPlan(planId));
    }
    
    if (userId) {
      return HttpResponse.json(mockDatabaseResponses.getUserWorkoutPlans(userId));
    }
    
    return HttpResponse.json(mockDatabaseResponses.getAllWorkoutPlans());
  }),
  
  http.post('https://*.supabase.co/rest/v1/workout_plans', async ({ request }) => {
    const plan = await request.json();
    return HttpResponse.json(mockDatabaseResponses.createWorkoutPlan(plan));
  }),
  
  http.patch('https://*.supabase.co/rest/v1/workout_plans*', async ({ request }) => {
    const url = new URL(request.url);
    const planId = url.searchParams.get('id');
    const updates = await request.json();
    
    return HttpResponse.json(mockDatabaseResponses.updateWorkoutPlan(planId, updates));
  }),
  
  http.delete('https://*.supabase.co/rest/v1/workout_plans*', ({ request }) => {
    const url = new URL(request.url);
    const planId = url.searchParams.get('id');
    
    return HttpResponse.json(mockDatabaseResponses.deleteWorkoutPlan(planId));
  }),
  
  // Progress tracking operations
  http.get('https://*.supabase.co/rest/v1/workout_progress*', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    const planId = url.searchParams.get('plan_id');
    
    if (planId) {
      return HttpResponse.json(mockDatabaseResponses.getPlanProgress(planId));
    }
    
    if (userId) {
      return HttpResponse.json(mockDatabaseResponses.getUserProgress(userId));
    }
    
    return HttpResponse.json([]);
  }),
  
  http.post('https://*.supabase.co/rest/v1/workout_progress', async ({ request }) => {
    const progress = await request.json();
    return HttpResponse.json(mockDatabaseResponses.logWorkoutProgress(progress));
  }),
  
  // Check-in operations
  http.get('https://*.supabase.co/rest/v1/user_check_ins*', ({ request }) => {
    const url = new URL(request.url);
    const userId = url.searchParams.get('user_id');
    
    if (userId) {
      return HttpResponse.json(mockDatabaseResponses.getUserCheckIns(userId));
    }
    
    return HttpResponse.json([]);
  }),
  
  http.post('https://*.supabase.co/rest/v1/user_check_ins', async ({ request }) => {
    const checkIn = await request.json();
    return HttpResponse.json(mockDatabaseResponses.logCheckIn(checkIn));
  }),
];

// Define handlers for OpenAI API
export const openAIHandlers = [
  http.post('https://api.openai.com/v1/chat/completions', async ({ request }) => {
    const body = await request.json();
    const { messages, model } = body;
    
    // Get the last user message to determine the agent type
    const lastUserMessage = messages.filter(m => m.role === 'user').pop();
    
    if (!lastUserMessage) {
      return HttpResponse.json(
        { error: 'No user message provided' },
        { status: 400 }
      );
    }
    
    const content = lastUserMessage.content;
    
    if (content.includes('research') || content.includes('profile analysis')) {
      return HttpResponse.json(mockAgentResponses.researchAgent(messages));
    }
    
    if (content.includes('generate workout') || content.includes('create plan')) {
      return HttpResponse.json(mockAgentResponses.workoutGenerationAgent(messages));
    }
    
    if (content.includes('adjust') || content.includes('modify') || content.includes('change')) {
      return HttpResponse.json(mockAgentResponses.planAdjustmentAgent(messages));
    }
    
    if (content.includes('nutrition') || content.includes('diet') || content.includes('meal')) {
      return HttpResponse.json(mockAgentResponses.nutritionAgent(messages));
    }
    
    // Default response for other types of messages
    return HttpResponse.json(mockAgentResponses.defaultAgent(messages));
  }),
];

// Combine all handlers
export const handlers = [
  ...supabaseAuthHandlers,
  ...supabaseDatabaseHandlers,
  ...openAIHandlers,
]; 