import { test, expect } from '@playwright/test';

// Helper: log in via UI
async function login(page, email, password) {
  await page.goto('/');
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);
  await page.locator('button[type="submit"], button:has-text("Connexion")').first().click();
  // Wait for dashboard to load
  await page.waitForURL('**/', { timeout: 10000 });
}

test.describe('Dashboard & Navigation', () => {
  // Use test credentials from env or skip
  const TEST_EMAIL    = process.env.E2E_EMAIL    || '';
  const TEST_PASSWORD = process.env.E2E_PASSWORD || '';

  test.skip(!TEST_EMAIL, 'E2E_EMAIL env var required for authenticated tests');

  test('dashboard loads after login', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    // Dashboard should show key elements
    await expect(page.locator('text=/tableau de bord|dashboard|debrief/i').first()).toBeVisible({ timeout: 10000 });
  });

  test('navigation items are visible', async ({ page }) => {
    await login(page, TEST_EMAIL, TEST_PASSWORD);
    // Sidebar nav should have key items
    await expect(page.locator('text=/pipeline|historique|paramètres/i').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Health check', () => {
  test('API health endpoint responds', async ({ request }) => {
    const res = await request.get('https://closer-backend-production.up.railway.app/api/health');
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body).toHaveProperty('status', 'ok');
  });
});
