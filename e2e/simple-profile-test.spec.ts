import { test, expect } from '@playwright/test';
import { signInViaUI, TEST_USER } from './helpers/auth-helper';

test.describe('Simple Profile Page Test', () => {
  test('Check if profile create page loads', async ({ page }) => {
    // Enable console logging
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.log('PAGE ERROR:', msg.text());
      }
    });
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    // Sign in
    await signInViaUI(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for successful login redirect
    await page.waitForURL(/\/(profile|dashboard)/);
    console.log('✅ Login successful, redirected to:', page.url());
    
    // Navigate to profile creation page
    await page.goto('/profile/create');
    await page.waitForLoadState('networkidle');
    console.log('✅ Navigated to profile create page');
    
    // Take a screenshot for debugging
    await page.screenshot({ path: 'profile-create-page.png', fullPage: true });
    
    // Check what's visible on the page
    const pageTitle = await page.title();
    console.log('Page title:', pageTitle);
    
    // Check for the page heading
    const heading = await page.textContent('h1');
    console.log('Page heading:', heading);
    
    // Check if there's an error message
    const errorElement = await page.locator('text=/error|something went wrong/i').count();
    if (errorElement > 0) {
      const errorText = await page.locator('text=/error|something went wrong/i').first().textContent();
      console.log('❌ Error found on page:', errorText);
    }
    
    // Check for form elements
    const formCount = await page.locator('form').count();
    console.log('Number of forms:', formCount);
    
    // Check for any data-testid elements
    const testIds = await page.$$eval('[data-testid]', elements => 
      elements.map(el => el.getAttribute('data-testid'))
    );
    console.log('Available data-testids:', testIds);
    
    // Check if MultiStepProfileForm rendered
    const hasStepIndicator = await page.locator('[data-testid*="step"]').count();
    console.log('Step indicators found:', hasStepIndicator);
    
    // Check for cards (the form is wrapped in cards)
    const cardCount = await page.locator('[class*="card"]').count();
    console.log('Card elements found:', cardCount);
    
    // Expect at least the heading to be visible
    await expect(page.locator('h1')).toContainText('Create Your Fitness Profile');
  });
});
