/**
 * Universal chrome — theme toggle + ecosystem dropdown, both from the shared
 * wicked-web Topbar (node_modules/wicked-web/src/components/Topbar.astro).
 * Source contract:
 *   - setTheme(t) stamps data-theme on <html> AND persists localStorage
 *     'wa-theme'; Base.astro's no-flash init re-applies it before paint.
 *   - #projectsBtn toggles #projectsMenu (hidden attr) + aria-expanded;
 *     a document-level click or Escape closes it.
 */
import { test, expect } from '@playwright/test';

test.describe('universal chrome', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test("theme toggle flips data-theme on <html> and persists 'wa-theme' across reload", async ({ page }) => {
    const html = page.locator('html');
    await expect(html).toHaveAttribute('data-theme', 'light');

    await page.locator('#themeBtn').click();
    await expect(html).toHaveAttribute('data-theme', 'dark');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('wa-theme')))
      .toBe('dark');

    // Persistence: the no-flash init in Base.astro must re-apply the stored theme.
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(html).toHaveAttribute('data-theme', 'dark');

    // And it toggles back.
    await page.locator('#themeBtn').click();
    await expect(html).toHaveAttribute('data-theme', 'light');
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('wa-theme')))
      .toBe('light');
  });

  test('ecosystem dropdown opens on click and lists the family', async ({ page }) => {
    const btn = page.locator('#projectsBtn');
    const menu = page.locator('#projectsMenu');

    await expect(menu).toBeHidden();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');

    await btn.click();
    await expect(menu).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');

    // The seven-item family, crew featured on top.
    await expect(menu.locator('.dropdown-item')).toHaveCount(7);
    await expect(menu.locator('.dropdown-item--crew')).toContainText('crew');
    await expect(menu.locator('a[href="https://wc.wickedagile.com"]')).toBeVisible();
    await expect(menu.locator('a[href="https://github.com/mikeparcewski/wicked-bus"]')).toBeVisible();

    // Escape closes it again.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});
