/* Port of the design lane's frames.py, the agile half (DES-SITES-V2 §4.7, the frame rule): every snap frame of the
   company site (the hero, the map, Learn, Learn with Show all, Learn with no match, Learn under the Work-only door, Work)
   at 1440x700, 1280x660, 1920x1080, 390x844 and 360x740. Desktop: nothing overflows the frame and the gaps above and
   below the content differ by no more than 10% of the frame height; the map has at least 40 px above and below at
   1440x700 and 1280x660. Phones: nothing overflows and no gap (above, between blocks, inside a block, below) is over
   15% of the viewport height. Every block stays inside the frame's width, nothing is cut off sideways, and the page
   doesn't scroll sideways. MEASURE is the reference's probe, verbatim but for the header's selector. */
import { test, expect } from '@playwright/test';
import { open, call } from './lib';

const MEASURE = String.raw`([sel, kidsSel, js, blocksSel]) => {
  if (js) eval(js);
  const el = document.querySelector(sel); if (!el) return {missing: sel};
  el.scrollIntoView({block: 'start', behavior: 'instant'});
  let hdr = document.querySelector('header.topbar').getBoundingClientRect().bottom;
  const stg = document.querySelector('.stage');   // the lab's map strip is sticky over the steps on phones and tablets
  const r = el.getBoundingClientRect();
  if (stg && el.classList.contains('slide') && getComputedStyle(stg).position === 'sticky') {   // only when the strip is over the step, not beside it
    const sb = stg.getBoundingClientRect(); if (sb.top <= hdr + 1 && sb.left < r.right && sb.right > r.left) hdr = Math.max(hdr, sb.bottom); }
  let top = Math.max(r.top, hdr), bot = Math.min(r.bottom, innerHeight);
  if (blocksSel) { top = document.querySelector('header.topbar').getBoundingClientRect().bottom; bot = innerHeight; }
  const box = kidsSel ? el.querySelector(kidsSel) : el;
  const shown = k => { const c = getComputedStyle(k); return c.display !== 'none' && c.visibility !== 'hidden' && k.getClientRects().length && k.getBoundingClientRect().height > 0.5 && !k.classList.contains('note'); };
  const flat = els => els.flatMap(k => getComputedStyle(k).display === 'contents' ? flat([...k.children]) : [k]);   // a display:contents wrapper has no box of its own
  const blocks = (blocksSel ? [...document.querySelectorAll(blocksSel)] : flat([...box.children])).filter(shown).map(k => {
    const core = k.querySelector('svg .core'), ph = innerWidth <= 760;
    let t, bt;
    if (core) {   // desktop: the composition box; phone: the box plus the shared line it sends on down
      const c = core.getBoundingClientRect(); t = c.top; bt = c.bottom;
      if (ph) { const tb = k.querySelector('svg .tube'); if (tb) bt = Math.max(bt, Math.min(tb.getBoundingClientRect().bottom, innerHeight)); }
    } else {
      const b = k.getBoundingClientRect(), oy = getComputedStyle(k).overflowY; t = b.top;
      bt = (oy === 'auto' || oy === 'scroll') ? b.bottom : Math.max(b.bottom, b.top + k.scrollHeight);   // spilled content counts; a scroller is its box
    }
    const kb = k.getBoundingClientRect(), kb0 = () => k.getBoundingClientRect();
    // nested gaps: merge the vertical extents of every visible leaf (text, art, controls) inside the block, at any depth;
    // a scroller counts as one leaf, and so does an svg
    // a leaf is an svg, a scroller, a box you can see (a border or a background: a card, a panel) or an element with no visible children
    const boxed = c => { const cs = getComputedStyle(c); return parseFloat(cs.borderTopWidth) > 0 && cs.borderTopStyle !== 'none' || (cs.backgroundColor !== 'rgba(0, 0, 0, 0)' && cs.backgroundColor !== 'transparent'); };
    const leaves = []; const walk = x => { for (const c of x.children) { if (getComputedStyle(c).display === 'contents') { walk(c); continue; }   // a display:contents wrapper has no box of its own
        if (!shown(c)) continue; const oy = getComputedStyle(c).overflowY;
        const ownText = [...c.childNodes].some(n => n.nodeType === 3 && n.nodeValue.trim());   // a paragraph with inline spans is one piece of text
        if (c.tagName.toLowerCase() === 'svg' || oy === 'auto' || oy === 'scroll' || boxed(c) || ownText || ![...c.children].some(shown)) { const r = c.getBoundingClientRect(); if (r.height > 0.5) leaves.push(r); } else walk(c); } };
    if (boxed(k)) leaves.push(kb0()); else walk(k);
    { const oy = getComputedStyle(k).overflowY; if (oy === 'auto' || oy === 'scroll') { const vb = kb0(); for (let i = leaves.length - 1; i >= 0; i--) if (leaves[i].top >= vb.bottom || leaves[i].bottom <= vb.top) leaves.splice(i, 1); } }   // a scroller: only what shows
    leaves.sort((a, b) => a.top - b.top);
    let ig = 0, edge = leaves.length ? leaves[0].bottom : 0;
    if (leaves.length) ig = Math.max(leaves[0].top - k.getBoundingClientRect().top, 0);   // the block's own leading space counts as a gap
    for (const c of leaves.slice(1)) { ig = Math.max(ig, c.top - edge); edge = Math.max(edge, c.bottom); }
    if (leaves.length) ig = Math.max(ig, k.getBoundingClientRect().bottom - edge);          // and its trailing space
    // clipping inside the block: a visible text or control cut off sideways by an ancestor that hides overflow (a line clamp or an ellipsis is deliberate)
    const cut = []; for (const c of k.querySelectorAll('a,button,code,h2,h3,p,span,b,small,li')) { if (!shown(c) || c.closest('svg') || c.closest('.sr')) continue;   // screen-reader text is clipped on purpose
      const cs = getComputedStyle(c); if (cs.webkitLineClamp !== 'none' && cs.webkitLineClamp || cs.textOverflow === 'ellipsis') continue;
      if (cs.clipPath !== 'none' || c.getBoundingClientRect().width <= 1) continue;   // visually hidden on purpose (a skip link until focused)
      if ((cs.overflowX === 'hidden' || cs.overflowX === 'clip') && c.scrollWidth > c.clientWidth + 1 && c.textContent.trim()) { cut.push(c.textContent.trim().slice(0, 24)); continue; }   // clipped inside its own box
      const r = c.getBoundingClientRect();
      for (let p = c.parentElement; p && p !== el.parentElement; p = p.parentElement) {   /* up to the frame itself, which clips too */ const ps = getComputedStyle(p);
        if (ps.webkitLineClamp && ps.webkitLineClamp !== 'none' || ps.textOverflow === 'ellipsis') break;
        if (ps.overflowX === 'auto' || ps.overflowX === 'scroll') break;   /* inside a swipe row: reachable by scrolling, not clipped */
        if (ps.overflowX === 'hidden' || ps.overflowX === 'clip') {   // a scroller (a swipe row) is not a clip
        const pr = p.getBoundingClientRect(); if (r.right > pr.right + 1 || r.left < pr.left - 1) cut.push((c.textContent || c.tagName).trim().slice(0, 24)); break; } } }
    return {name: (k.className && typeof k.className === 'string' ? k.className.split(' ')[0] : k.tagName.toLowerCase()) + (core ? '(core)' : ''), t: t, b: bt, l: kb.left, r: kb.right, ig: ig, cut: cut.slice(0, 3)};
  });
  const clipped = el.scrollHeight > el.clientHeight + 1 && getComputedStyle(el).overflowY === 'hidden';
  const inner = [...el.querySelectorAll('.ed')].filter(x => x.scrollHeight > x.clientHeight + 1).length;
  const hs = document.documentElement.scrollWidth - innerWidth;
  return {top, bot, blocks, clipped, inner, H: innerHeight, W: innerWidth, hs};
}`;

const FRAMES: [string, string, string, string][] = [
  ['hero', '#home', '.wrap', ''], ['map', '#graph', '.wrap', ''], ['learn', '#learn', '.wrap', ''],
  ['learn, show all', '#learn', '.wrap', "document.getElementById('showAll').click()"],
  ['learn, no matches (every Learn type off)', '#learn', '.wrap', '__map.set({off:{article:true,bit:true}})'],
  ['learn, Work only (Learn off)', '#learn', '.wrap', '__map.set({learn:false})'],
  ['work', '#work', '.wrap', ''],
];
const VPS: [number, number][] = [[1440, 700], [1280, 660], [1920, 1080], [390, 844], [360, 740]];

for (const [w, h] of VPS) {
  test(`frames ${w}x${h}: every frame centred, nothing cut off, the map's 40 px margins`, async ({ browser, baseURL }) => {
    const ph = w <= 760;
    const out: string[] = [], bad: string[] = [];
    for (const [name, sel, kids, js] of FRAMES) {
      const o = await open(browser, baseURL!, { w, h, url: '?theme=dark' });
      await call(o.pg, MEASURE, [sel, kids, js, '']); await o.pg.waitForTimeout(500);
      const m: any = await call(o.pg, MEASURE, [sel, kids, '', '']);
      await o.ctx.close();
      if (m.missing) { bad.push(`${name}: no element ${m.missing}`); continue; }
      const fh = m.bot - m.top; const bl = [...m.blocks].sort((a: any, b: any) => a.t - b.t);
      const ut = Math.min(...bl.map((x: any) => x.t)), ub = Math.max(...bl.map((x: any) => x.b));
      const above = ut - m.top, below = m.bot - ub;
      const errs: string[] = [];
      const wide = bl.filter((x: any) => x.l < -1 || x.r > m.W + 1).map((x: any) => x.name);
      const cut = bl.filter((x: any) => x.cut.length).map((x: any) => [x.name, x.cut]);
      if (cut.length) errs.push(`content cut off inside a block: ${JSON.stringify(cut)}`);
      if (wide.length || m.hs > 0) errs.push(`content runs off the side: ${JSON.stringify(wide)} (page scrolls sideways by ${m.hs}px)`);
      if (above < -1 || below < -1 || m.clipped) errs.push(`content overflows the frame (above ${above.toFixed(0)}, below ${below.toFixed(0)}, clipped ${m.clipped})`);
      let detail: string;
      if (ph) {
        const gaps: [string, number][] = [['above', above]]; let edge = bl[0].b;
        for (const x of bl.slice(1)) { gaps.push([`before ${x.name}`, x.t - edge]); edge = Math.max(edge, x.b); }
        gaps.push(['below', below]);
        for (const x of bl) if (!x.name.endsWith('(core)')) gaps.push([`inside ${x.name}`, x.ig]);
        const lim = 0.15 * m.H; const big = gaps.filter(([, v]) => v > lim).map(([k, v]) => [k, Math.round(v)]);
        if (big.length) errs.push(`gaps over 15% of the viewport (${lim.toFixed(0)}px): ${JSON.stringify(big)}`);
        detail = 'gaps ' + gaps.filter(([k]) => !k.startsWith('inside')).map(([k, v]) => `${k} ${v.toFixed(0)}`).join(', ');
      } else {
        const lim = 0.1 * fh;
        if (Math.abs(above - below) > lim) errs.push(`off centre: above ${above.toFixed(0)}, below ${below.toFixed(0)} (limit ${lim.toFixed(0)})`);
        if (name === 'map' && ((w === 1440 && h === 700) || (w === 1280 && h === 660)) && Math.min(above, below) < 39.5) {
          errs.push(`the map needs at least 40px above and below (above ${above.toFixed(0)}, below ${below.toFixed(0)})`);
        }
        detail = `above ${above.toFixed(0)}, below ${below.toFixed(0)}, limit ${lim.toFixed(0)}`;
      }
      out.push(`${errs.length ? 'FAIL' : 'ok  '} ${w}x${h} ${name}: ${detail}${errs.length ? ' :: ' + errs.join('; ') : ''}`);
      if (errs.length) bad.push(`${name}: ${errs.join('; ')}`);
    }
    console.log(out.join('\n'));
    expect(bad).toEqual([]);
  });
}
