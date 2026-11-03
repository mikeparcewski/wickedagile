/**
 * Universal chrome — theme toggle, the lockup and the flask, all from the shared
 * wicked-web Topbar (node_modules/wicked-web/src/components/Topbar.astro).
 * Source contract:
 *   - setTheme(t) stamps data-theme on <html> AND persists localStorage
 *     'wa-theme-v3'; Base.astro's no-flash init re-applies it before paint.
 *   - the umbrella site passes no pkg, so the lockup stands alone (no product path);
 *   - the flask is a plain link to Wicked Labs (LAB in data/family.js), on the
 *     desktop icon row and as the phone menu's first row. There is no Experiments menu.
 */
import { test, expect } from '@playwright/test';

test.describe('universal chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test("theme toggle flips data-theme on <html> and persists 'wa-theme-v3' across reload", async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'dark');
    // loading a page persists nothing: only a click writes the choice
    expect(await page.evaluate(() => localStorage.getItem('wa-theme-v3'))).toBeNull();

    await page.locator('#themeBtn').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('wa-theme-v3')))
      .toBe('light');

    // Persistence: the no-flash init in Base.astro must re-apply the stored theme.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(html).toHaveAttribute('data-theme', 'light');

    // And it toggles back.
    await page.locator('#themeBtn').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('wa-theme-v3')))
      .toBe('dark');
  });

  test('the lockup stands alone (no product path) and the flask links Wicked Labs', async ({ page }) => {
    const lockup = page.locator('.topbar a.wordmark');
    await expect(lockup).toHaveCount(1);
    await expect(lockup).toHaveAttribute('aria-label', 'Wicked Agile');
    await expect(lockup).toHaveAttribute('href', 'https://wickedagile.com');
    await expect(page.locator('.topbar .crumbs')).toHaveCount(0);
    const lab = page.locator('.topbar .nav').getByRole('link', { name: 'Wicked Labs' });
    await expect(lab).toHaveAttribute('href', 'https://wickedlabs.ai/');
    await expect(lab).toBeVisible();
    // the old Experiments menu is gone: no button that opens it, no product rows
    await expect(page.locator('#projectsBtn, #projectsMenu, .dropdown-menu, .dropdown-plane')).toHaveCount(0);
  });

  test('on a phone the menu leads with Wicked Labs, then media, writing and GitHub', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#menuBtn').click();
    const rows = page.locator('#mobileMenu a');
    await expect(rows).toHaveCount(4);
    await expect(rows.first()).toContainText('Wicked Labs');
    await expect(rows.first()).toHaveAttribute('href', 'https://wickedlabs.ai/');
    // no product-site rows in the menu any more (SameGarden lists the products on the page)
    const products = ['wc', 'wg', 'we', 'ws'].map((h) => `#mobileMenu a[href^="https://${h}.wickedagile.com"]`).join(', ');
    await expect(page.locator(products)).toHaveCount(0);
    await page.keyboard.press('Escape');
    await expect(page.locator('#mobileMenu')).toBeHidden();
  });
});

test('a stored v2 theme is ignored: the reset to Wicked Dark happens once, and the load writes nothing', async ({ page }) => {
  await page.addInitScript(() => localStorage.setItem('wa-theme', 'light'));
  await page.goto('/');
  await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
  expect(await page.evaluate(() => localStorage.getItem('wa-theme-v3'))).toBeNull();
});
