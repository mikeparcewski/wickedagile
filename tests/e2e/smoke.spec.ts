/* Port of the design lane's shoot.py, the agile half: the render smoke. Every state of the company site (the reference's
   twelve plus the final review's seven: the question preview, each side off, the type pills off, the empty state, the
   open menu and the footer), at 1440x700, 1280x660 and 390x844, in Wicked Dark and Wicked Light. Each state must show
   no sideways scroll, no element running off the side, no clipped text, no words fused across an inline tag, no text
   under WCAG contrast (4.5:1, 3:1 large), no request to another origin and no page error or console error. CHECK is the
   reference's probe, verbatim. A screenshot of each state is written to test-results/smoke/. */
import { test, expect } from '@playwright/test';
import { open, call, ev } from './lib';

const CHECK = String.raw`() => {
 const W = innerWidth, out = {hscroll: document.documentElement.scrollWidth - W, overflow: [], clipped: [], fused: [], contrast: []};
 const vis = e => { const r = e.getBoundingClientRect(); const cs = getComputedStyle(e); return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none' && r.bottom > 0 && r.top < innerHeight; };
 const sel = e => e.tagName.toLowerCase() + (e.id ? '#' + e.id : '') + (e.className && typeof e.className === 'string' ? '.' + e.className.trim().split(/\s+/).slice(0,2).join('.') : '');
 for (const e of document.querySelectorAll('body *')) {
   if (!vis(e) || e.closest('svg') || e.closest('.sr,.skip,.skip-steps,.mobsr')) continue;
   const r = e.getBoundingClientRect();
   if ((r.right > W + 1 || (r.right > W - 1 && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()))) && !e.closest('.pbody,.cmd,.receipt,.tcards,.controls')) out.overflow.push(sel(e) + ' right=' + Math.round(r.right));
   const cs = getComputedStyle(e);
   if ((cs.overflow === 'hidden' || cs.textOverflow === 'ellipsis') && e.scrollWidth > e.clientWidth + 1 && e.childElementCount < 3 && e.textContent.trim()) out.clipped.push(sel(e) + ' "' + e.textContent.trim().slice(0,40) + '"');
 }
 const inl = new Set(['B','STRONG','A','CODE','SPAN','EM','I','SMALL','LABEL']);
 const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_ELEMENT);
 const AN = /[A-Za-z0-9’]/;
 while (walker.nextNode()) { const e = walker.currentNode; if (!inl.has(e.tagName) || !vis(e) || getComputedStyle(e).display !== 'inline') continue;
   const t = e.textContent; if (!t) continue; const p = e.previousSibling, n = e.nextSibling;
   if (p && p.nodeType === 3 && p.textContent.length && AN.test(p.textContent.slice(-1)) && AN.test(t[0])) out.fused.push('before ' + sel(e) + ': "' + p.textContent.slice(-12) + '|' + t.slice(0,12) + '"');
   if (n && n.nodeType === 3 && n.textContent.length && AN.test(t.slice(-1)) && AN.test(n.textContent[0])) out.fused.push('after ' + sel(e) + ': "' + t.slice(-12) + '|' + n.textContent.slice(0,12) + '"'); }
 const parse = c => { let m = c.match(/rgba?\(([^)]+)\)/); if (m) { const v = m[1].split(/[ ,\/]+/).filter(Boolean).map(Number); return [v[0], v[1], v[2], v.length > 3 ? v[3] : 1]; }
   m = c.match(/color\(srgb ([^)]+)\)/); if (m) { const v = m[1].split(/[ \/]+/).filter(Boolean).map(Number); return [v[0]*255, v[1]*255, v[2]*255, v.length > 3 ? v[3] : 1]; } return null; };
 const lum = c => { const f = x => { x /= 255; return x <= 0.03928 ? x / 12.92 : Math.pow((x + 0.055) / 1.055, 2.4); }; return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]); };
 const blend = (top, bot) => [top[0]*top[3] + bot[0]*(1-top[3]), top[1]*top[3] + bot[1]*(1-top[3]), top[2]*top[3] + bot[2]*(1-top[3]), 1];
 const bgOf = e => { const stack = []; for (let x = e; x; x = x.parentElement) { const c = parse(getComputedStyle(x).backgroundColor); if (c && c[3] > 0) { stack.push(c); if (c[3] >= 1) break; } }
   let b = [255,255,255,1]; if (!stack.length || stack[stack.length-1][3] < 1) b = parse(getComputedStyle(document.body).backgroundColor) || b; for (let k = stack.length - 1; k >= 0; k--) b = blend(stack[k], b); return b; };
 for (const e of document.querySelectorAll('body *')) { if (!vis(e) || e.closest('svg') || e.closest('.sr') || e.closest('[disabled]')) continue;
   const own = [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()); if (!own) continue;
   const cs = getComputedStyle(e); let fg = parse(cs.color); if (!fg) continue; const op = parseFloat(cs.opacity); let o = 1; for (let x = e; x; x = x.parentElement) o *= parseFloat(getComputedStyle(x).opacity); if (o < 0.05) continue;
   const bg = bgOf(e); fg = blend([fg[0], fg[1], fg[2], fg[3] * o], bg);
   const L1 = lum(fg), L2 = lum(bg), ratio = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
   const size = parseFloat(cs.fontSize), bold = parseInt(cs.fontWeight) >= 600, large = size >= 24 || (bold && size >= 18.66);
   const need = large ? 3 : 4.5; if (ratio < need) out.contrast.push(sel(e) + ' ' + ratio.toFixed(2) + ' "' + e.textContent.trim().slice(0, 30) + '"'); }
 out.overflow = out.overflow.slice(0, 8); out.clipped = out.clipped.slice(0, 8); out.contrast = [...new Set(out.contrast)].slice(0, 12); out.fused = [...new Set(out.fused)].slice(0, 12);
 return out; }`;

// [name, query, script after load, scroll target]
const STATES: [string, string, string, string | null][] = [
  ['01-hero', '', '', null],
  ['02-map-overview', '', '__map.choose(null)', '#graph'],
  ['03-hover', '', "__map.choose(null);__map.hover('code-is-cheap')", '#graph'],
  ['04-framed-pulse', '?thread=checks&step=5', '', null],
  ['05-stays-in-learn', '?thread=green&step=3', '', null],
  ['06-crossroads', '', "__map.choose(null);__map.select('code-is-cheap')", '#graph'],
  ['07-featured-studio', '?node=studio', '', null],
  ['08-filter', '?type=essay&topic=fiction', '', null],
  ['09-phone-thread', '?thread=state&step=3', '', null],
  ['10-learn', '', '', '#learn'],
  ['11-learn-show-all', '', "document.getElementById('showAll').click()", '#learn'],
  ['12-work', '', '', '#work'],
  ['13-question-preview', '', "__map.choose(null);document.querySelector('.q[data-thread=\"checks\"]').focus()", '#graph'],
  ['14-learn-off', '?learn=0', '', '#graph'],
  ['15-work-off', '?work=0', '', '#graph'],
  ['16-type-pills-off', '?off=article,repository', '', '#graph'],
  ['17-empty-state', '?learn=0&work=0', '', '#graph'],
  ['18-menu-open', '', "var b=document.getElementById('menuBtn');if(b&&b.offsetParent)b.click()", null],
  ['19-footer', '', '', 'footer.footer'],
];
const VPS: [number, number][] = [[1440, 700], [1280, 660], [390, 844]];

test('render smoke: a console message from the first script is caught (the listener is on before the page loads)', async ({ browser, baseURL }) => {
  const o = await open(browser, baseURL!, { w: 1440, h: 700, init: "console.warn('wa-startup-probe')" });
  expect(o.cons.some((m) => m.includes('wa-startup-probe'))).toBe(true);
  await o.ctx.close();
});

for (const [w, h] of VPS) for (const theme of ['dark', 'light'] as const) {
  test(`render smoke ${w}x${h} ${theme}: every state renders clean`, async ({ browser, baseURL }) => {
    test.setTimeout(150_000);
    const issues: string[] = [];
    for (const [name, q, js, target] of STATES) {
      const o = await open(browser, baseURL!, { w, h, reduced: false, scheme: theme, url: (q ? q + '&' : '?') + 'theme=' + theme });
      await o.pg.waitForTimeout(2700);   // the hero's braid takes 2.1 s to settle
      if (js) { await ev(o.pg, js); await o.pg.waitForTimeout(450); }
      if (target) for (let i = 0; i < 2; i++) {
        await ev(o.pg, `const el = document.querySelector('${target}'); if (el) el.scrollIntoView({block:'start'});`);
        await o.pg.waitForTimeout(target === '#graph' ? 2300 : 500);
      }
      const res: any = await call(o.pg, CHECK, null);
      await o.pg.screenshot({ path: `test-results/smoke/agile-${name}-${w}x${h}-${theme}.png` });
      const bad: Record<string, unknown> = {};
      for (const k of ['overflow', 'clipped', 'fused', 'contrast']) if (res[k].length) bad[k] = res[k];
      if (res.hscroll > 0) bad.hscroll = res.hscroll;
      if (o.external.length) bad.external = o.external;
      if (o.errs.length || o.cons.length) bad.errors = [...o.errs, ...o.cons];
      if (Object.keys(bad).length) issues.push(`${name}: ${JSON.stringify(bad).slice(0, 900)}`);
      await o.ctx.close();
    }
    expect(issues).toEqual([]);
  });
}
