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

  test('the experience capstone previews studio as a site, not a code card', async ({ page }) => {
    // Was "the experience skins preview: studio swaps to the code card, interactive back to a
    // site". Both halves stopped being true. studio was carved out into its own repo and has its
    // own site at ws.wickedagile.com, so it previews in the browser frame like every other plane
    // product -- nothing renders the code card now. And interactive is no longer a second block
    // here at all: it moved to Foundation as the document engine with no site, and
    // wi.wickedagile.com redirects to ws.wickedagile.com.
    const studio = page.locator('#projects .block', { hasText: 'wicked-studio' });
    await studio.scrollIntoViewIfNeeded();

    await expect(async () => {
      await studio.click();
      await expect(page.locator('#crumbName')).toHaveText('wicked-studio', { timeout: 2_000 });
    }).toPass({ timeout: 15_000 });

    expect(page.url()).toContain('127.0.0.1');

    await expect(page.locator('#browserFrame')).toBeVisible();
    await expect(page.locator('#codeCard')).toBeHidden();
    await expect(page.locator('#previewUrl')).toHaveText('ws.wickedagile.com');
    await expect(studio).toHaveAttribute('aria-current', 'true');

    // The capstone holds exactly one block now.
    await expect(page.locator('#solutionCap .block')).toHaveCount(1);
    // And interactive is not one of the stack's blocks.
    await expect(page.locator('#projects .block', { hasText: 'wicked-interactive' })).toHaveCount(0);
  });

  test('all four product blocks sit on one vertical edge', async ({ page }) => {
    // REGRESSION GUARD. The three plane rows (.layer) are a grid whose first
    // column holds the CONTROL / CAPABILITY / FOUNDATION label, so their block
    // starts one label-column in. The experience capstone had no such column,
    // so wicked-studio's chip started 95px to the LEFT of the other three and
    // the stack read as broken. Measured at 1440x700 before the fix:
    //   wicked-studio left=103 · crew/garden/estate left=198  (spread 95)
    // .solution-cap now mirrors .layer's grid via the shared --label-col /
    // --label-gap / --row-pad-l / --rail-w tokens on .stack, so the four
    // blocks land on one edge by construction, not by a tuned magic number.
    //
    // Measure at 1440x700 — a real laptop viewport. 1440x900 is taller than
    // one and hides layout problems in this section.
    await page.setViewportSize({ width: 1440, height: 700 });
    await page.locator('#stackRoot').scrollIntoViewIfNeeded();

    const lefts = await page
      .locator('#projects .block')
      .evaluateAll((els) => els.map((el) => Math.round(el.getBoundingClientRect().left)));

    // studio + crew + garden + estate.
    expect(lefts).toHaveLength(4);
    // Sub-pixel rounding is the only tolerance; 95px of drift is not.
    expect(Math.max(...lefts) - Math.min(...lefts)).toBeLessThanOrEqual(1);

    // And say it the other way round: the capstone's block column starts where
    // the plane rows' block column starts.
    const capBlocksLeft = await page
      .locator('#solutionCap .cap-blocks')
      .evaluate((el) => Math.round(el.getBoundingClientRect().left));
    const layerBlocksLeft = await page
      .locator('#projects .layer .layer-blocks')
      .first()
      .evaluate((el) => Math.round(el.getBoundingClientRect().left));
    expect(capBlocksLeft).toBe(layerBlocksLeft);

    // Blocks on one edge was NOT enough. It passed while the capstone still put its label on a
    // row of its OWN above the chip -- the block lined up, but the capstone was a two-row grid
    // among three single-row ones, so wicked-studio still read as a different kind of thing.
    // Reported a second time as "studio isn't aligned with the other products".
    // So also assert the four ROWS have the same shape: every plane label on one left edge, and
    // each label vertically centred against its own product chip rather than stacked above it.
    const labels = await page
      .locator('#projects .cap-head, #projects .layer-label')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { left: Math.round(r.left), mid: Math.round(r.top + r.height / 2) };
        }),
      );
    const blocks = await page
      .locator('#projects .block')
      .evaluateAll((els) =>
        els.map((el) => {
          const r = el.getBoundingClientRect();
          return { mid: Math.round(r.top + r.height / 2) };
        }),
      );

    expect(labels).toHaveLength(4);
    const labelLefts = labels.map((l) => l.left);
    expect(
      Math.max(...labelLefts) - Math.min(...labelLefts),
      'the four plane labels do not share a left edge',
    ).toBeLessThanOrEqual(1);

    // Same row => label midpoint within a few px of its block's midpoint. When the label sat
    // above the chip this gap was ~24px.
    labels.forEach((l, i) => {
      expect(
        Math.abs(l.mid - blocks[i].mid),
        `plane label ${i} is not on the same row as its product block`,
      ).toBeLessThanOrEqual(6);
    });
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

    // Home jumps to the top of the stack (studio, the first block in DOM order). It previews as
    // a site now that it has one, so the browser frame is what shows -- not the code card.
    await page.keyboard.press('Home');
    const studio = page.locator('#projects .block', { hasText: 'wicked-studio' });
    await expect(studio).toBeFocused();
    await expect(studio).toHaveAttribute('aria-current', 'true');
    await expect(page.locator('#browserFrame')).toBeVisible();
    await expect(page.locator('#previewUrl')).toHaveText('ws.wickedagile.com');
  });
});
