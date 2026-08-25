import { expect, test } from '@playwright/test';

test('phone desktop-site mode keeps the PC hero without a tall empty canvas', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 980, height: 1600 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('/');

  await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeVisible();
  await expect(page.locator('#mobile-menu-btn')).toBeHidden();

  const hero = await page.locator('.hero-observatory').boundingBox();
  const columns = await page
    .locator('.hero-inner')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);

  expect(columns.trim().split(/\s+/)).toHaveLength(2);
  expect(hero).not.toBeNull();
  expect(hero!.height).toBeLessThan(850);

  await context.close();
});
