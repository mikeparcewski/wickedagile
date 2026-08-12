/**
 * Shipped stack — "experiments." layered platform stack + preview pane.
 * Source contract (src/scripts/shipped.js + src/components/Shipped.astro):
 *   - AUTOPLAY: a pulse rises up the spine, pinging each .layer (is-pinged,
 *     ~520ms) and firing the capstone (#solutionCap.is-built, holds ~1150ms),
 *     then resets and rises again (RISE=4200ms, HOLD=1150ms).
 *   - Boot proof: initPreview() stamps aria-current on exactly one block, so
 *     waiting for [aria-current="true"] guarantees click handlers are wired
 *     (clicks preventDefault — without the handler a click would navigate away).
 *   - Clicking a data-mode="site" block drives the browser-frame preview
 *     (#previewUrl / #crumbName / #centerRole / #readoutDesc).
 *   - Clicking a data-mode="lib" block (brain, bus) swaps the pane to the faux
 *     code card (#codeCard shown, #browserFrame hidden).
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

  test('stack assembles via autoplay: layers ping and the capstone fires', async ({ page }) => {
    // A layer gets "energized" as the pulse passes it (transient ~520ms class;
    // waitForFunction polls on rAF, so it reliably catches the window).
    await page.waitForFunction(
      () => document.querySelector('#projects .layer.is-pinged') !== null,
      undefined,
      { timeout: 15_000 },
    );

    // The pulse reaches the top and the capstone lights up (~4.2s per rise).
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
    await expect(page.locator('#centerRole')).toHaveText('Steer · rigor');
    await expect(page.locator('#browserFrame')).toBeVisible();
    await expect(page.locator('#codeCard')).toBeHidden();
    await expect(page.locator('#readoutDesc')).toContainText('Steering before execution');
    await expect(garden).toHaveAttribute('aria-current', 'true');
  });

  test('clicking a lib block swaps the preview to the code card', async ({ page }) => {
    const bus = page.locator('#projects .block', { hasText: 'wicked-bus' });
    await bus.scrollIntoViewIfNeeded();

    await expect(async () => {
      await bus.click();
      await expect(page.locator('#crumbName')).toHaveText('wicked-bus', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    expect(page.url()).toContain('127.0.0.1');

    await expect(page.locator('#codeCard')).toBeVisible();
    await expect(page.locator('#browserFrame')).toBeHidden();
    await expect(page.locator('#codeFile')).toHaveText('wicked-bus.js');
    await expect(page.locator('#codeBlock')).toContainText("import { bus } from 'wicked-bus'");
    await expect(bus).toHaveAttribute('aria-current', 'true');

    // Selecting a site block again restores the browser frame.
    const estate = page.locator('#projects .block', { hasText: 'wicked-estate' });
    await expect(async () => {
      await estate.click();
      await expect(page.locator('#crumbName')).toHaveText('wicked-estate', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });
    await expect(page.locator('#browserFrame')).toBeVisible();
    await expect(page.locator('#codeCard')).toBeHidden();
  });
});
