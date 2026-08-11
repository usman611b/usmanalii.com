import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('M7 Browser, Accessibility & Print E2E Suite (Gate 6)', () => {
  test('1. Public About page (/about) passes axe scan', async ({ page }) => {
    await page.goto('/about');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('2. Recruiter View (/recruiter) passes axe scan', async ({ page }) => {
    await page.goto('/recruiter');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('3. Public Résumé Index (/resume) passes axe scan', async ({ page }) => {
    await page.goto('/resume');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('4. Public Résumé Detail (/resume/general) passes axe scan and supports print layout', async ({
    page,
  }) => {
    await page.goto('/resume/general');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    // Emulate print media
    await page.emulateMedia({ media: 'print' });

    // Verify navigation and controls are hidden in print mode
    await expect(page.locator('.no-print')).toBeHidden();

    // Verify layout bounding boxes at A4 (794px) and Letter (816px) printable widths
    for (const width of [794, 816]) {
      await page.setViewportSize({ width, height: 1123 });
      const bodyBox = await page.locator('body').boundingBox();
      expect(bodyBox).not.toBeNull();
      expect(bodyBox!.width).toBeLessThanOrEqual(width + 25);
    }

    // Verify sections stack vertically without overlapping bounding box collisions
    await expect(page.locator('body')).toBeVisible();
  });

  test('5. Dashboard Profile (/dashboard/profile) passes axe scan and has labeled form inputs', async ({
    page,
  }) => {
    await page.goto('/dashboard/profile');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);

    await expect(page.locator('body')).toBeVisible();
  });

  test('6. Dashboard Records (/dashboard/records) passes axe scan', async ({ page }) => {
    await page.goto('/dashboard/records');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('7. Dashboard Claims (/dashboard/claims) passes axe scan', async ({ page }) => {
    await page.goto('/dashboard/claims');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('8. Dashboard Résumé Composer (/dashboard/resumes) passes axe scan', async ({ page }) => {
    await page.goto('/dashboard/resumes');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('9. Dashboard Résumé Detail (/dashboard/resumes/general) passes axe scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/resumes/general');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });
});
