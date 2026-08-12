/**
 * Shipped stack — "the platform." four-plane stack + preview pane.
 * Source contract (src/scripts/shipped.js + src/components/Shipped.astro):
 *   - AUTOPLAY: a pulse rises up the spine, pinging each .layer (is-pinged,
 *     ~520ms) and firing the experience capstone (#solutionCap.is-built,
 *     holds ~1150ms), then resets and rises again (RISE=4200ms, HOLD=1150ms).
 *   - Boot proof: initPreview() stamps aria-current on exactly one block, so
 *     waiting for [aria-current="true"] guarantees click handlers are wired
 *     (clicks preventDefault — without the handler a click would navigate away).
 *   - Clicking a data-mode="site" block (interactive, crew, garden, estate)
 *     drives the browser-frame preview (#previewUrl / #crumbName / #centerRole
 *     / #readoutDesc).
 *   - Clicking the data-mode="lib" block (studio, the coder skin inside crew)
 *     swaps the pane to the faux code card (#codeCard shown, #browserFrame
 *     hidden).
 *   - Arrow keys walk the stack blocks in DOM order (top→bottom: studio,
 *     interactive, crew, garden, estate), moving focus AND selection.
 */
import { test, expect } from '@playwright/test';

/** Wait until shipped.js has booted (aria-current stamped ⇒ handlers wired). */
async function waitForStackBoot(page: import('@playwright/test').Page) {
  await expect(page.locator('#projects [aria-current="true"]')).toHaveCount(1);
}

test.describe('shipped stack', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    await page.locator('#stackRoot').scrollIntoViewIfNeeded();
    await waitForStackBoot(page);
  });

  test('stack assembles via autoplay: planes ping and the experience capstone fires', async ({ page }) => {
    // A plane gets "energized" as the pulse passes it (transient ~520ms class;
    // waitForFunction polls on rAF, so it reliably catches the window).
    await page.waitForFunction(
      () => document.querySelector('#projects .layer.is-pinged') !== null,
      undefined,
      { timeout: 15_000 },
    );

    // The pulse reaches the top and the two-skins capstone lights up (~4.2s per rise).
    await page.waitForFunction(
      () => document.getElementById('solutionCap')?.classList.contains('is-built') === true,
      undefined,
      { timeout: 15_000 },
    );
  });

  test('clicking a site block drives the browser-frame preview', async ({ page }) => {
    // Default selection is the foundation block (wicked-estate).
    await expect(page.locator('#previewUrl')).toHaveText('we.wickedagile.com');
    await expect(page.locator('#crumbName')).toHaveText('wicked-estate');

    const garden = page.locator('#projects .block', { hasText: 'wicked-garden' });
    await garden.scrollIntoViewIfNeeded();

    // Retry the click until it takes effect (autoplay animation keeps running;
    // never assume the first click landed).
    await expect(async () => {
      await garden.click();
      await expect(page.locator('#crumbName')).toHaveText('wicked-garden', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    // The click handler preventDefault()s — we must still be on our page.
    expect(page.url()).toContain('127.0.0.1');

    await expect(page.locator('#previewUrl')).toHaveText('wg.wickedagile.com');
    await expect(page.locator('#centerRole')).toHaveText('The catalog');
    await expect(page.locator('#browserFrame')).toBeVisible();
    await expect(page.locator('#codeCard')).toBeHidden();
    await expect(page.locator('#readoutDesc')).toContainText('catalog');
    await expect(garden).toHaveAttribute('aria-current', 'true');
  });

  test('the experience skins preview: studio swaps to the code card, interactive back to a site', async ({ page }) => {
    // studio — the coder skin, no site of its own — renders the faux code card.
    const studio = page.locator('#projects .block', { hasText: 'studio' });
    await studio.scrollIntoViewIfNeeded();

    await expect(async () => {
      await studio.click();
      await expect(page.locator('#crumbName')).toHaveText('studio', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    expect(page.url()).toContain('127.0.0.1');

    await expect(page.locator('#codeCard')).toBeVisible();
    await expect(page.locator('#browserFrame')).toBeHidden();
    await expect(page.locator('#codeFile')).toHaveText('wicked-studio.ts');
    await expect(page.locator('#codeBlock')).toContainText('/api/v1/runs');
    await expect(studio).toHaveAttribute('aria-current', 'true');

    // The other skin — interactive — restores the browser frame.
    const interactive = page.locator('#projects .block', { hasText: 'wicked-interactive' });
    await expect(async () => {
      await interactive.click();
      await expect(page.locator('#crumbName')).toHaveText('wicked-interactive', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.locator('#previewUrl')).toHaveText('wi.wickedagile.com');
    await expect(page.locator('#browserFrame')).toBeVisible();
    await expect(page.locator('#codeCard')).toBeHidden();
  });

  test('arrow keys walk the stack and drive the preview', async ({ page }) => {
    // Focus the foundation block (bottom of the stack: DOM order ends at estate).
    const estate = page.locator('#projects .block', { hasText: 'wicked-estate' });
    await estate.scrollIntoViewIfNeeded();
    await estate.focus();
    await expect(estate).toBeFocused();

    // ArrowUp walks upward in DOM order: estate → garden.
    await page.keyboard.press('ArrowUp');
    const garden = page.locator('#projects .block', { hasText: 'wicked-garden' });
    await expect(garden).toBeFocused();
    await expect(garden).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#crumbName')).toHaveText('wicked-garden');

    // Again: garden → crew.
    await page.keyboard.press('ArrowUp');
    const crew = page.locator('#projects .block', { hasText: 'wicked-crew' });
    await expect(crew).toBeFocused();
    await expect(crew).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#previewUrl')).toHaveText('wc.wickedagile.com');

    // Home jumps to the top of the stack (studio, the first block in DOM order).
    await page.keyboard.press('Home');
    const studio = page.locator('#projects .block', { hasText: 'studio' });
    await expect(studio).toBeFocused();
    await expect(studio).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#codeCard')).toBeVisible();
  });
});
