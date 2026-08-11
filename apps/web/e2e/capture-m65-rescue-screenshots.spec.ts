import { test } from '@playwright/test';
import { join } from 'path';

const ARTIFACT_DIR =
  'C:\\Users\\pc\\.gemini\\antigravity-ide\\brain\\a35cdc1e-d539-4ba2-8ca6-c27afc72783a';

test.describe('M6.5 Real Screenshot Approval Gate', () => {
  test('Capture 1: Homepage — 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_01_homepage_1440.png'),
      fullPage: false,
    });
  });

  test('Capture 2: Homepage — 1920x1080', async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_02_homepage_1920.png'),
      fullPage: false,
    });
  });

  test('Capture 3: Homepage — 390x844 (Mobile)', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_03_homepage_mobile_390.png'),
      fullPage: false,
    });
  });

  test('Capture 4: Homepage Scrolled to Evidence Section — 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    const evidenceElem = page.locator('#evidence-system');
    await evidenceElem.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_04_homepage_scrolled_evidence.png'),
      fullPage: false,
    });
  });

  test('Capture 5: Dashboard Overview — 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_05_dashboard_1440.png'),
      fullPage: false,
    });
  });

  test('Capture 6: Project Detail / Deep-Dive Empty State — 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/deep-dive');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_06_deep_dive_1440.png'),
      fullPage: false,
    });
  });

  test('Capture 7: Reduced Motion Homepage — 1440x900', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_07_reduced_motion.png'),
      fullPage: false,
    });
  });

  test('Capture 8: Activity Empty State — 1440x900', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto('/activity');
    await page.waitForLoadState('networkidle');
    await page.screenshot({
      path: join(ARTIFACT_DIR, 'm65_rescue_08_activity_empty_state.png'),
      fullPage: false,
    });
  });
});
