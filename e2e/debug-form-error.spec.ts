import { test, expect } from '@playwright/test';
import { signInViaUI } from './helpers/auth-helper';

test('Debug Form Error', async ({ page }) => {
  // Enable console logging
  page.on('console', msg => {
    if (msg.type() === 'error') {
      console.log('CONSOLE ERROR:', msg.text());
    }
  });

  page.on('pageerror', error => {
    console.log('PAGE ERROR:', error.message);
    console.log('STACK:', error.stack);
  });

  // First authenticate the user
  console.log('Authenticating user...');
  await signInViaUI(page);
  
  // Navigate to profile create page directly
  console.log('Navigating to profile create page...');
  await page.goto('/profile/create');
  
  // Wait a moment for any errors to surface
  await page.waitForTimeout(3000);
  
  // Check what URL we're actually on
  const currentUrl = page.url();
  console.log('CURRENT URL:', currentUrl);
  
  // Check page title
  const title = await page.title();
  console.log('PAGE TITLE:', title);
  
  // Check what's actually rendered
  const pageContent = await page.content();
  console.log('PAGE CONTENT LENGTH:', pageContent.length);
  
  // Look for specific text content
  const hasCreateHeading = await page.locator('text=Create Your Fitness Profile').count();
  console.log('CREATE HEADING COUNT:', hasCreateHeading);
  
  const hasDebugText = await page.locator('text=Debug: MultiStepProfileForm Replacement').count();
  console.log('DEBUG TEXT COUNT:', hasDebugText);
  
  // Look for error boundary
  const errorBoundary = await page.locator('text=Something went wrong').count();
  console.log('ERROR BOUNDARY COUNT:', errorBoundary);
  
  // Look for the actual form
  const form = await page.locator('form').count();
  console.log('FORM COUNT:', form);
  
  // Look for MultiStepProfileForm
  const multiStepForm = await page.locator('[data-testid="multi-step-form"]').count();
  console.log('MULTI-STEP FORM COUNT:', multiStepForm);
  
  // Check if we can find any profile-related elements
  const profileElements = await page.locator('[data-testid*="profile"]').count();
  console.log('PROFILE ELEMENTS COUNT:', profileElements);
  
  // Take a screenshot for debugging
  await page.screenshot({ path: 'debug-form-error.png' });
});
