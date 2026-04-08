import { test, expect } from '@playwright/test';

test.describe('Authentication flows', () => {
  test('login page renders', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('input[type="email"], input[placeholder*="mail"], input[placeholder*="Email"]')).toBeVisible({ timeout: 10000 });
  });

  test('login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/');
    // Fill login form
    const emailInput = page.locator('input[type="email"]').first();
    const passInput  = page.locator('input[type="password"]').first();
    await emailInput.fill('invalid@example.com');
    await passInput.fill('wrongpassword');
    // Click login button
    const loginBtn = page.locator('button[type="submit"], button:has-text("Connexion"), button:has-text("Se connecter")').first();
    await loginBtn.click();
    // Should show error message
    await expect(page.locator('text=/incorrect|invalide|erreur/i')).toBeVisible({ timeout: 8000 });
  });

  test('forgot password link is accessible', async ({ page }) => {
    await page.goto('/');
    const forgotLink = page.locator('text=/oublié|forgot|reset/i').first();
    await expect(forgotLink).toBeVisible({ timeout: 8000 });
  });

  test('register link is accessible', async ({ page }) => {
    await page.goto('/');
    const registerLink = page.locator('button').filter({ hasText: /S'inscrire/i }).first();
    await expect(registerLink).toBeVisible({ timeout: 8000 });
  });
});
