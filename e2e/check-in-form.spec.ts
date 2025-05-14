/// <reference types="@playwright/test" />
import { test, expect } from '@playwright/test';

test.describe('CheckInForm Component', () => {

  // Add login logic before each test
  test.beforeEach(async ({ page }) => {
    // Navigate to login page
    await page.goto('/login');

    // Fill in login credentials using correct labels from screenshot
    await page.getByLabel('Email address').fill('test@example.com'); // UPDATED SELECTOR
    await page.getByLabel('Password').fill('password123'); // This selector was correct

    // Click login button using correct text from screenshot
    await page.getByRole('button', { name: /Sign in/i }).click(); // UPDATED SELECTOR (using regex for case-insensitivity)

    // Wait for navigation to complete (e.g., to the dashboard or expected landing page after login)
    // This ensures login is successful before proceeding to the test steps
    await page.waitForURL('**/'); // Waits for navigation to any page after login (adjust if needed)
    console.log('Login successful before test.');
  });

  test('should render the form and allow check-in submission', async ({ page }) => {
    // 1. Navigate to the progress page
    await page.goto('/progress');

    // 2. Click the "Check-in" tab trigger to reveal the form
    // Use getByText and wait for it to be visible before clicking
    const checkInTab = page.getByText('Check-in', { exact: true });
    await checkInTab.waitFor({ state: 'visible', timeout: 10000 }); // Wait up to 10s
    await checkInTab.click();

    // 3. Now check if the form elements are visible
    await expect(page.getByLabel(/check-in date/i)).toBeVisible();
    await expect(page.getByLabel(/weight \(kg\)/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /body measurements/i })).toBeVisible();
    await expect(page.getByLabel(/energy level/i)).toBeVisible();
    await expect(page.getByLabel(/sleep quality/i)).toBeVisible();
    await expect(page.getByLabel(/stress level/i)).toBeVisible();
    await expect(page.getByLabel(/notes/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /save check-in/i })).toBeVisible();

    // --- Interact with the form --- 
    await page.getByLabel(/weight \(kg\)/i).fill('76');
    await page.getByLabel(/notes/i).fill('Feeling good today!');

    // --- Submit the form --- 
    await page.getByRole('button', { name: /save check-in/i }).click();

    // --- Assert submission outcome --- 
    // TODO: Add assertion for success (e.g., toast message)
    // await expect(page.locator('text=Check-in saved successfully')).toBeVisible(); // Example

    console.log('Playwright test: CheckInForm basic render and interaction check completed.');
  });
}); 