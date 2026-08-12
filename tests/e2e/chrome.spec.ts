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

  test('ecosystem dropdown opens on click and lists the four planes', async ({ page }) => {
    const btn = page.locator('#projectsBtn');
    const menu = page.locator('#projectsMenu');

    await expect(menu).toBeHidden();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');

    await btn.click();
    await expect(menu).toBeVisible();
    await expect(btn).toHaveAttribute('aria-expanded', 'true');

    // Four plane groups holding five product rows (interactive + studio under
    // Experience; crew, garden, estate one each). Retired products are gone.
    await expect(menu.locator('.dropdown-plane')).toHaveCount(4);
    await expect(menu.locator('.dropdown-item')).toHaveCount(5);
    // .dp-head renders text-transform:uppercase, so match case-insensitively.
    const planeNames = await menu.locator('.dp-head').allInnerTexts();
    expect(planeNames.join(' ')).toMatch(/experience[\s\S]*control[\s\S]*capability[\s\S]*foundation/i);
    await expect(menu.locator('a[href="https://wi.wickedagile.com"]')).toBeVisible();
    await expect(menu.locator('a[href="https://wc.wickedagile.com"]')).toBeVisible();
    await expect(menu.locator('a[href="https://wg.wickedagile.com"]')).toBeVisible();
    await expect(menu.locator('a[href="https://we.wickedagile.com"]')).toBeVisible();
    // studio rides Experience as a first-class product with its own site.
    await expect(menu.locator('a[href="https://ws.wickedagile.com"]')).toBeVisible();
    // Retired/internal packages have no top-level entry.
    await expect(menu.locator('a[href*="wicked-bus"]')).toHaveCount(0);
    await expect(menu.locator('a[href*="wicked-brain"]')).toHaveCount(0);
    await expect(menu.locator('a[href*="wt.wickedagile.com"]')).toHaveCount(0);

    // Escape closes it again.
    await page.keyboard.press('Escape');
    await expect(menu).toBeHidden();
    await expect(btn).toHaveAttribute('aria-expanded', 'false');
  });
});
