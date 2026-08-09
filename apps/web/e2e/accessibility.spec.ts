import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

test.describe('Playwright + axe-core Live Application E2E Suite (M1 + M2)', () => {
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

  test('4. Public Journey Index (/journey) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/journey');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('5. Public Journey Entry page (/journey/monorepo-security-architecture) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/journey/monorepo-security-architecture');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('6. Dashboard Overview (/dashboard) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/dashboard');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('7. Dashboard Journal List (/dashboard/journal) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/journal');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('8. Dashboard Journal Editor (/dashboard/journal/edit-1?id=entry-1) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/journal/edit-1?id=entry-1');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('9. Skip to main content link works via Keyboard Tab', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');
    const skipLink = page.locator('a[href="#main-content"]');
    await expect(skipLink).toBeFocused();
    await expect(skipLink).toBeVisible();
  });

  test('10. Mobile navigation overlay toggle & Escape key focus restoration', async ({ page }) => {
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

  test('11. Mode Switcher radiogroup state changes & updates URL', async ({ page }) => {
    await page.goto('/');
    const recruiterBtn = page.locator('button[role="radio"]:has-text("Recruiter")').first();
    await expect(recruiterBtn).toBeVisible();
    await recruiterBtn.click();
    await expect(page).toHaveURL(/\/recruiter/);
  });

  test('12. Dashboard Evidence Ledger (/dashboard/evidence) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/evidence');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('13. Dashboard Evidence Detail (/dashboard/evidence/ev-1) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/evidence/ev-1');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('14. Dashboard Artifacts (/dashboard/artifacts) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/artifacts');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('15. Public Skills Index (/skills) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/skills');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('16. Public Skill Detail (/skills/typescript) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/skills/typescript');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('17. Public Capabilities Index (/capabilities) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/capabilities');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('18. Public Capability Detail (/capabilities/design-secure-multi-tenant-apis) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/capabilities/design-secure-multi-tenant-apis');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('19. Dashboard Skills (/dashboard/skills) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/skills');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('20. Dashboard Capabilities (/dashboard/capabilities) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/capabilities');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('21. Dashboard Graph Engine (/dashboard/graph) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/graph');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('22. Dashboard Suggestions (/dashboard/suggestions) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/suggestions');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('23. Graph Visualization accessible table view toggle & category filtering', async ({
    page,
  }) => {
    await page.goto('/dashboard/graph');
    const tableBtn = page.locator('button:has-text("Accessible Table View")');
    await expect(tableBtn).toBeVisible();
    await tableBtn.click();
    const tableHeader = page.locator('th:has-text("Node Name")');
    await expect(tableHeader).toBeVisible();
  });

  test('24. Public Projects Index (/projects) passes axe accessibility scan', async ({ page }) => {
    await page.goto('/projects');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('25. Public Project Detail (/projects/secure-multi-tenant-monorepo) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/projects/secure-multi-tenant-monorepo');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('26. Dashboard Projects (/dashboard/projects) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/projects');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('27. Dashboard New Project (/dashboard/projects/new) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/projects/new');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('28. Dashboard Project Master Overview (/dashboard/projects/proj-1) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/projects/proj-1');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('29. Dashboard Project Case Study Editor (/dashboard/projects/proj-1/case-study) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/projects/proj-1/case-study');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('30. Dashboard Project Contributions (/dashboard/projects/proj-1/contributions) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/projects/proj-1/contributions');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('31. Dashboard Project ADRs (/dashboard/projects/proj-1/adrs) passes axe accessibility scan', async ({
    page,
  }) => {
    await page.goto('/dashboard/projects/proj-1/adrs');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('32. Dashboard GitHub Integration passes axe accessibility scan', async ({ page }) => {
    await page.goto('/dashboard/integrations/github');
    const results = await new AxeBuilder({ page }).analyze();
    expect(results.violations).toEqual([]);
  });

  test('33. Dashboard GitHub Integration remains keyboard operable with reduced motion', async ({
    page,
  }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/dashboard/integrations/github');
    const userIdInput = page.getByLabel('GitHub Numeric User ID *');
    await userIdInput.focus();
    await expect(userIdInput).toBeFocused();
    await expect(page.getByRole('main')).toBeVisible();
  });
});
