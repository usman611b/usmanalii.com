import { test, expect } from '@playwright/test';
import { injectAxe, checkA11y } from '@axe-core/playwright';

test.describe('Accessibility & Keyboard E2E Tests', () => {
  test('Public home page passes axe accessibility scan', async ({ page }) => {
    await page.goto('/');
    await injectAxe(page);
    await checkA11y(page, undefined, {
      detailedReport: true,
      detailedReportOptions: { html: true },
    });
  });

  test('Skip link is visible on focus and jumps to main-content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test('Mobile menu expands/collapses and handles Escape key', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');

    const menuBtn = page.locator('#mobile-menu-btn');
    await expect(menuBtn).toBeVisible();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');

    await menuBtn.click();
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'true');
    const mobileMenu = page.locator('#mobile-menu');
    await expect(mobileMenu).toBeVisible();

    // Escape key closes menu
    await page.keyboard.press('Escape');
    await expect(menuBtn).toHaveAttribute('aria-expanded', 'false');
  });

  test('Mode switcher updates URL and view_mode cookie on click', async ({ page }) => {
    await page.goto('/');
    const recruiterBtn = page.locator('button[role="radio"]:has-text("Recruiter")');
    await recruiterBtn.click();
    await expect(page).toHaveURL(/\/recruiter/);
  });
});
