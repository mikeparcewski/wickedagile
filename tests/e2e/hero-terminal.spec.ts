/**
 * Hero terminal — the animated typing session in the page-1 hero.
 * Source contract (src/scripts/terminal.js + src/components/Hero.astro):
 *   - runSession() types a splash banner, then walks /articles → /projects →
 *     /about, appending into #termOutput character by character.
 *   - The slash-menu (#slashMenu) is shown (hidden attr removed) each time a
 *     "/" is typed, holds ~920ms, then hides again. It re-shows 3 times.
 *   - Desktop only: at ≤600px the terminal is display:none and boot() bails.
 */
import { test, expect } from '@playwright/test';

test.describe('hero terminal', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('session text types out progressively (animated typing)', async ({ page }) => {
    const output = page.locator('#termOutput');

    // The splash banner is the first thing committed — proves the session booted.
    await expect(output).toContainText('w i c k e d');

    // Animated typing: the output keeps growing over time. Two monotonic
    // samples via expect.poll — no fixed sleeps, resilient to timing jitter.
    const lengthOf = () => output.evaluate((el) => (el.textContent ?? '').length);
    const first = await lengthOf();
    await expect.poll(lengthOf, { timeout: 15_000 }).toBeGreaterThan(first);
    const second = await lengthOf();
    await expect.poll(lengthOf, { timeout: 15_000 }).toBeGreaterThan(second);
  });

  test('slash-menu renders during the session with its three commands', async ({ page }) => {
    const menu = page.locator('#slashMenu');
    const items = menu.locator('.slash-menu-item');

    // The three command entries are baked into the markup.
    await expect(items).toHaveCount(3);
    await expect(menu.locator('[data-cmd="articles"]')).toHaveText('articles');
    await expect(menu.locator('[data-cmd="projects"]')).toHaveText('projects');
    await expect(menu.locator('[data-cmd="about"]')).toHaveText('about');

    // The menu becomes visible when the session types "/" (first at ~2-3s,
    // holds ~920ms; shows three times total). Web-first assertion polls until
    // it catches one of those windows.
    await expect(menu).toBeVisible({ timeout: 15_000 });

    // While shown, exactly one command is highlighted as selected.
    await expect(menu.locator('.slash-menu-item.is-sel')).toHaveCount(1);
  });
});
