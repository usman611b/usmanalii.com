import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Playwright + axe-core Live Application Accessibility E2E Tests', () => {
  
  test('1. Home page (/) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('2. Recruiter View page (/recruiter) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/recruiter');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('3. Deep-Dive page (/deep-dive) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/deep-dive');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('4. Dashboard Shell page (/dashboard) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/dashboard');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('5. Skip to main content link works via Keyboard Tab', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test('6. Mobile navigation overlay toggle & Escape key focus restoration', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const menuBtn = page.locator('#mobile-menu-btn');
    await expect(menuBtn).toBeVisible();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeVisible();

    // Verify Escape key closes overlay and restores focus
    await page.keyboard.press('Escape');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
    await expect(menuBtn).toBeFocused();
  });

  test('7. Mode Switcher radiogroup state changes & updates URL', async ({ page }) => {
    await page.goto('/');
    const recruiterBtn = page.locator('button[role="radio"]:has-text("Recruiter")').first();
    await expect(recruiterBtn).toBeVisible();
    await recruiterBtn.click();
    await expect(page).toHaveURL(/\/recruiter/);
  });

});
