import { test, expect } from '@playwright/test';
import { signInViaUI, TEST_USER } from './helpers/auth-helper';

test.describe('Debug Profile Page', () => {
  test('Check what is actually on the profile create page', async ({ page }) => {
    // Set up debugging
    page.on('console', msg => console.log('PAGE LOG:', msg.text()));
    page.on('pageerror', error => console.log('PAGE ERROR:', error.message));

    // Sign in
    await signInViaUI(page, TEST_USER.email, TEST_USER.password);
    
    // Wait for successful login redirect (new users go to /profile to complete profile)
    await page.waitForURL('**/profile');
    
    // Navigate to profile creation page
    await page.goto('/profile/create');
    await page.waitForLoadState('networkidle');
    
    // Debug: Log page title and URL
    console.log('Page title:', await page.title());
    console.log('Page URL:', page.url());
    
    // Debug: Take a screenshot
    await page.screenshot({ path: 'debug-profile-page.png', fullPage: true });
    
    // Debug: Check if any elements with data-testid exist
    const testIds = await page.evaluate(() => {
      const elements = document.querySelectorAll('[data-testid]');
      return Array.from(elements).map(el => el.getAttribute('data-testid'));
    });
    console.log('Available data-testids:', testIds);
    
    // Debug: Check what's in the body
    const bodyText = await page.textContent('body');
    console.log('Body text snippet:', bodyText?.substring(0, 500));
    
    // Check if form elements exist
    const hasForm = await page.locator('form').count();
    console.log('Number of forms found:', hasForm);
    
    // Check if any step-related elements exist
    const stepElements = await page.locator('[data-testid*="step"]').count();
    console.log('Number of step elements found:', stepElements);
    
    // List all headings
    const headings = await page.locator('h1, h2, h3').allTextContents();
    console.log('Headings found:', headings);
  });
});
