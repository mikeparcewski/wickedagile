/**
 * Mobile (390x844, iPhone 12 geometry) — the documented fallbacks.
 * Source contract:
 *   - Shipped.astro @media(max-width:880px): .build-grid is display:none and
 *     the .shipped-mobile list (flagship card + layer-labelled rows) shows.
 *   - Hero.astro @media(max-width:600px): the auto-typing terminal
 *     (#termWindow) is display:none — imagery comes from the other sections.
 */
import { test, expect, devices } from '@playwright/test';

// iPhone 12 geometry (devices['iPhone 12']), pinned explicitly so the project
// stays on Chromium regardless of the device descriptor's defaultBrowserType.
test.use({
  viewport: { width: 390, height: 844 },
  userAgent: devices['iPhone 12'].userAgent,
  deviceScaleFactor: devices['iPhone 12'].deviceScaleFactor,
  isMobile: true,
  hasTouch: true,
});

test.describe('mobile fallbacks', () => {
  test('shipped-mobile list replaces the interactive stack (and the hero terminal hides)', async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // The interactive stack + preview pane are desktop-only.
    await expect(page.locator('.build-grid')).toBeHidden();

    // The documented .shipped-mobile fallback is what renders instead.
    const mobile = page.locator('.shipped-mobile');
    await mobile.scrollIntoViewIfNeeded();
    await expect(mobile).toBeVisible();

    // Flagship card + the six remaining packages as rows.
    await expect(mobile.locator('.expm-feat')).toBeVisible();
    await expect(mobile.locator('.expm-feat-name')).toHaveText('wicked-crew');
    await expect(mobile.locator('.expm-row')).toHaveCount(6);
    await expect(mobile.locator('.expm-row').first()).toBeVisible();

    // Hero: phones kill the auto-typing terminal entirely (≤600px).
    await expect(page.locator('#termWindow')).toBeHidden();
  });
});
