import { expect, test, type Browser } from '@playwright/test';

// The lab links (Work's "Open in the lab", the cards' titles, the header and footer). wickedlabs.ai is one page that
// routes by hash: a product's view is https://wickedlabs.ai/#/<id>, and a path under it (wickedlabs.ai/crew/) is
// GitHub Pages' 404. The first test reads the built page; the second opens every lab link it renders on the live lab
// and fails on a 404, a page error, or a view that is not the card's product. The deploy build runs both on the page
// it is about to publish (pages.yml), whose links come from the live export or the file the site last served.

const LAB = 'https://wickedlabs.ai/';
const PRODUCT = /^https:\/\/wickedlabs\.ai\/#\/([a-z-]+)$/;

async function labLinks(browser: Browser, baseURL: string) {
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const pg = await ctx.newPage();
  await pg.route('**/*', (r) => (new URL(r.request().url()).origin === new URL(baseURL).origin ? r.continue() : r.abort()));
  await pg.goto(baseURL.replace(/\/$/, '') + '/', { waitUntil: 'load' });
  const links: { href: string; card: string | null; where: string }[] = await pg.evaluate(() =>
    [...document.querySelectorAll<HTMLAnchorElement>('a[href*="wickedlabs.ai"]')].map((a) => ({
      href: a.getAttribute('href') || '',
      card: a.closest<HTMLElement>('#work [data-node]')?.dataset.node ?? null,
      where: a.closest('#work') ? 'work' : a.closest('header') ? 'header' : a.closest('footer') ? 'footer' : 'page',
    })));
  await ctx.close();
  return links;
}

test("every lab link the page renders is the lab itself or a product's view, #/<id>, on its own card", async ({ browser, baseURL }) => {
  const links = await labLinks(browser, baseURL!);
  const cards = links.filter((l) => l.card);
  // studio's card carries two (its title and "Open in the lab"); crew, garden and estate one each (the title)
  expect(cards.map((l) => l.card).sort()).toEqual(['crew', 'estate', 'garden', 'studio', 'studio']);
  // and the rest are present too, so a lab link that moves off the lab's address drops out of this list and fails here:
  // the header's flask, and Work's own two (the "wickedlabs.ai" line and "Visit the lab")
  expect(links.filter((l) => l.where === 'header').length, "the header's lab link").toBeGreaterThan(0);
  expect(links.filter((l) => l.where === 'work' && !l.card).length, "Work's own lab links").toBe(2);
  for (const l of links) {
    if (l.card) expect(l.href, `the ${l.card} card's lab link`).toBe(`${LAB}#/${l.card}`);
    else expect(l.href, `the ${l.where}'s lab link`).toBe(LAB);
  }
});

test('every lab link opens the right lab view: a 200 page, the card\'s product, no page errors', async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const hrefs = [...new Set((await labLinks(browser, baseURL!)).map((l) => l.href))];
  const fails: string[] = [];
  const routes = hrefs.filter((h) => PRODUCT.test(h)).map((h) => PRODUCT.exec(h)![1]).sort();
  if (routes.join() !== 'crew,estate,garden,studio') fails.push(`the page links the lab views ${JSON.stringify(routes)}, not studio, crew, garden and estate`);
  for (const vp of [{ width: 1440, height: 900 }, { width: 390, height: 844 }]) {
    for (const href of hrefs) {
      const ctx = await browser.newContext({ viewport: vp });
      const pg = await ctx.newPage();
      const errs: string[] = [];
      pg.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
      const res = await pg.goto(href, { waitUntil: 'load' });
      const at = `${href} at ${vp.width}x${vp.height}`;
      if (!res || res.status() !== 200) fails.push(`${at}: HTTP ${res ? res.status() : 'no response'}`);
      const id = PRODUCT.exec(href)?.[1];
      if (id) {
        // the lab renders an unknown route as its home page, so the view must be this product's own page
        const comp = await pg.locator('.cpage [data-open-parts][data-comp]').first().getAttribute('data-comp', { timeout: 15_000 }).catch(() => null);
        if (comp !== id) fails.push(`${at}: the lab shows ${comp ? `${comp}'s page` : 'no product page'}, not ${id}'s`);
      } else if (href !== LAB) {
        fails.push(`${at}: not the lab page or a lab view (#/<id>)`);
      } else {
        // the lab's home page, as its script draws it (the static markup is the no-script fallback)
        const home = await pg.locator('#main .hero #h1').waitFor({ timeout: 15_000 }).then(() => true, () => false);
        if (!home || (await pg.locator('.cpage').count())) fails.push(`${at}: not the lab's home page`);
      }
      await pg.waitForTimeout(250);
      if (errs.length) fails.push(`${at}: page errors ${JSON.stringify(errs)}`);
      await ctx.close();
    }
  }
  expect(fails).toEqual([]);
});
