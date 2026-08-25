import { expect, test } from '@playwright/test';

test('keeps the mobile hero composition when a touch phone requests a desktop viewport', async ({
  browser,
}) => {
  const context = await browser.newContext({
    viewport: { width: 980, height: 1600 },
    screen: { width: 390, height: 844 },
    hasTouch: true,
  });
  const page = await context.newPage();

  await page.goto('/');

  const inputProfile = await page.evaluate(() => ({
    width: window.innerWidth,
    coarsePointer: window.matchMedia('(pointer: coarse)').matches,
    noHover: window.matchMedia('(hover: none)').matches,
  }));
  expect(inputProfile).toEqual({ width: 980, coarsePointer: true, noHover: true });

  await expect(page.locator('#mobile-menu-btn')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Main Navigation' })).toBeHidden();

  const columns = await page
    .locator('.hero-inner')
    .evaluate((element) => getComputedStyle(element).gridTemplateColumns);
  expect(columns.trim().split(/\s+/)).toHaveLength(1);

  const portrait = page.locator('.hero-portrait-stage');
  const actions = page.locator('.hero-actions');
  const social = page.locator('.hero-social');
  await expect(portrait).toBeVisible();

  const [portraitBox, actionsBox, socialBox] = await Promise.all([
    portrait.boundingBox(),
    actions.boundingBox(),
    social.boundingBox(),
  ]);
  expect(portraitBox).not.toBeNull();
  expect(actionsBox).not.toBeNull();
  expect(socialBox).not.toBeNull();
  expect(portraitBox!.y).toBeGreaterThan(actionsBox!.y + actionsBox!.height);
  expect(socialBox!.y).toBeGreaterThan(portraitBox!.y + portraitBox!.height - 2);

  await context.close();
});
