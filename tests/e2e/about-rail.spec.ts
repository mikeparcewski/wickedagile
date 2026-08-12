/**
 * About progress rail — the sticky chapter tracker beside the "about." panels.
 * Source contract (src/scripts/about.js + src/components/About.astro):
 *   - An IntersectionObserver picks the most-visible chapter; setActive(idx)
 *     marks its .rail-node is-active, earlier nodes is-done, grows #railFill
 *     to idx/(N-1)*100 %, and swaps the #railLabel (num immediately, name
 *     after a 180ms cross-fade).
 *   - The section gains .about-tracking once JS is enhancing the rail.
 *   - html has scroll-snap-type:y mandatory on desktop, so every scroll is
 *     wrapped in a retry loop (scroll → assert) instead of trusting one shot.
 */
import { test, expect } from '@playwright/test';

type Page = import('@playwright/test').Page;

/** Scroll a chapter into view and retry until the rail marks it active. */
async function scrollToChapter(page: Page, idx: number) {
  await expect(async () => {
    await page.locator(`#chapter-${idx}`).scrollIntoViewIfNeeded();
    await expect(page.locator(`.rail-node[data-idx="${idx}"]`)).toHaveClass(/is-active/, {
      timeout: 2_500,
    });
  }).toPass({ timeout: 20_000 });
}

test.describe('about progress rail', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
    // JS enhancement engaged (about.js booted and is tracking).
    await expect(page.locator('#about')).toHaveClass(/about-tracking/);
  });

  test('rail state tracks scroll position through the chapters', async ({ page }) => {
    // Three scrollToChapter calls may each retry for up to 20s on a slow
    // runner — give the test headroom beyond the 30s global default.
    test.setTimeout(90_000);
    const fill = page.locator('#railFill');
    const fillHeight = () => fill.evaluate((el) => (el as HTMLElement).style.height);

    // Initial state: chapter 01 active, no fill.
    await expect(page.locator('.rail-node[data-idx="0"]')).toHaveClass(/is-active/);

    // Scroll to chapter 03 (idx 2): node 2 active, 0+1 done, fill 50%.
    await scrollToChapter(page, 2);
    await expect(page.locator('.rail-node[data-idx="0"]')).toHaveClass(/is-done/);
    await expect(page.locator('.rail-node[data-idx="1"]')).toHaveClass(/is-done/);
    await expect(page.locator('.rail-node[data-idx="2"]')).toHaveClass(/is-active/);
    await expect.poll(fillHeight).toBe('50%');
    await expect(page.locator('.rail-label-num')).toHaveText('03');
    // Label name swaps after a 180ms cross-fade — poll, never sleep.
    await expect(page.locator('.rail-label-name')).toHaveText('Architecture');

    // Scroll on to the last chapter (idx 4): node 4 active, fill 100%.
    await scrollToChapter(page, 4);
    await expect(page.locator('.rail-node[data-idx="3"]')).toHaveClass(/is-done/);
    await expect(page.locator('.rail-node[data-idx="4"]')).toHaveClass(/is-active/);
    await expect.poll(fillHeight).toBe('100%');
    await expect(page.locator('.rail-label-num')).toHaveText('05');
    await expect(page.locator('.rail-label-name')).toHaveText('Reckoning');

    // And back up: scrolling to chapter 01 rewinds the rail.
    await scrollToChapter(page, 0);
    await expect(page.locator('.rail-node[data-idx="0"]')).toHaveClass(/is-active/);
    await expect(page.locator('.rail-node[data-idx="4"]')).not.toHaveClass(/is-active/);
    await expect.poll(fillHeight).toBe('0%');
  });
});
