/**
 * Editorial identity — wickedagile.com is the wicked FAMILY FRONT DOOR and the
 * builder's showcase (operator decision D1, 2026-10-17). Source contract
 * (src/pages/index.astro + Hero.astro + Story.astro + CanDo.astro + Shipped.astro + Builder.astro):
 *   - Hero leads with the family one-liner, with "how it works" / "what you can do" /
 *     "who built it" CTAs, and the default-review qualifier as small print.
 *   - Section order: hero → how it works (#how) → what you can do (#can)
 *     → the platform stack (#projects)
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
    const ghosts = page.locator('.hero-ctas .btn-ghost');
    await expect(ghosts).toHaveText(['what you can do →', 'who built it →']);
    await expect(ghosts.nth(0)).toHaveAttribute('href', '#can');
    await expect(ghosts.nth(1)).toHaveAttribute('href', '#builder');
    // N1: review is the default, not a guarantee; the qualifier sits in the first screen.
    await expect(page.locator('.hero-fine')).toContainText('By default a different agent reviews the work.');
    await expect(page.locator('.hero-fine')).toContainText('reduced assurance');
    await expect(page).toHaveTitle('wicked — your coding agents, checked against your rules');
  });

  test('the builder section names who built it and links to more of his work', async ({ page }) => {
    await expect(page.locator('#builder h2')).toHaveText('Built by Mike Parcewski.');
    await expect(page.locator('#builder .builder-problem')).toHaveCount(4);
    await expect(page.locator('#builder .builder-reach a[href="https://github.com/mikeparcewski"]')).toBeAttached();
  });

  test('what you can do: eight tiles and one coming-soon line, no dates', async ({ page }) => {
    await expect(page.locator('#can .can-tile')).toHaveCount(8);
    const soon = page.locator('#can .can-soon');
    // whole phrases, so a word fused to its <strong> (Astro compressHTML) fails here
    await expect(soon).toContainText('Coming soon: a catalog of job types in New job, and Apps: live apps');
    await expect(soon).not.toContainText(/20\d\d|Q[1-4]/);
  });

  test('how it works and the builder say what a job does today, and nothing they no longer may', async ({ page }) => {
    const how = (await page.locator('#how').innerText()).replace(/\s+/g, ' ');
    expect(how).toContain('a feature, bug fix, migration, MCP server or editor plugin pass acceptance testing');
    expect(how).toContain('A Claude subscription’s sign-in token is the one exception');
    expect(how).toContain('By default a different agent reviews it');
    expect(how).toContain('up to three hand-off attempts in all');
    const builder = (await page.locator('#builder').innerText()).replace(/\s+/g, ' ');
    expect(builder).toContain('sends the work back, waits for you or stops the job');
    expect(builder).toContain('By default the agent that built a change cannot approve it');
    expect(builder).toContain('A saved workflow may require fewer checks');
    // rules have no per-repo target (core crates/wicked-governance/src/conformance.rs)
    const page_ = (await page.locator('body').innerText()).replace(/\s+/g, ' ');
    expect(page_).not.toMatch(/\b(?:one|single)\s+repo(?:sitory)?\b/i);
    for (const text of [how, builder]) {
      expect(text).not.toMatch(/never asserted/i);
      expect(text).not.toMatch(/one failed check stops/i);
      expect(text).not.toMatch(/app changes (need|pass)/i);
    }
  });

  test('sections run hero → how → can → stack → builder → articles → about', async ({ page }) => {
    // DOM order is the scroll order — rank each section by position among
    // all <section> elements in the page (querySelectorAll, not direct children).
    const order = await page.evaluate(() =>
      ['#terminal-section', '#how', '#can', '#projects', '#builder', '#content', '#about'].map((sel) => {
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

test.describe('the first screen and each new section fit a 1440x700 laptop', () => {
  test.use({ viewport: { width: 1440, height: 700 } });
  const bottom = (page: import('@playwright/test').Page, sel: string) =>
    page.evaluate((s) => document.querySelector(s)!.getBoundingClientRect().bottom, sel);

  test('the hero small print is above the fold', async ({ page }) => {
    await page.goto('/', { waitUntil: 'networkidle' });
    await page.evaluate(async () => { await document.fonts.ready; });
    expect(await bottom(page, '.hero-fine')).toBeLessThanOrEqual(700);
  });

  test('the eight tiles fit across the screen', async ({ page }) => {
    await page.goto('/#can', { waitUntil: 'networkidle' });
    const right = await page.evaluate(() => Math.max(...Array.from(document.querySelectorAll('#can .can-tile')).map((t) => t.getBoundingClientRect().right)));
    expect(right).toBeLessThanOrEqual(1440);
  });

  // The wheel handler moves one section per notch, so anything below the screen is skipped.
  for (const [hash, last] of [['#how', '#how .story-step:last-child'], ['#can', '#can .can-soon'], ['#builder', '#builder .builder-problem:last-child']]) {
    test(`${hash} ends on screen after its anchor`, async ({ page }) => {
      await page.goto(`/${hash}`, { waitUntil: 'networkidle' });
      await page.evaluate(async () => { await document.fonts.ready; });
      await page.waitForTimeout(300);
      expect(await bottom(page, last)).toBeLessThanOrEqual(700);
    });
  }
});
