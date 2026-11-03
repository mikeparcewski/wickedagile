/* Port of the design lane's chrome_test.py, the agile half: the family header (wicked-web's Topbar, here="agile") and
   footer on wickedagile.com, at 1440x700, 1280x660, 820x1180 and 390x844. The header is the Wicked Agile logo (to the
   page top), the four icon links (the flask a plain link to the lab, bits, Medium, GitHub) and the theme switch, with
   no section links (operator, 2026-11-03): one clean row from 1024 px; below that the lockup, the theme switch and the
   menu button at the right edge, a menu that takes focus, closes on Escape (focus back on its button) and holds the
   four links labelled, each glyph beside its label; on phones the lockup is a 44 px tall target (wicked-web#58). The
   footer is the family footer the other sites carry (operator, 2026-11-03). The reference's cross-site checks (the two
   sites' headers match) live in wicked-web's own harness (B1). */
import { test } from '@playwright/test';
import { Checks, open, ev, same } from './lib';

const LAYOUT = String.raw`const h = document.querySelector('header.topbar').getBoundingClientRect(), nav = document.getElementById('nav');
  const items = [...document.querySelectorAll('header.topbar .wordmark, header.topbar nav.crumbs a[aria-current], #nav a, #themeBtn, #menuBtn')].filter(x => x.getClientRects().length).map(x => x.getBoundingClientRect());
  return {h: h.height, offside: items.filter(r => r.right > innerWidth + 0.5 || r.left < -0.5).length, rows: Math.max(...items.map(r => r.top + r.height / 2)) - Math.min(...items.map(r => r.top + r.height / 2)),
          navShown: getComputedStyle(nav).display !== 'none', overlap: items.some((a, i) => items.some((b, j) => i < j && a.left < b.right - 0.5 && b.left < a.right - 0.5 && a.top < b.bottom - 0.5 && b.top < a.bottom - 0.5))};`;

for (const [w, hgt] of [[1440, 700], [1280, 660], [820, 1180], [390, 844]] as [number, number][]) {
  test(`chrome ${w}x${hgt}: the family header and footer`, async ({ browser, baseURL }) => {
    const c = new Checks();
    const o = await open(browser, baseURL!, { w, h: hgt });
    const pg = o.pg;
    await pg.waitForTimeout(50);
    c.check(`${w}x${hgt}: one header, the family Topbar for the company site, 56 px tall`, await ev(pg, "var h=document.querySelectorAll('header.topbar');return h.length===1&&h[0].classList.contains('topbar--family')&&Math.round(h[0].getBoundingClientRect().height)===56"));
    const lay: any = await ev(pg, LAYOUT);
    if (w <= 760) {
      const mi: any = await ev(pg, "document.getElementById('menuBtn').click(); var r=[...document.querySelectorAll('#nav a.family-ic')].map(a=>{var g=a.querySelector('.family-label svg'),l=a.querySelector('.family-label');if(!g||!l)return false;var gr=g.getBoundingClientRect(),lr=l.getBoundingClientRect();return gr.width>0&&Math.abs((gr.top+gr.bottom)/2-(lr.top+lr.bottom)/2)<6;}); document.getElementById('menuBtn').click(); var b=document.querySelector('header.topbar .wordmark').getBoundingClientRect(); return [r, Math.round(b.height)];");
      c.check(`${w}x${hgt}: in the phone menu each icon sits beside its label; the lockup link is a 44 px tall target (wicked-web#58)`, mi[0].every(Boolean) && mi[0].length === 4 && mi[1] >= 44, mi);
    }
    if (w >= 1024) {
      c.check(`${w}x${hgt}: the header is one clean row (nothing off the side or overlapping)`, lay.navShown && lay.offside === 0 && !lay.overlap && lay.rows < 4, lay);
    } else {
      c.check(`${w}x${hgt}: the phone header is the lockup, the menu and the theme`, !lay.navShown && lay.offside === 0 && !lay.overlap, lay);
      await pg.click('#menuBtn'); await pg.waitForTimeout(150);
      const menu: string[] = await ev(pg, "return [...document.querySelectorAll('#nav a')].filter(a=>a.getClientRects().length).map(a=>(a.querySelector('.family-label')||a).innerText.trim())");
      const order = await ev(pg, "var t=document.getElementById('themeBtn').getBoundingClientRect(), m=document.getElementById('menuBtn').getBoundingClientRect(); return t.right <= m.left && m.right <= innerWidth;");
      c.check(`${w}x${hgt}: the theme switch, then the menu button at the right edge (the shipped Topbar's order)`, order);
      c.check(`${w}x${hgt}: opening the menu moves focus into it`, await ev(pg, "return document.activeElement && document.activeElement.closest('#nav') !== null"));
      await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
      const esc = await ev(pg, "return [document.getElementById('nav').classList.contains('open'), document.getElementById('menuBtn').getAttribute('aria-expanded'), document.activeElement.id]");
      c.check(`${w}x${hgt}: Escape closes the menu and puts focus back on its button`, same(esc, [false, 'false', 'menuBtn']), esc);
      c.check(`${w}x${hgt}: the phone menu holds the lab, bits, Medium and GitHub, labelled, and no section links`, same(menu, ['Wicked Labs', 'wicked bits', 'Medium', 'GitHub']), menu);
    }
    if (w === 1440) {
      const ln = await ev(pg, "var a=document.querySelector('header.topbar .wordmark');return [a.getAttribute('href'), a.getAttribute('aria-label'), !!document.querySelector('header nav.crumbs, header .pkg')]");
      c.check('agile lockup: the Wicked Agile logo, to the page top, no path', same(ln, ['#top', 'Wicked Agile, home', false]), ln);
      const fl: any = await ev(pg, "var a=[...document.querySelectorAll('#nav a.family-ic')]; return [a.map(x=>x.getAttribute('href')), a[0].tagName, !!document.querySelector('header [aria-haspopup], header .dropdown-menu'), document.querySelectorAll('#nav a.family-sec, #nav .family-sep').length]");
      c.check('the flask is a plain link to the lab (no menu); bits, Medium, GitHub and the theme stay; no section links', same(fl[0], ['https://wickedlabs.ai/', 'https://bits.wickedagile.com/', 'https://medium.com/@mike.parcewski', 'https://github.com/mikeparcewski']) && fl[1] === 'A' && !fl[2] && fl[3] === 0, fl);
    }
    const ft: any = await ev(pg, "var f=document.querySelectorAll('footer'),r=f[0]&&f[0].getBoundingClientRect();return [f.length, f[0]&&f[0].className, !!document.querySelector('footer.family-byline, footer.byline'), r?[Math.round(r.left), Math.round(r.right)]:null, f[0]&&f[0].parentElement.tagName]");
    c.check(`${w}x${hgt}: one footer, the family footer, spanning the page after the four frames`, ft[0] === 1 && /\bfooter\b/.test(ft[1]) && !ft[2] && ft[3][0] <= 1 && ft[3][1] >= w - 1 && ft[4] === 'BODY', ft);
    // review r1: the skip link, once focused, shows above the fixed header
    await pg.goto(baseURL!.replace(/\/$/, '') + '/'); await pg.waitForTimeout(200); await pg.keyboard.press('Tab');
    const sk: any = await ev(pg, "var a=document.activeElement,r=a.getBoundingClientRect(),hit=document.elementFromPoint(r.left+r.width/2,r.top+r.height/2);return [a.className, !!hit&&(hit===a||a.contains(hit)), r.top>=0]");
    c.check(`${w}x${hgt}: the first Tab shows the skip link, above the header`, sk[0] === 'skip' && sk[1] && sk[2], sk);
    if (w === 1440) {   // review r2: a resize that hides nothing leaves focus on the (fixed) skip link
      await pg.setViewportSize({ width: 1400, height: hgt }); await pg.waitForTimeout(700);
      c.check('a resize keeps focus on the focused skip link', (await ev(pg, 'return document.activeElement.className')) === 'skip', await ev(pg, 'return document.activeElement.className'));
    }
    c.check(`${w}x${hgt}: no page errors`, !o.errs.length, o.errs);
    await o.ctx.close();
    c.done();
  });
}
