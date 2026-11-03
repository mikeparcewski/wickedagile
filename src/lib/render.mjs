/* The pre-rendered parts of the page, built from graph.built.json at build time: the hero's headline and braid art,
   the Learn list and the Work showcase. Learn and Work are the no-JS view and the keyboard list fallback; the map is
   drawn by src/scripts/map.js. All art is drawn in code (SVG), deterministic from the data: no images, no network.
   A port of the mockup lane's build_graph.py (lists) and build_mockups.py (braid, hero), markup unchanged. */

export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#x27;' })[c]);
const f1 = (x) => x.toFixed(1);
const f0 = (x) => x.toFixed(0);

const ACC = { wicked: 'var(--c-wicked)', experience: 'var(--c-experience)', control: 'var(--c-control)', capability: 'var(--c-capability)', foundation: 'var(--c-foundation)' };
const PLANE = { studio: 'experience', crew: 'control', garden: 'capability', estate: 'foundation' };
const MON = 'Jan Feb Mar Apr May Jun Jul Aug Sep Oct Nov Dec'.split(' ');
const fmt = (d) => { const [y, mo, dd] = d.split('-'); return `${MON[+mo - 1]} ${+dd}, ${y}`; };

/** the hero headline: one line per sentence */
export function heroH1(h1) {
  return h1.split(/(?<=\.)\s+/).map((x) => x.trim()).filter(Boolean).map((x) => `<span class="ln">${esc(x)}</span>`).join(' ');
}

/** The hero art: two strands (Learn, Work) braid three times and merge into one shared line, which turns down and
    leaves the bottom edge toward the map. Over/under is drawn as short casing patches at each crossing. */
export function braid(lb) {
  const X0 = 24, XM = 404, Y0 = 250, N = 190;
  const strand = (sign) => {
    const pts = [];
    for (let i = 0; i <= N; i++) {
      const x = X0 + ((XM - X0) * i) / N, u = (x - X0) / (XM - X0);
      const a = 6 + 84 * (1 - u) ** 1.15;
      pts.push([x, Y0 - sign * a * Math.cos(3 * Math.PI * u)]);
    }
    return pts;
  };
  const dOf = (pts) => 'M' + pts.map(([x, y]) => `${f1(x)} ${f1(y)}`).join(' L');
  const Lp = strand(1), Wp = strand(-1);
  const trunk = ' L404 250 L500 250 A80 80 0 0 1 580 330 L580 2400';
  const dL = dOf(Lp), dW = dOf(Wp);
  const tube = 'M404 250 L500 250 A80 80 0 0 1 580 330 L580 2400';
  const cross = [1 / 6, 1 / 2, 5 / 6].map((f) => X0 + (XM - X0) * f);
  const patch = (pts, xc) => dOf(pts.filter((p) => Math.abs(p[0] - xc) <= 20));
  const over = [['l', patch(Lp, cross[0])], ['w', patch(Wp, cross[1])], ['l', patch(Lp, cross[2])]];
  const at = (pts, x) => pts.reduce((b, p) => (Math.abs(p[0] - x) < Math.abs(b[0] - x) ? p : b));
  const marks = [];
  for (const [x, kind] of [[60, 'essay'], [151, 'essay'], [277, 'bit']]) {
    const [px, py] = at(Lp, x);
    marks.push(kind === 'essay' ? `<circle class="mk l" cx="${f1(px)}" cy="${f1(py)}" r="8"/>` : `<rect class="mk l" x="${f1(px - 7)}" y="${f1(py - 7)}" width="14" height="14" rx="2" transform="rotate(45 ${f1(px)} ${f1(py)})"/>`);
  }
  for (const x of [60, 151, 277]) {
    const [px, py] = at(Wp, x);
    marks.push(`<rect class="mk w" x="${f1(px - 8)}" y="${f1(py - 8)}" width="16" height="16" rx="4"/>`);
  }
  const o = ['<svg class="braid" overflow="visible" viewBox="0 22 640 464" preserveAspectRatio="xMidYMid meet" aria-hidden="true" focusable="false">',
    '<defs><clipPath id="bclip"><rect class="rev" x="-200" y="-2400" width="1040" height="4800"/></clipPath></defs><g clip-path="url(#bclip)">',
    `<path class="s l" d="${dL}"/><path class="s w" d="${dW}"/>`,
    `<path class="tube-o" d="${tube}"/><path class="tube" d="${tube}"/>`];
  for (const [who, d] of over) o.push(`<path class="cs" d="${d}"/><path class="s ${who}" d="${d}"/>`);
  o.push(...marks);
  o.push('<rect class="xchg" x="390" y="228" width="50" height="44" rx="22"/>');
  o.push(`<text class="bl l" x="${f0(X0)}" y="${f0(Lp[0][1] - 26)}">${esc(lb.learn)}</text><text class="bl w" x="${f0(X0)}" y="${f0(Wp[0][1] + 44)}">${esc(lb.work)}</text>`);
  o.push('</g>');
  // the composition box (Learn label to Work label, strands to the interchange): the frame test centres this, since
  // the shared line is meant to run on past it to the bottom edge
  o.push(`<rect class="core" x="0" y="${f0(Lp[0][1] - 44)}" width="640" height="${f0(Wp[0][1] + 52 - (Lp[0][1] - 44))}" fill="none" stroke="none"/>`);
  for (const [who, d] of [['l', dL + trunk], ['w', dW + trunk]]) {   // two dots run the strands and meet as one on the trunk
    o.push(`<circle class="dotm ${who}" r="6"><animateMotion dur="7s" begin="2.2s" repeatCount="indefinite" calcMode="linear" path="${d}"/></circle>`);
  }
  o.push('</svg>');
  return o.join('');
}

const PIN = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z"/><circle cx="12" cy="10" r="2.3"/></svg>';
const XO = '<span class="xo" aria-hidden="true"> ↗</span>';
const CLIP = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M5 15V5a2 2 0 0 1 2-2h8"/></svg>';
/** a link that shows ↗ opens a new tab and says so to screen readers (§9.1) */
const NEWTAB = 'target="_blank" rel="noopener"';
const NT = '<span class="sr"> (opens in a new tab)</span>';

function ctx(G) {
  const thr = Object.fromEntries(G.threads.map((t) => [t.id, t]));
  const cols = (n) => { const c = n.threads.map((t) => ACC[thr[t].accent]); return c.length ? c : ['var(--ink-dim)']; };
  return { thr, cols, types: G.types };
}

/** Cover art drawn in code, in the map's own language: the piece is a station on a dotted map grid and its threads run
    through it in their colours, bundled where they share it (an interchange when there are two or more). Bits sit on a
    lattice of their diamond glyph. Deterministic from the piece's number. */
function cover(C, n, num, big = false) {
  const c = C.cols(n), m = Math.min(3, c.length);
  const [w, h] = big ? [640, 360] : [400, 140];
  const mid = h / 2, D = big ? 70 : 30, run = big ? 64 : 34, sw = big ? 12 : 6, gap = big ? 17 : 9;
  const sx = w * [0.4, 0.5, 0.58][num % 3];
  const o = [`<rect width="${w}" height="${h}" fill="var(--surface-raised)"/>`, `<rect width="${w}" height="${h}" fill="${c[0]}" opacity=".09"/>`];
  const sz = big ? 'b' : 's';
  const akey = n.threads.length ? C.thr[n.threads[0]].accent : 'dim';
  o.push(`<rect width="${w}" height="${h}" fill="url(#${n.type === 'bit' ? 'pl' : 'pd'}-${sz}${n.type === 'bit' ? '-' + akey : ''})"/>`);
  for (let j = 0; j < m; j++) {
    const off = (j - (m - 1) / 2) * gap, y = mid + off;
    const din = (num + j) % 2 ? 1 : -1, dout = m === 1 ? -din : din * (j % 2 ? -1 : 1);
    const yi = y + din * D, yo = y + dout * D;
    const d = `M-20 ${f1(yi)} L${f1(sx - run - D)} ${f1(yi)} L${f1(sx - run)} ${f1(y)} L${f1(sx + run)} ${f1(y)} L${f1(sx + run + D)} ${f1(yo)} L${w + 20} ${f1(yo)}`;
    o.push(`<path d="${d}" fill="none" stroke="var(--surface-raised)" stroke-width="${sw + 5}" stroke-linejoin="round" stroke-linecap="round"/>`);
    o.push(`<path d="${d}" fill="none" stroke="${c[j]}" stroke-width="${sw}" stroke-linejoin="round" stroke-linecap="round"/>`);
  }
  if (n.type === 'bit') {
    const r = big ? 13 : 9;
    o.push(`<rect x="${f1(sx - r)}" y="${f1(mid - r)}" width="${2 * r}" height="${2 * r}" rx="3" transform="rotate(45 ${f1(sx)} ${f1(mid)})" fill="var(--ink-high)" stroke="var(--surface-raised)" stroke-width="4"/>`);
  } else if (m > 1) {
    const hh = (m - 1) * gap + (sw + 10), ww = sw + 12;
    o.push(`<rect x="${f1(sx - ww / 2)}" y="${f1(mid - hh / 2)}" width="${f1(ww)}" height="${f1(hh)}" rx="${f1(ww / 2)}" fill="var(--ink-high)" stroke="var(--surface-raised)" stroke-width="4"/>`);
  } else {
    o.push(`<circle cx="${f1(sx)}" cy="${f1(mid)}" r="${f1(sw * 0.95 + 2)}" fill="var(--ink-high)" stroke="var(--surface-raised)" stroke-width="4"/>`);
  }
  // the number sits on the right, in the half the routes leave empty
  const fs = big ? 46 : 22, e0 = m === 1 ? -(num % 2 ? 1 : -1) : (num % 2 ? 1 : -1);
  const ny = e0 > 0 ? mid - D + fs * 0.72 : mid + D - 4;
  o.push(`<text x="${w - (big ? 24 : 14)}" y="${f0(ny)}" text-anchor="end" font-size="${fs}" font-weight="600" letter-spacing="-0.02em" fill="var(--ink-high)" opacity=".42" font-family="inherit">${String(num).padStart(2, '0')}</text>`);
  return `<svg class="art" viewBox="0 0 ${w} ${h}" preserveAspectRatio="xMidYMid slice" aria-hidden="true" focusable="false">${o.join('')}</svg>`;
}
const chips = (C, n) => n.threads.map((t) => `<span class="tchip" style="--tc:${ACC[C.thr[t].accent]}"><i></i>${esc(C.thr[t].name)}</span>`).join('');
/** the type word is its own span, so a phone can drop it (the glyph says it) */
function meta(C, n) {
  if (n.type === 'bit') return '<span class="ty">Bit · </span>bits.wickedagile.com';
  return `<span class="ty">${esc(C.types[n.type].label)} · </span>` + (n.date ? esc(fmt(n.date)) : '') + (n.mins ? ` · ${esc(n.mins)} min read` : '');
}
const cta = (n) => (n.type === 'essay' ? 'Read on Medium ↗' : n.type === 'bit' ? 'Try it ↗' : 'Watch ↗');
/** a list-only piece (no map position) gets no map button */
const pin = (n) => (n.listOnly ? '' : `<button type="button" class="btn small ghost needs-js show" data-show="${esc(n.id)}" aria-label="Show ${esc(n.title)} on the map" title="Show on the map">${PIN}<span class="t">On the map</span></button>`);
const where = (n) => ({ essay: ', on Medium', bit: ', on bits.wickedagile.com', video: '' })[n.type] ?? '';

function patternDefs() {
  const d = [];
  for (const [sz, st, r] of [['s', 20, 1.2], ['b', 32, 1.6]]) d.push(`<pattern id="pd-${sz}" width="${st}" height="${st}" patternUnits="userSpaceOnUse"><circle cx="${st / 2}" cy="${st / 2}" r="${r}" fill="var(--ink-dim)" opacity=".35"/></pattern>`);
  for (const [akey, col] of [...Object.entries(ACC), ['dim', 'var(--ink-dim)']]) {
    for (const [sz, st] of [['s', 22], ['b', 34]]) {
      const dd = [[0, 0], [st, 0], [st / 2, st], [0, 2 * st], [st, 2 * st]].map(([x, y]) => `<rect x="${x - 3}" y="${y - 3}" width="6" height="6" transform="rotate(45 ${x} ${y})" fill="${col}" opacity=".22"/>`).join('');
      d.push(`<pattern id="pl-${sz}-${akey}" width="${st}" height="${2 * st}" patternUnits="userSpaceOnUse">${dd}</pattern>`);
    }
  }
  return '<svg class="pdefs" width="0" height="0" aria-hidden="true" focusable="false" style="position:absolute"><defs>' + d.join('') + '</defs></svg>';
}

/** Learn: the newest piece featured large, then cards (the build order: newest essays first, then bits; the numbers
    match the phone map) */
export function learnHtml(G) {
  const C = ctx(G);
  const order = G.nodes.filter((n) => n.door === 'learn');
  const [featN, ...rest] = order;
  const num = Object.fromEntries(order.map((n, i) => [n.id, i + 1]));
  const tl = (n) => esc(C.types[n.type].label);
  const feat = `<article class="edfeat" data-node="${esc(featN.id)}" style="--tc:${C.cols(featN)[0]}"><div class="cover">${cover(C, featN, 1, true)}</div>`
    + `<div class="body"><span class="tline"><i class="glyph ${featN.type}" aria-hidden="true"></i><span class="num">1</span><span class="nw">Newest</span>${meta(C, featN)}</span>`
    + `<h3><a class="ttl" href="${esc(featN.url)}" ${NEWTAB}>${esc(featN.title)}<span class="sr"> (${tl(featN)}${where(featN)})</span>${XO}${NT}</a></h3><p class="dek">${esc(featN.summary)}</p>`
    + `<div class="tchips">${chips(C, featN)}</div><div class="acts"><a class="btn small primary go" href="${esc(featN.url)}" tabindex="-1" aria-hidden="true" ${NEWTAB}>${cta(featN)}${NT}</a>${pin(featN)}</div></div></article>`;
  const cards = [];
  let ess = 0;
  // the newest bit (and the newest video) shows before Show all; any other waits for it (review r1, r2). Undated pieces
  // count as the oldest; ties keep the export's order
  const newest = {};
  for (const n of rest) if (n.type !== 'essay' && (!newest[n.type] || (n.date || '') > (newest[n.type].date || ''))) newest[n.type] = n;
  for (const n of rest) {
    // shown before "Show all": the next three essays (two on a phone, five on a tall screen) and the newest bit
    let vis = '';
    if (n.type === 'essay') { ess += 1; vis = ess <= 2 ? '' : ess === 3 ? ' ph-more' : ess <= 5 ? ' tall' : ' more'; }
    else if (newest[n.type] !== n) vis = ' more';
    const cls = 'ecard' + (n.type === 'bit' ? ' bit' : '') + vis;
    cards.push(`<li class="${cls}" data-node="${esc(n.id)}" style="--tc:${C.cols(n)[0]}"><div class="cover">${cover(C, n, num[n.id])}</div>`
      + `<div class="body"><span class="tline"><i class="glyph ${n.type}" aria-hidden="true"></i><span class="num">${num[n.id]}</span>`
      + (n.type === 'bit' ? '<span class="nw">Interactive</span>' : '') + `${meta(C, n)}</span>`
      + `<h3><a class="ttl" href="${esc(n.url)}" ${NEWTAB}>${esc(n.title)}<span class="sr"> (${tl(n)}${where(n)})</span>${XO}${NT}</a></h3>`
      + `<p class="dek${n.type === 'bit' ? '' : ' edek'}">${esc(n.summary)}</p>`
      + `<div class="tchips">${chips(C, n)}</div><div class="acts">${pin(n)}</div></div></li>`);
  }
  return patternDefs() + `<div class="ed" id="ed">${feat}<ol class="edgrid" id="learnList" start="2">${cards.join('')}</ol></div>`;
}

/** Product art in the family style: transit lines in the plane colours, no screens and no fake UI. studio: the three
    component lines meet at one station and run into the studio surface. The Platform: the same shape dashed. */
function productArt(kind) {
  const W = 560, H = 280;
  const lines = [['control', 70], ['capability', 140], ['foundation', 210]];
  const out = [];
  const dOf = (y) => (y !== 140 ? `M-10 ${y} L196 ${y} Q256 ${y} 256 140` : 'M-10 140 L256 140');
  if (kind === 'studio') {
    out.push(`<rect width="${W}" height="${H}" fill="var(--surface-raised)"/>`, `<rect width="${W}" height="${H}" fill="var(--plane-experience)" opacity=".07"/>`);
    for (const [pl, y] of lines) out.push(`<path d="${dOf(y)}" fill="none" stroke="var(--plane-${pl})" stroke-width="9" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push('<path d="M256 140 L364 140" fill="none" stroke="var(--plane-experience)" stroke-width="12" stroke-linecap="round"/>');
    out.push('<rect x="364" y="84" width="112" height="112" rx="24" fill="color-mix(in srgb,var(--plane-experience) 16%,var(--surface-card))" stroke="var(--plane-experience)" stroke-width="7"/>');
    lines.forEach(([pl, y], i) => out.push(`<circle cx="${60 + 44 * i}" cy="${y}" r="7" fill="var(--surface-raised)" stroke="var(--plane-${pl})" stroke-width="4"/>`));
    out.push('<circle cx="256" cy="140" r="13" fill="var(--ink-high)" stroke="var(--surface-raised)" stroke-width="5"/>');
  } else {
    for (const [, y] of lines) out.push(`<path d="${dOf(y)}" fill="none" stroke="var(--ink-dim)" stroke-width="4" stroke-dasharray="1 12" stroke-linecap="round" stroke-linejoin="round"/>`);
    out.push('<path d="M256 140 L364 140" fill="none" stroke="var(--ink-dim)" stroke-width="4" stroke-dasharray="1 12" stroke-linecap="round"/>');
    out.push('<rect x="364" y="84" width="112" height="112" rx="24" fill="none" stroke="var(--ink-dim)" stroke-width="3" stroke-dasharray="8 9"/>');
  }
  return `<svg class="part" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMaxYMid slice" aria-hidden="true" focusable="false">${out.join('')}</svg>`;
}
// the studio mark for a phone's square tile: the three component lines meet at one station and run into the surface
const STUDIO_MINI = '<svg class="part mini" viewBox="0 0 120 120" aria-hidden="true" focusable="false">'
  + [['control', 'M4 30 L26 30 Q46 30 46 50 L46 60'], ['capability', 'M4 60 L46 60'], ['foundation', 'M4 90 L26 90 Q46 90 46 70 L46 60']].map(([pl, d]) => `<path d="${d}" fill="none" stroke="var(--plane-${pl})" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"/>`).join('')
  + '<path d="M46 60 L72 60" fill="none" stroke="var(--plane-experience)" stroke-width="8" stroke-linecap="round"/>'
  + '<rect x="72" y="40" width="40" height="40" rx="10" fill="color-mix(in srgb,var(--plane-experience) 16%,var(--surface-card))" stroke="var(--plane-experience)" stroke-width="5"/>'
  + '<circle cx="46" cy="60" r="8" fill="var(--ink-high)" stroke="var(--surface-raised)" stroke-width="3"/></svg>';

/** Work: studio and the Platform placeholder lead, then the components, Get started and Under the hood */
export function workHtml(G) {
  const work = G.nodes.filter((n) => n.door === 'work');
  const wf = [], comps = [];
  for (const n of work) {
    if (n.type === 'experiment') {
      wf.push(`<article class="wcard exp" data-node="${esc(n.id)}"><div class="art">${productArt('platform')}</div><div class="body">`
        + `<span class="eyebrow">${esc(n.eyebrow)}</span><h3 class="pname">${esc(n.title)}</h3><span class="badge">${esc(n.badge)}</span>`
        + `<div class="acts">${pin(n)}</div></div></article>`);
    } else if (n.tier === 'featured') {
      wf.push(`<article class="wcard" data-node="${esc(n.id)}" style="--tc:var(--plane-${PLANE[n.id]})"><div class="art">${productArt('studio')}${STUDIO_MINI}</div><div class="body">`
        + `<span class="eyebrow">${esc(n.eyebrow)} · ${esc(n.expansion ?? '')}</span><div class="trow"><h3><a class="ttl" href="${esc(n.url)}" ${NEWTAB}>${esc(n.title)}<span class="sr"> (in the lab)</span>${XO}${NT}</a></h3><span class="ver">v${esc(n.ver)}</span><span class="acts tpin">${pin(n)}</span></div>`
        + `<p class="line">${esc(n.summary)}</p>`
        + `<div class="acts"><a class="btn small primary go" href="${esc(n.url)}" tabindex="-1" aria-hidden="true" ${NEWTAB}>Open in the lab ↗${NT}</a>${pin(n)}</div></div></article>`);
    } else if (n.tier === 'component') {
      comps.push(`<li class="ccard" data-node="${esc(n.id)}" style="--tc:var(--plane-${PLANE[n.id]})">`
        + `<div class="body"><div class="trow"><span class="cg" aria-hidden="true"></span><h3><a class="ttl" href="${esc(n.url)}" ${NEWTAB}>${esc(n.title)}<span class="sr"> (in the lab)</span>${XO}${NT}</a></h3><span class="ver">v${esc(n.ver)}</span><span class="acts">${pin(n)}</span></div>`
        + `<p class="line">${esc(n.summary)}</p><p class="meta"><span>${esc(n.tag)}</span><span class="open" aria-hidden="true">Open in the lab ↗</span></p></div></li>`);
    }
  }
  const gs = G.getStarted;
  return `<div class="wfeat">${wf.join('')}</div><ul class="wcomps">${comps.join('')}</ul>`
    + `<div class="wstart"><span class="k2">Get started</span><span class="cmdbox"><span class="pr" aria-hidden="true">$</span><code id="cmd">${esc(gs.cmd)}</code>`
    + `<button type="button" class="btn small needs-js" id="copyBtn">${CLIP}<span class="t">Copy</span></button></span>`
    + `<span class="fine">${esc(gs.line)}</span><span class="sr" id="copyMsg" role="status"></span></div>`
    + '<div class="whood"><span class="k2">Under the hood</span><ul>' + G.underTheHood.map((h) => `<li><b>${esc(h.name.replace('wicked-', ''))}</b> <span class="l">${esc(h.line)}</span></li>`).join('') + '</ul></div>';
}
