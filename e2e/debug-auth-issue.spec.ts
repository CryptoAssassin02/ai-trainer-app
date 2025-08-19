/**
 * Debug Authentication Issue
 * Minimal test to isolate the auth signup problem
 */

import { test, expect } from '@playwright/test';
import { createSupabaseTestClient } from './helpers/auth-helper';

test.describe('Debug Authentication Issue', () => {
  
  test('Test Supabase Client Creation and Basic Auth', async ({ page }) => {
    console.log('🔍 Creating Supabase client...');
    
    // Test environment variables
    console.log('Environment check:');
    console.log('NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
    console.log('NEXT_PUBLIC_SUPABASE_ANON_KEY exists:', !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    
    const supabase = createSupabaseTestClient();
    const testEmail = `debug-${Date.now()}@test.local`;
    const testPassword = 'TestPassword123!';
    
    console.log('🧪 Testing signup with email:', testEmail);
    
    try {
      const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
        email: testEmail,
        password: testPassword,
        options: { 
          data: { name: 'Debug Test User' }
        }
      });
      
      if (signUpError) {
        console.error('❌ Signup Error:', signUpError);
        console.error('Error Details:', {
          message: signUpError.message,
          status: signUpError.status,
          name: signUpError.name
        });
        throw signUpError;
      }
      
      console.log('✅ Signup Success');
      console.log('User ID:', signUpData.user?.id);
      console.log('User Email:', signUpData.user?.email);
      
      // Test signin
      console.log('🧪 Testing signin...');
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
        email: testEmail,
        password: testPassword
      });
      
      if (signInError) {
        console.error('❌ Signin Error:', signInError);
        throw signInError;
      }
      
      console.log('✅ Signin Success');
      console.log('Session exists:', !!signInData.session);
      
    } catch (error) {
      console.error('🚨 Test failed with error:', error);
      throw error;
    }
  });
  
  test('Test Frontend Login Flow', async ({ page }) => {
    // Test the actual login page
    await page.goto('/login');
    
    // Check if page loads
    console.log('📄 Login page loaded, URL:', page.url());
    
    // Check for form elements
    const emailInput = page.locator('input[name="email"]');
    const passwordInput = page.locator('input[name="password"]');
    const submitButton = page.locator('button[type="submit"]');
    
    console.log('📝 Form elements found:');
    console.log('Email input:', await emailInput.count());
    console.log('Password input:', await passwordInput.count());
    console.log('Submit button:', await submitButton.count());
    
    // Test filling form
    const testEmail = `ui-test-${Date.now()}@test.local`;
    const testPassword = 'TestPassword123!';
    
    await emailInput.fill(testEmail);
    await passwordInput.fill(testPassword);
    
    console.log('📝 Form filled with:', testEmail);
    
    // Check button state before clicking
    const isButtonDisabled = await submitButton.isDisabled();
    console.log('🔘 Submit button disabled:', isButtonDisabled);
    
    if (!isButtonDisabled) {
      console.log('🔘 Clicking submit button...');
      await submitButton.click();
      
      // Wait a bit and check what happens
      await page.waitForTimeout(3000);
      
      const currentUrl = page.url();
      const buttonText = await submitButton.textContent();
      const stillDisabled = await submitButton.isDisabled();
      
      console.log('📍 After submit:');
      console.log('Current URL:', currentUrl);
      console.log('Button text:', buttonText);
      console.log('Button disabled:', stillDisabled);
      
      // Check for any error messages
      const errorMessages = await page.locator('[class*="error"], [data-testid*="error"], .text-red-500').allTextContents();
      if (errorMessages.length > 0) {
        console.log('❌ Error messages found:', errorMessages);
      }
    } else {
      console.log('⚠️ Submit button is disabled, checking for validation errors...');
      const validationErrors = await page.locator('[class*="error"], [data-testid*="error"]').allTextContents();
      console.log('Validation errors:', validationErrors);
    }
  });
  
});
