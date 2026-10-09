/**
 * Reduced motion — prefers-reduced-motion:reduce must not break the page.
 * Source contract:
 *   - shipped.js parks the stack fully assembled (#solutionCap.is-built) and
 *     never starts the spine pulse.
 *   - about.js still updates rail state, CSS just drops the transitions.
 *   - Every section renders visible with zero uncaught page errors.
 */
import { test, expect } from '@playwright/test';

test.use({ contextOptions: { reducedMotion: 'reduce' } });

test.describe('reduced motion', () => {
  test('page loads with zero pageerrors and every key section visible', async ({ page }) => {
    const errors: Error[] = [];
    page.on('pageerror', (err) => errors.push(err));

    await page.goto('/', { waitUntil: 'domcontentloaded' });

    // Key sections all render (page order: hero → stack → articles → about).
    await expect(page.locator('.topbar')).toBeVisible();
    await expect(page.locator('#terminal-section')).toBeVisible();
    await expect(page.locator('#projects')).toBeVisible();
    await expect(page.locator('#content')).toBeVisible();
    await expect(page.locator('#about')).toBeVisible();
    await expect(page.locator('#chapter-0')).toBeVisible();
    await expect(page.locator('footer.footer')).toBeVisible();

    // Shipped parks fully assembled under reduced motion — no pulse cascade.
    await expect(page.locator('#solutionCap')).toHaveClass(/is-built/);

    // Rail enhancement still engages (state updates, transitions dropped).
    await expect(page.locator('#about')).toHaveClass(/about-tracking/);

    // Let the client scripts run a beat (typing session, observers) and
    // confirm nothing threw — poll the error sink instead of sleeping.
    await expect(page.locator('#termOutput')).toContainText('w i c k e d');
    expect(errors, errors.map((e) => e.message).join('\n')).toHaveLength(0);
  });

  // wicked-web#31: snapping moves the viewport for you, the motion the preference asks the page to
  // suppress. global.css re-declares `scroll-snap-type` on html (mandatory) after the chrome's
  // guard, so it carries the guard too; assert at a desktop width, where snapping would be on.
  test('no scroll snapping at desktop width', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    expect(await page.evaluate(() => matchMedia('(prefers-reduced-motion: reduce)').matches)).toBe(true);
    expect(
      await page.evaluate(() => getComputedStyle(document.documentElement).scrollSnapType),
    ).toBe('none');
  });
});
