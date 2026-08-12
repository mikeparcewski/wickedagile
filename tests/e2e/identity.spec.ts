/**
 * Editorial identity — wickedagile.com is the owner's PERSONAL APEX, not a
 * product landing. Source contract (src/pages/index.astro + Hero.astro +
 * Shipped.astro):
 *   - Hero speaks the builder/writer voice ("The best code tells a story…"),
 *     with "the work" / "the writing" CTAs.
 *   - Section order: hero → the platform stack (#projects, tech first) →
 *     articles/dispatches (#content) → about chapters (#about, the closer).
 *   - The "build on it." Extend band is retired; its pitch survives as ONE
 *     outro line in the stack section linking to garden's #extend.
 *   - Title/description carry the personal voice, not a platform pitch.
 */
import { test, expect } from '@playwright/test';

test.describe('editorial identity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('hero speaks the builder/writer voice', async ({ page }) => {
    await expect(page.locator('.hero-title')).toHaveText(
      'The best code tells a story. The best stories have architecture.',
    );
    await expect(page.locator('.hero-text')).toContainText("Most people don't build both.");
    await expect(page.locator('.hero-ctas .btn-primary')).toHaveText('the work →');
    await expect(page.locator('.hero-ctas .btn-primary')).toHaveAttribute('href', '#projects');
    await expect(page.locator('.hero-ctas .btn-ghost')).toHaveText('the writing →');
    await expect(page.locator('.hero-ctas .btn-ghost')).toHaveAttribute('href', '#content');
    // Meta voice: personal apex, not "infrastructure for coding agents".
    await expect(page).toHaveTitle('wickedagile — the best code tells a story');
  });

  test('sections run hero → stack → articles → about', async ({ page }) => {
    // DOM order is the scroll order (every section is a <body> child).
    const order = await page.evaluate(() =>
      ['#terminal-section', '#projects', '#content', '#about'].map((sel) => {
        const el = document.querySelector(sel);
        return el ? Array.prototype.indexOf.call(document.body.querySelectorAll('section'), el) : -1;
      }),
    );
    expect(order.every((i) => i >= 0)).toBe(true);
    expect([...order].sort((a, b) => a - b)).toEqual(order);

    // Articles stay first-class: the dispatch console renders featured + log.
    await expect(page.locator('#dispatchPriority')).toBeAttached();
    await expect(page.locator('#dispatchLog .dispatch-row').first()).toBeAttached();
  });

  test('the extend coda is a single outro line in the stack section', async ({ page }) => {
    // The full-band section is gone…
    await expect(page.locator('#extend')).toHaveCount(0);
    // …and the one-liner lives in the stack section, linking to garden's story.
    const outro = page.locator('#projects .stack-outro');
    await expect(outro).toContainText('Built to be built on');
    await expect(outro.locator('a')).toHaveAttribute(
      'href',
      'https://wg.wickedagile.com/#extend',
    );
  });
});
