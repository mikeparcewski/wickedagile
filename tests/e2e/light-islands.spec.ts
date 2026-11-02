import { test, expect } from '@playwright/test';

/**
 * Wicked Light (wicked-web v3): the page turns light, but the device mockups (product blocks, the
 * preview pane, the mobile product cards) stay dark, so their text must keep Wicked Dark's values.
 * Before this, light-theme ink landed on those dark grounds (about 1.05:1 for the preview title).
 */
const DARK_INK = 'rgb(237, 237, 234)';
const DARK_MUTED = 'rgb(169, 169, 163)';

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa-theme-v3', 'light'));
});

test('desktop: the product blocks and the preview pane keep dark-ground text in Wicked Light', async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  await expect(page.locator('.center-titlebar .ct-name')).toHaveCSS('color', DARK_INK);
  await expect(page.locator('.block:not([aria-current="true"]) .blk-role').first()).toHaveCSS('color', DARK_MUTED);
});

test('phone: the mobile product cards keep dark-ground text in Wicked Light', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('/');
  await expect(page.locator('.expm-feat-name')).toHaveCSS('color', DARK_INK);
  await expect(page.locator('.expm-feat')).toHaveCSS('background-color', 'rgb(26, 26, 26)');
  await expect(page.locator('.expm-row .expm-title b').first()).toHaveCSS('color', DARK_INK);
  // pressed: the row keeps an opaque dark ground (a translucent fill showed the light page through)
  const row = page.locator('.expm-row').first();
  await row.scrollIntoViewIfNeeded();
  const box = (await row.boundingBox())!;
  await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
  await page.mouse.down();
  await expect(row).toHaveCSS('background-color', 'rgb(33, 33, 33)');
  await page.mouse.up();
});

test('a thumbless article card shades toward the page ground, never black, in Wicked Light', async ({ page }) => {
  await page.goto('/');
  const card = page.locator('.priority').first();
  test.skip((await card.count()) === 0, 'no articles in this build');
  // the feed decides whether the lead article has a thumbnail; force the thumbless (fallback) form
  await card.evaluate((el) => el.classList.remove('has-thumb'));
  const bg = await card.locator('.priority-overlay').evaluate((el) => getComputedStyle(el).backgroundImage);
  expect(bg, 'no black shade (a non-zero-alpha black stop)').not.toMatch(/rgba\(0, 0, 0, 0\.\d/);
  expect(bg, "the shade is Wicked Light's ground (oklab L about 0.97)").toMatch(/oklab\(0\.9\d/);
});

test('article meta stays in its row in Wicked Light (no stray absolute positioning)', async ({ page }) => {
  await page.goto('/');
  const meta = page.locator('.dispatch-row-meta').first();
  test.skip((await meta.count()) === 0, 'no articles in this build');
  await expect(meta).toHaveCSS('position', 'static');
});

test('keyboard focus inside the terminal is the light focus colour in Wicked Light', async ({ page }) => {
  await page.goto('/');
  const focus = await page.locator('.term-window').evaluate((el) => getComputedStyle(el).getPropertyValue('--focus').trim());
  expect(focus).toBe('#ededea');
  // and the chrome's :focus-visible outline follows it for an element inside the island
  const outline = await page.locator('.term-window').evaluate((el) => {
    const a = document.createElement('a'); a.href = '#'; a.textContent = 'x'; el.appendChild(a); a.focus({ focusVisible: true } as FocusOptions);
    const c = getComputedStyle(a).outlineColor; a.remove(); return c;
  });
  expect(outline).toBe('rgb(237, 237, 234)');
});
