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

