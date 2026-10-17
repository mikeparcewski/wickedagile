/**
 * Editorial identity — wickedagile.com is the wicked FAMILY FRONT DOOR and the
 * builder's showcase (operator decision D1, 2026-10-17). Source contract
 * (src/pages/index.astro + Hero.astro + Story.astro + Shipped.astro + Builder.astro):
 *   - Hero leads with the family one-liner, with "how it works" / "who built it" CTAs.
 *   - Section order: hero → how it works (#how) → the platform stack (#projects)
 *     → built by (#builder) → articles/dispatches (#content) → about chapters (#about).
 *   - The "build on it." Extend band is retired; its pitch survives as ONE
 *     outro line in the stack section linking to garden's #extend.
 */
import { test, expect } from '@playwright/test';

test.describe('editorial identity', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/', { waitUntil: 'domcontentloaded' });
  });

  test('hero leads with the family one-liner', async ({ page }) => {
    await expect(page.locator('.hero-title')).toHaveText(
      'Your coding agents do the work. A different agent checks it against your rules. You get the evidence.',
    );
    await expect(page.locator('.hero-text')).toContainText('in sandboxes');
    await expect(page.locator('.hero-ctas .btn-primary')).toHaveText('how it works →');
    await expect(page.locator('.hero-ctas .btn-primary')).toHaveAttribute('href', '#how');
    await expect(page.locator('.hero-ctas .btn-ghost')).toHaveText('who built it →');
    await expect(page.locator('.hero-ctas .btn-ghost')).toHaveAttribute('href', '#builder');
    await expect(page).toHaveTitle('wicked — your coding agents, checked against your rules');
  });

  test('the builder section names who built it and links to more of his work', async ({ page }) => {
    await expect(page.locator('#builder h2')).toHaveText('Built by Mike Parcewski.');
    await expect(page.locator('#builder .builder-problem')).toHaveCount(4);
    await expect(page.locator('#builder .builder-reach a[href="https://github.com/mikeparcewski"]')).toBeAttached();
  });

  test('sections run hero → how → stack → builder → articles → about', async ({ page }) => {
    // DOM order is the scroll order — rank each section by position among
    // all <section> elements in the page (querySelectorAll, not direct children).
    const order = await page.evaluate(() =>
      ['#terminal-section', '#how', '#projects', '#builder', '#content', '#about'].map((sel) => {
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
