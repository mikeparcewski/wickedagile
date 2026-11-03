import { expect, test } from '@playwright/test';

// Smoke for the v3 company site (DES-SITES-V2 rev 10.2-final, the approved mockup served as the page).
// The full ports of the mockup's suites (test3, audit3, frames, chrome) land with the Astro build (B3).

const VIEWPORTS = [
  { width: 1440, height: 700 },
  { width: 1280, height: 660 },
  { width: 390, height: 844 },
];

for (const vp of VIEWPORTS) {
  test(`renders at ${vp.width}x${vp.height}: hero, four frames, no errors, no sideways scroll, no remote requests`, async ({ page, baseURL }) => {
    const errors: string[] = [];
    const remote: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('request', (r) => {
      const u = new URL(r.url());
      if (u.protocol.startsWith('http') && u.origin !== new URL(baseURL!).origin) remote.push(r.url());
    });
    await page.setViewportSize(vp);
    await page.goto('/', { waitUntil: 'networkidle' });

    await expect(page.locator('h1').first()).toHaveText('We write about the work. The tools are the receipts.');
    for (const id of ['graph', 'learn', 'work']) await expect(page.locator(`#${id}`)).toHaveCount(1);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
    expect(errors).toEqual([]);
    expect(remote).toEqual([]);
  });
}

test('production page carries no mockup or draft wording', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page).toHaveTitle('Wicked Agile: we write about the work and build the tools for it');
  const text = await page.evaluate(() => document.body.innerText);
  expect(text).not.toMatch(/mockup|drafts for the operator|\(draft\)|Related, draft/i);
  await expect(page.locator('.draft')).toHaveCount(0);
});

test('header links go to the live family sites', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const hrefs = await page.locator('header a[href^="http"]').evaluateAll((as) => as.map((a) => a.getAttribute('href')));
  expect(hrefs).toContain('https://wickedlabs.ai/');
  expect(hrefs.some((h) => h?.startsWith('https://bits.wickedagile.com'))).toBe(true);
});

test('header carries no section links (operator, 2026-11-03)', async ({ page }) => {
  for (const vp of [{ width: 1440, height: 700 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(vp);
    await page.goto('/', { waitUntil: 'networkidle' });
    await expect(page.locator('header a[href^="#graph"], header a[href^="#learn"], header a[href^="#work"]')).toHaveCount(0);
    await expect(page.locator('header .nsep')).toHaveCount(0);
  }
});


test('footer is the family footer the other sites carry (operator, 2026-11-03)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  const f = page.locator('footer.footer');
  await expect(f).toHaveCount(1);
  await expect(page.locator('footer.byline')).toHaveCount(0);
  for (const name of ['studio', 'crew', 'garden', 'estate', 'bits']) await expect(f.locator('.footer-links a', { hasText: name })).toHaveCount(1);
  for (const head of ['Experience', 'Control', 'Capability', 'Foundation', 'Media']) await expect(f.locator('.footer-col-head', { hasText: head })).toHaveCount(1);
  // it spans the page, as on the family sites
  const box = await f.boundingBox();
  expect(box!.x).toBeLessThanOrEqual(1);
});

for (const vp of [{ width: 1440, height: 700 }, { width: 1280, height: 660 }, { width: 390, height: 844 }]) {
  test(`the hero's Work line runs on and ends beside "Follow a thread" at ${vp.width}x${vp.height} (operator, 2026-11-03)`, async ({ page }) => {
    await page.setViewportSize(vp);
    await page.goto('/', { waitUntil: 'networkidle' });
    const end = await page.evaluate(() => {
      const c = document.querySelector('.braid-run circle.cap') as SVGCircleElement | null;
      const h = document.getElementById('gh')!.getBoundingClientRect();
      if (!c) return null;
      return { cx: +c.getAttribute('cx')!, cy: +c.getAttribute('cy')!, r: +c.getAttribute('r')!, hl: h.left + scrollX, ht: h.top + scrollY, hb: h.bottom + scrollY, d: document.querySelector('.braid-run path.tube')!.getAttribute('d') };
    });
    expect(end).not.toBeNull();
    expect(end!.r).toBeGreaterThan(0);
    expect(end!.d).toMatch(/^M[\d.]+ [\d.]+ Q/);
    // the end sits beside the heading (left of it, within its height) or, where the gutter is too narrow, just above it
    const beside = end!.cx < end!.hl && end!.cy >= end!.ht && end!.cy <= end!.hb;
    const above = end!.cy < end!.ht && end!.ht - end!.cy < 40 && Math.abs(end!.cx - end!.hl) < 40;
    expect(beside || above).toBe(true);
    expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
  });
}

test('the map has no Video filter and no video placeholders (operator, 2026-11-03)', async ({ page }) => {
  await page.goto('/', { waitUntil: 'networkidle' });
  await expect(page.locator('[data-pill="video"]')).toHaveCount(0);
  for (const id of ['article', 'bit', 'repository', 'other']) await expect(page.locator(`[data-pill="${id}"]`)).toHaveCount(1);
  expect(await page.evaluate(() => /Video/.test(document.querySelector('#graph')!.textContent || '') || /none yet/i.test(document.body.innerText))).toBe(false);
});

test('media queries use max-width/min-width, which Safari before 16.4 understands (wickedagile#71)', async ({ request }) => {
  const html = await (await request.get('/')).text();
  // the page's own HTML and every stylesheet it links (the Astro build bundles its CSS into /_astro/*.css)
  // every <link rel=stylesheet>, whatever the attribute order; there must be at least one (or the check reads nothing)
  const sheets = [...html.matchAll(/<link\b[^>]*>/g)].map((m) => m[0]).filter((t) => /\brel="?stylesheet\b/.test(t)).map((t) => (t.match(/\bhref="([^"]+)"/) || [])[1]).filter(Boolean) as string[];
  expect(sheets.length).toBeGreaterThan(0);
  const css = await Promise.all(sheets.map(async (h) => (await request.get(h)).text()));
  for (const [where, text] of [['index.html', html], ...sheets.map((h, i) => [h, css[i]])]) {
    expect(text.match(/@media\s*\(\s*width\s*[<>]/g) ?? [], where).toEqual([]);
  }
});

