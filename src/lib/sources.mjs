/* Build-time sources for the company graph (DES-SITES-V2 §6.9). Runs in Node before `astro build`; the page itself
   makes no request at run time (Medium sends no CORS headers, and fetching at build keeps visitors' requests off
   third parties).

   Four sources, each tried in order: the live export, the file this site last served (the build publishes what it
   used under /data/, so the next build can fall back to it), then the committed seed in src/data/seed/.

     writing          the Medium feed (RSS)                 /data/writing.json           seed/writing.json
     bits             bits.wickedagile.com/bits.json       /data/bits.json              seed/bits.json
     labProducts      wickedlabs.ai/data/products.json     /data/lab-products.json      seed/lab-products.json
     labCapabilities  wickedlabs.ai/data/capabilities.json /data/lab-capabilities.json  seed/lab-capabilities.json

   The writing is a union, not a first-wins chain: Medium's feed carries only the newest ten posts, so a post that
   drops off it keeps its place from the last served file (then the seed). The live feed wins for a post it carries.

   WA_SOURCES=seed reads the seeds only (the e2e build and the local preview: deterministic, offline);
   WA_SOURCES=served skips the live exports (the graph build's retry when live data breaks a rule). */
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const SITE = 'https://wickedagile.com';
/** The lab is one page that routes by hash: a product's view is `#/<id>` (studio, crew, garden, estate). A path under
    it (wickedlabs.ai/crew/) is GitHub Pages' 404, so the shape check below takes a product link only in this form. */
export const LAB = 'https://wickedlabs.ai/';
export const labHref = (id) => `${LAB}#/${id}`;
const ROOT = fileURLToPath(new URL('../../', import.meta.url));

export const SOURCES = {
  writing: { live: 'https://medium.com/feed/@mike.parcewski', served: `${SITE}/data/writing.json`, seed: 'src/data/seed/writing.json', file: 'writing.json' },
  bits: { live: 'https://bits.wickedagile.com/bits.json', served: `${SITE}/data/bits.json`, seed: 'src/data/seed/bits.json', file: 'bits.json' },
  labProducts: { live: 'https://wickedlabs.ai/data/products.json', served: `${SITE}/data/lab-products.json`, seed: 'src/data/seed/lab-products.json', file: 'lab-products.json' },
  labCapabilities: { live: 'https://wickedlabs.ai/data/capabilities.json', served: `${SITE}/data/lab-capabilities.json`, seed: 'src/data/seed/lab-capabilities.json', file: 'lab-capabilities.json' },
};

/* ---------- the Medium feed ---------- */
const NAMED = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', hellip: '…', mdash: '—', ndash: '–', rsquo: '’', lsquo: '‘', rdquo: '”', ldquo: '“' };
export function unescape(s) {
  return String(s).replace(/&(#x[0-9a-f]+|#[0-9]+|[a-z]+);/gi, (m, k) => {
    if (k[0] === '#') {
      const cp = k[1] === 'x' || k[1] === 'X' ? parseInt(k.slice(2), 16) : parseInt(k.slice(1), 10);
      return Number.isFinite(cp) ? String.fromCodePoint(cp) : m;
    }
    return Object.prototype.hasOwnProperty.call(NAMED, k.toLowerCase()) ? NAMED[k.toLowerCase()] : m;
  });
}
const text = (h) => unescape(String(h).replace(/<[^>]+>/g, ' ')).replace(/[  ]/g, ' ');
/** the post's title and body as lower-case words joined by '|': the hook-quote check joins them back (squash) */
export const words = (h) => text(h).split(/\s+/).filter(Boolean).map((w) => w.toLowerCase().replace(/’/g, "'")).join('|');
/** what the hook-quote check compares: tags stripped, whitespace removed, lower case, curly apostrophes straight */
export const squash = (h) => text(h).replace(/\s+/g, '').toLowerCase().replace(/’/g, "'");
const MONTHS = { Jan: '01', Feb: '02', Mar: '03', Apr: '04', May: '05', Jun: '06', Jul: '07', Aug: '08', Sep: '09', Oct: '10', Nov: '11', Dec: '12' };

/** RSS 2.0 from Medium -> the derived records the graph reads: title, link, date, sub, mins, tags, words */
export function parseFeed(xml) {
  const out = [];
  for (const raw of String(xml).split(/<item>/i).slice(1)) {
    const block = raw.split(/<\/item>/i)[0];
    const all = (tag) => [...block.matchAll(new RegExp('<' + tag + '(?:\\s[^>]*)?>([\\s\\S]*?)<\\/' + tag + '>', 'gi'))].map((m) => m[1].replace(/^\s*<!\[CDATA\[([\s\S]*?)\]\]>\s*$/, '$1').trim());
    const pick = (tag) => all(tag)[0] || '';
    const title = unescape(pick('title')).trim();
    const link = (pick('link') || '').split('?')[0];
    const pub = pick('pubDate').match(/(\d{1,2}) (\w{3}) (\d{4})/);
    const content = pick('content:encoded');
    if (!title || !/^https:\/\/medium\.com\//.test(link) || !pub || !MONTHS[pub[2]]) continue;
    // the subtitle is the post's first heading, before its first paragraph
    const head = content.split(/<p[\s>]/i)[0].match(/<h[34][^>]*>([\s\S]*?)<\/h[34]>/i);
    let sub = head ? text(head[1]).replace(/\s+/g, ' ').trim() : '';
    if (sub && !/[.!?…]$/.test(sub)) sub += '.';
    // read time: 230 words a minute, from the feed's own text; none when the feed cuts the post short
    const cut = !content || /Continue reading on Medium/i.test(content);
    const n = words(content).split('|').filter(Boolean).length;
    out.push({
      title, link, date: `${pub[3]}-${MONTHS[pub[2]]}-${pub[1].padStart(2, '0')}`, sub,
      mins: cut ? null : Math.max(1, Math.round(n / 230)),
      tags: all('category').map((c) => unescape(c).trim()).filter(Boolean),
      words: words(title + ' ' + content),
      // a post the feed cuts short: its text, subtitle and read time come from an earlier complete copy (the union)
      complete: !cut,
    });
  }
  return out;
}

/* ---------- shape checks: a source that fails its check falls through to the next one. They cover everything the
   graph build and the page read, so a malformed export is never half-used: ids are slugs, links are https URLs with
   no quote or angle bracket, a lab product's link is its lab view (labHref), dates are real, read times are numbers.
   So a copy carrying the old path links (wickedlabs.ai/crew/, which 404) is not used, the last served file included,
   and the build falls through to the seed ---------- */
const isStr = (s) => typeof s === 'string' && s.trim().length > 0;
const isDate = (d) => { if (typeof d !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(d)) return false; const t = new Date(d + 'T00:00:00Z'); return !Number.isNaN(t.getTime()) && t.toISOString().slice(0, 10) === d; };
export const isId = (s) => typeof s === 'string' && /^[a-z0-9][a-z0-9-]{0,79}$/.test(s);
export const isUrl = (s) => { if (typeof s !== 'string' || !/^https:\/\/[^/]/.test(s) || /["'<>\s`\\]/.test(s)) return false; try { return new URL(s).protocol === 'https:'; } catch { return false; } };
/** a Medium post's id: the hex at the end of its link, which a title or slug edit keeps */
export const postId = (link) => (String(link).replace(/\/+$/, '').split('/').pop().match(/-([0-9a-f]{8,})$/) || [])[1] || null;
const rows = (a, ok) => Array.isArray(a) && a.every((x) => x && typeof x === 'object' && ok(x));
export const VALID = {
  writing: (items) => Array.isArray(items) && items.length > 0 && rows(items, (p) => isStr(p.title) && isUrl(p.link) && isDate(p.date)
    && typeof p.sub === 'string' && (p.mins == null || (Number.isInteger(p.mins) && p.mins > 0 && p.mins < 600)) && Array.isArray(p.tags) && p.tags.every(isStr) && typeof p.words === 'string'),
  bits: (d) => d && rows(d.items, (b) => isId(b.id) && (b.type === 'bit' || b.type === 'video') && isStr(b.title) && typeof b.summary === 'string' && isUrl(b.url)
    && (b.date == null || isDate(b.date)) && Array.isArray(b.topics) && b.topics.every(isStr)),
  labProducts: (d) => d && isStr(d.platformBadge) && Array.isArray(d.products) && d.products.length > 0
    && rows(d.products, (c) => isId(c.id) && isStr(c.name) && (c.tier === 'featured' || c.tier === 'component')
      && (c.experiment ? (c.eyebrow == null || isStr(c.eyebrow)) : isStr(c.ver) && isStr(c.release) && isStr(c.headline) && isUrl(c.url) && c.url === labHref(c.id) && isStr(c.tag)))
    && rows(d.underTheHood, (u) => isId(u.id) && isStr(u.name) && isStr(u.line))
    && d.getStarted && isStr(d.getStarted.cmd) && isStr(d.getStarted.line)
    && rows(d.relations, (r) => isId(r.a) && isId(r.b) && isStr(r.sentence)),
  labCapabilities: (d) => d && rows(d.capabilities, (c) => isStr(c.id) && (c.status == null || isStr(c.status))),
};

async function get(url, fetchImpl, as) {
  const r = await fetchImpl(url, { headers: { 'user-agent': 'wickedagile-build (+https://wickedagile.com)' }, signal: AbortSignal.timeout(20000) });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  return as === 'text' ? r.text() : r.json();
}
async function seedOf(rel, readImpl) { return JSON.parse(await readImpl(rel)); }
const items = (d) => (Array.isArray(d) ? d : d && Array.isArray(d.items) ? d.items : null);

/**
 * Load the four sources. opts: { mode: 'live' | 'seed', fetch, read } (fetch and read are injectable for the
 * self-test). Returns { writing: {items, from}, bits: {data, from}, labProducts: {data, from}, labCapabilities: {data, from}, log }.
 */
export async function loadSources(opts = {}) {
  const mode = opts.mode || process.env.WA_SOURCES || 'live';   // 'live' | 'served' | 'seed'
  const fetchImpl = opts.fetch || globalThis.fetch;
  const readImpl = opts.read || ((rel) => readFile(ROOT + rel, 'utf8'));
  const log = [];
  const out = { log };
  // the writing: the union of live, last served and seed, newest source winning per post
  {
    const S = SOURCES.writing, layers = [];
    const seedDoc = await seedOf(S.seed, readImpl), seed = items(seedDoc);
    if (!VALID.writing(seed)) throw new Error('the committed writing seed fails its shape check');
    layers.push(['seed', seed, seedDoc.asOf]);
    if (mode !== 'seed') {
      for (const [from, url, as] of [['served', S.served, 'json'], ['live', S.live, 'text']]) {
        if (from === 'live' && mode === 'served') continue;
        try {
          const doc = as === 'text' ? await get(url, fetchImpl, 'text') : await get(url, fetchImpl, 'json');
          const got = as === 'text' ? parseFeed(doc) : items(doc);
          if (!VALID.writing(got)) throw new Error('shape check failed');
          layers.push([from, got, as === 'text' ? new Date().toISOString().slice(0, 10) : (isDate(doc.asOf) ? doc.asOf : null)]);
        } catch (e) { log.push(`writing: ${from} ${url} unavailable (${e.message}); using the next source`); }
      }
    }
    // newest source wins per post; a post the feed cuts short keeps the text, subtitle and read time of its last
    // complete copy, so the hook-quote check still reads the whole essay
    // one entry per post, keyed by the Medium post id (a slug or title edit keeps it), else the link; the newest
    // source's copy (and so its current link) wins. Provenance: a fresh fetch is dated today; a stored copy keeps the
    // date it carries, and the file's own date only for a copy without one
    const byPost = new Map();
    for (const [from, list, asOf] of layers) for (const p of list) {
      const key = postId(p.link) || p.link, prev = byPost.get(key);
      const when = from === 'live' ? asOf : (isDate(p.asOf) ? p.asOf : asOf);
      const next = { ...p, from, asOf: when || prev?.asOf || null };
      if (p.complete === false && prev && prev.complete !== false) Object.assign(next, { words: prev.words, sub: p.sub || prev.sub, mins: p.mins ?? prev.mins, complete: true });
      byPost.set(key, next);
    }
    out.writing = { items: [...byPost.values()], from: layers.map((l) => l[0]) };
  }
  for (const key of ['bits', 'labProducts', 'labCapabilities']) {
    const S = SOURCES[key];
    let got = null, from = null;
    if (mode !== 'seed') {
      for (const [f, url] of [['live', S.live], ['served', S.served]]) {
        if (f === 'live' && mode === 'served') continue;
        try {
          const d = await get(url, fetchImpl, 'json');
          const norm = key === 'bits' ? { ...(Array.isArray(d) ? {} : d), items: items(d) } : d;
          if (!VALID[key](norm)) throw new Error('shape check failed');
          got = norm; from = f; break;
        } catch (e) { log.push(`${key}: ${f} ${url} unavailable (${e.message}); using the next source`); }
      }
    }
    if (!got) {
      got = await seedOf(S.seed, readImpl); from = 'seed';
      if (!VALID[key](got)) throw new Error(`the committed ${key} seed fails its shape check`);
    }
    out[key] = { data: got, from };
  }
  return out;
}
