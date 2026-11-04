import { test, expect, type Page } from '@playwright/test';
import { SIZES, place, watch, read, waitForMotion, expectStill, setHidden } from './offscreen-kit';

/**
 * Everything that moves by itself stops when nobody can see it, and never moves the page
 * (operator, 2026-11-04: "when interactives are playing the scroll is scrolling back to them").
 *
 * At 1440x900, 1280x720 and 390x844:
 * - the hero's braid: its dots travel only while the hero is on screen (5 s of it, then they rest);
 *   off screen the SVG timeline holds, back on screen it carries on;
 * - the map: a thread lighting up holds on its stop off screen (nothing in the map changes, nothing
 *   animates, the page holds still, nothing takes focus) and carries on back on screen; a hidden tab
 *   holds it too;
 * - the idle tour (desktop): it stops when the map leaves, nothing changes while it is away, and it
 *   starts again once the map has been back and idle.
 */

const braidTime = (page: Page) => page.evaluate(() => (document.querySelector('svg.braid') as SVGSVGElement).getCurrentTime());
const braidPaused = (page: Page) => page.evaluate(() => (document.querySelector('svg.braid') as SVGSVGElement).animationsPaused());

/** click the longest thread (its question on a desktop, its card on a phone): it lights up stop by stop */
async function lightLongest(page: Page) {
  const id = await page.evaluate(() => {
    const m = (window as unknown as { __map: { G: { threads: { id: string; stops: unknown[] }[] } } }).__map;
    return m.G.threads.slice().sort((a, b) => b.stops.length - a.stops.length)[0].id;
  });
  await page.locator(`[data-thread="${id}"]:visible`).first().click();
}

for (const size of SIZES) {
  test.describe(`${size.width}x${size.height}`, () => {
    test.use({ viewport: size });

    test('the hero braid: its dots hold off screen and carry on when the hero is back', async ({ page }) => {
      test.setTimeout(45_000);
      await page.goto('/');
      expect(await braidPaused(page), 'the dots travel on load').toBe(false);
      await place(page, '#home', 'off');
      expect(await braidPaused(page), 'off screen, the braid is paused').toBe(true);
      await watch(page, '#home');
      const t0 = await braidTime(page);
      await page.waitForTimeout(2000);
      expect(await braidTime(page), 'the braid timeline held off screen').toBeCloseTo(t0, 2);
      const s = await read(page, '#home');
      expect(s.moved, 'the page moved by itself').toBeLessThanOrEqual(1);
      expect(s.focusMoved).toBe(false);
      await place(page, '#home', 'on');
      const t1 = await braidTime(page);
      await page.waitForTimeout(800);
      expect(await braidTime(page), 'back on screen, the dots carry on').toBeGreaterThan(t1 + 0.3);
    });

    test('a thread lighting up holds off screen and carries on when the map is back', async ({ page }) => {
      test.setTimeout(45_000);
      await page.goto('/');
      await place(page, '#graph', 'on');
      await lightLongest(page);
      await page.mouse.move(0, 0);
      await expectStill(page, '#graph', 420, 'off', 'the lighting', '#gwrap');
      await place(page, '#graph', 'on');
      const again = await waitForMotion(page, '#gwrap', 2000);
      expect(again.mutations, 'the lighting carries on back on screen').toBeGreaterThan(0);
      expect(again.moved, 'the page moved while it lit').toBeLessThanOrEqual(1);
    });

    test('a hidden tab holds a thread lighting up; visible again, it carries on', async ({ page }) => {
      test.setTimeout(45_000);
      await page.goto('/');
      await place(page, '#graph', 'on');
      await lightLongest(page);
      await setHidden(page, true);
      await page.waitForTimeout(100);
      await watch(page, '#gwrap');
      await page.waitForTimeout(2000);
      const s = await read(page, '#gwrap');
      expect(s.mutations, 'DOM changes in a hidden tab').toBe(0);
      await setHidden(page, false);
      const again = await waitForMotion(page, '#gwrap', 2000);
      expect(again.mutations, 'the lighting carries on once the tab is visible').toBeGreaterThan(0);
    });

    test('the idle tour stops when the map leaves and starts again once it is back', async ({ page }) => {
      test.skip(size.width < 1024, 'the tour does not run on a phone');
      test.setTimeout(90_000);
      await page.goto('/');
      await place(page, '#graph', 'on');
      // the tour starts once the map is in view (its own observer reports it a moment after the scroll)
      await expect.poll(() => page.evaluate(() => (window as unknown as { __map: { tour: () => boolean; touring: () => boolean } }).__map.tour() || (window as unknown as { __map: { touring: () => boolean } }).__map.touring()), { message: 'the tour starts' }).toBe(true);
      await expectStill(page, '#graph', 4800, 'off', 'the tour', '#gwrap');
      await place(page, '#graph', 'on');
      // the tour waits for 9 s of an idle map before it starts again
      const again = await waitForMotion(page, '#gwrap', 14_000);
      expect(again.mutations, 'the tour starts again on an idle map').toBeGreaterThan(0);
      expect(again.moved, 'the page moved while it toured').toBeLessThanOrEqual(1);
    });
  });
}
