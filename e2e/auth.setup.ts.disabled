import { test as setup, expect } from '@playwright/test';
import path from 'path';

// Path to save the authenticated state
const authFile = path.join(__dirname, '../playwright/.auth/user.json');

setup('authenticate', async ({ page }) => {
  console.log('🔐 Setting up authentication for E2E tests...');
  
  // Navigate to signup page
  await page.goto('/auth/signup');
  await page.waitForLoadState('networkidle');
  console.log('📍 Navigated to signup page');

  // Create a unique test user for this setup run
  const timestamp = Date.now();
  const testEmail = `e2e-setup-${timestamp}@test.local`;
  const testPassword = 'TestPassword123!';
  
  // Fill out the signup form with unique test user data
  await page.fill('input[name="name"]', 'Test User Profile');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="password"]', testPassword);
  await page.fill('input[name="confirm-password"]', testPassword);
  
  console.log('📝 Filled signup form');

  // Submit the signup form
  await page.click('button[type="submit"]');
  console.log('✅ Submitted signup form');

  // Handle multiple possible outcomes after signup
  const result = await Promise.race([
    page.waitForURL('**/profile**', { timeout: 15000 }).then(() => 'profile'),
    page.waitForURL('**/login**', { timeout: 15000 }).then(() => 'login'),
    page.waitForSelector('.bg-green-50', { timeout: 15000 }).then(() => 'success_message'),
    page.waitForSelector('.bg-red-50', { timeout: 15000 }).then(() => 'error_message')
  ]).catch(() => 'timeout');

  console.log('📋 Signup result:', result);

  if (result === 'profile') {
    console.log('✅ Successfully signed up and redirected to profile');
  } else if (result === 'login') {
    console.log('🔄 Redirected to login - signing in...');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/profile/create**', { timeout: 15000 });
    console.log('✅ Login successful');
  } else if (result === 'success_message') {
    console.log('✅ Signup success message received - proceeding to login');
    await page.goto('/login');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/profile/create**', { timeout: 15000 });
    console.log('✅ Login successful');
  } else {
    // If signup failed, try to login with existing account
    console.log('⚠️ Signup may have failed - attempting login with existing account');
    await page.goto('/login');
    await page.waitForLoadState('networkidle');
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="password"]', testPassword);
    await page.click('button[type="submit"]');
    await page.waitForURL('**/profile/create**', { timeout: 15000 });
    console.log('✅ Login with existing account successful');
  }

  // Verify we're on the profile creation page (/profile/create)
  // New users are redirected to /profile/create (MultiStepProfileForm) after signup
  await expect(page).toHaveURL(/.*\/profile\/create$/);
  await expect(page.locator('[data-testid="multi-step-form"]')).toBeVisible({ timeout: 10000 });
  console.log('✅ Profile creation page loaded with MultiStepProfileForm - authentication verified');

  // CRITICAL: Save the authentication state to file
  // This includes cookies, localStorage, sessionStorage, and IndexedDB
  await page.context().storageState({ 
    path: authFile,
    // Include IndexedDB for apps that store auth tokens there (like Firebase)
    indexedDB: true 
  });
  
  console.log('💾 Authentication state saved to:', authFile);
  console.log('🎉 Authentication setup complete!');
});
