#!/usr/bin/env node
/* Build the wickedagile.com graph (DES-SITES-V2 §5.1): a port of the mockup lane's build_graph.py.

   Inputs: the curated file (src/content/graph.json) and the four build-time sources (src/lib/sources.mjs: the Medium
   feed, bits.json and the lab's two exports, each falling back to the last served file, then a committed seed).
   Writes src/data/graph.built.json (what the page renders) and public/data/*.json (the sources it used, served so the
   next build can fall back to them). Exits 1 on any rule break; prints the warnings that don't block.

   Live data can break a rule the curated file met (a topic that grows past the chain's limit drops the edge a thread
   step stood on). Then the build retries on the last served files and the seeds: if that passes, it publishes that
   (the site keeps its last good data) and warns, so the operator re-curates; if that fails too, the curated file is
   at fault and the build fails.

   Usage: node scripts/build-graph.mjs            build (WA_SOURCES=seed: the seeds only, offline)
          node scripts/build-graph.mjs --door-work=Build  the same with the Work door renamed (the e2e rename check, Q12)
          node scripts/build-graph.mjs --selftest prove the build rules on broken copies of the inputs */
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { loadSources, parseFeed, isId, isUrl, postId, labHref } from '../src/lib/sources.mjs';

const ROOT = fileURLToPath(new URL('../', import.meta.url));
const clone = (x) => structuredClone(x);
/** a dictionary for keys that come from outside (categories, slugs): no inherited properties */
const dict = () => Object.create(null);
const own = (o, k) => o != null && Object.prototype.hasOwnProperty.call(o, k);
const get = (o, k) => (own(o, k) ? o[k] : undefined);

/** a new essay's id: its link's slug without the post id, as a lower-case slug */
export function slug(link) {
  const s = String(link).replace(/\/+$/, '').split('/').pop().replace(/-[0-9a-f]{8,}$/, '');
  return s.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80) || 'post';
}
/** the essay's id: the curated mapping by post id, else the slug */
export const essayId = (cur, link) => get(cur.essayIds, postId(link)) || slug(link);

/** draft is exactly true, or an approval by the operator on a real ISO date */
export function marked(x) {
  if (x.draft === true) return true;
  const a = x.approval;
  if (!(a && typeof a === 'object' && a.by === 'operator' && typeof a.on === 'string')) return false;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(a.on)) return false;
  const d = new Date(a.on + 'T00:00:00Z');
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === a.on;
}

const byDateDesc = (a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0);
const finite = (v) => typeof v === 'number' && Number.isFinite(v);

/**
 * feed: [{title, link, date, sub, mins, tags, asOf}]; cur: the curated file; bits: [{id, type, ...}] from bits.json;
 * lab: products.json; caps: capabilities.json; texts: {essayId: squashed text}. Returns {out, errors, warns}.
 */
export function build(feed, cur0, bits, lab, caps, texts) {
  const errors = [], warns = [];
  const cur = clone(cur0);
  const rule = cur.topicEdgeRule, lay = cur.layout;
  // ---- Learn: essays (feed) + bits + videos
  const learn = [];
  for (const p of [...feed].sort(byDateDesc)) {
    const nid = essayId(cur, p.link);
    let mins = p.mins, msrc = 'feed word count';
    const ov = get(cur.minsOverride, nid);
    if (ov && typeof ov === 'object' && ov.mins) { mins = ov.mins; msrc = 'override: ' + (ov.source || '?'); }
    learn.push({ id: nid, door: 'learn', type: 'essay', title: p.title, summary: p.sub, date: p.date, mins, url: p.link, topics: p.tags,
      source: { kind: 'medium-feed', ref: p.link, asOf: p.asOf || cur.asOf, topicsBy: 'Medium categories', mins: msrc } });
  }
  for (const b of bits) {
    if (b.type !== 'bit' && b.type !== 'video') errors.push(`bits.json item ${b.id} has type ${b.type}`);
    learn.push({ ...b, door: 'learn', date: b.date ?? null, mins: null });
  }
  // ---- Work: from the lab export only (no Work facts are typed in the curated file)
  const allowedPlatform = new Set(['id', 'name', 'tier', 'experiment', 'eyebrow']);
  const worknodes = [];
  for (const c of lab.products) {
    if (c.experiment) {
      const extra = Object.keys(c).filter((k) => !allowedPlatform.has(k));
      if (extra.length) errors.push(`the Platform placeholder may carry only ${JSON.stringify([...allowedPlatform].sort())}; it has ${JSON.stringify(extra.sort())}`);
      worknodes.push({ id: c.id, door: 'work', type: 'experiment', tier: c.tier, title: c.name, eyebrow: c.eyebrow ?? null,
        badge: lab.platformBadge, summary: null, url: null, topics: [],
        source: { kind: 'lab', ref: 'wickedlabs.ai/data/products.json', asOf: lab.asOf } });
    } else {
      for (const k of ['name', 'tier', 'ver', 'release', 'headline', 'url']) if (!c[k]) errors.push(`lab export: ${c.id} lacks ${k}`);
      worknodes.push({ ...c, door: 'work', type: 'component', title: c.name, summary: c.headline ?? null, topics: [],
        source: { kind: 'lab', ref: 'wickedlabs.ai/data/products.json', release: c.release ?? null, asOf: lab.asOf } });
    }
  }
  const nodes = learn.concat(worknodes);
  const seen = new Set();
  for (const n of nodes) {
    if (seen.has(n.id)) errors.push('duplicate node id ' + n.id);
    seen.add(n.id);
    if (![undefined, null, 'featured', 'component'].includes(n.tier)) errors.push(`${n.id}: unknown tier ${n.tier}`);
    // every id and link the page writes into markup is a plain slug and an https URL (the sources check them too)
    if (!isId(n.id)) errors.push(`${JSON.stringify(n.id)}: a node id is a lower-case slug`);
    if (n.url != null && !isUrl(n.url)) errors.push(`${n.id}: its link is not a plain https URL`);
  }
  const byid = Object.assign(dict(), Object.fromEntries(nodes.map((n) => [n.id, n])));
  // ---- edges, each with provenance
  const edges = new Map();
  const add = (a, b, kind, label, prov, topic, kw = {}) => {
    if (!(a in byid) || !(b in byid)) { errors.push(`edge to unknown node ${a}-${b}`); return; }
    const key = [a, b].sort().join('\u0000');
    const e = edges.get(key);
    if (e && e.kind === kind && kind === 'topic') { e.topics.push(topic); e.provenance.push(prov); return; }
    if (e) { errors.push(`two edge kinds on one pair ${[a, b].sort().join(',')}: ${e.kind} and ${kind}`); return; }
    edges.set(key, { a, b, kind, label, topics: topic ? [topic] : [], provenance: [prov], ...kw });
  };
  const posts = learn.filter((n) => n.type === 'essay');
  const bytopic = new Map();
  for (const n of posts) for (const t of n.topics) { if (!bytopic.has(t)) bytopic.set(t, []); bytopic.get(t).push(n); }
  const filtersOnly = [];
  for (const t of [...bytopic.keys()].sort()) {
    let ns = bytopic.get(t);
    if (ns.length < rule.minPosts) continue;
    if (ns.length > rule.maxPosts) { filtersOnly.push(t); continue; }
    ns = [...ns].sort(byDateDesc);
    for (let i = 0; i + 1 < ns.length; i++) {
      const asOf = [ns[i].source.asOf, ns[i + 1].source.asOf].sort().pop();
      add(ns[i].id, ns[i + 1].id, 'topic', t, { source: 'medium-feed', asOf, note: `both posts carry the Medium category “${t}”` }, t);
    }
  }
  for (const r of cur.related) {
    if (!marked(r)) errors.push(`Related ${r.a}-${r.b}: needs draft: true or an approval {by: operator, on: YYYY-MM-DD}`);
    add(r.a, r.b, 'related', 'Related', { source: 'curated', ref: 'src/content/graph.json', note: r.note }, null,
      { draft: r.draft === true, approval: r.approval ?? null });
  }
  for (const r of lab.relations) {
    if ((byid[r.a] || {}).door !== 'work' || (byid[r.b] || {}).door !== 'work') errors.push(`lab relation outside Work: ${r.a}-${r.b}`);
    add(r.a, r.b, 'lab', r.sentence, { source: 'lab', ref: r.ref }, null, { sentence: r.sentence });
  }
  const E = [...edges.values()];
  for (const e of E) if (e.kind === 'topic') e.label = e.topics.join(' · ');
  for (const e of E) if ([e.a, e.b].some((x) => byid[x].type === 'experiment')) errors.push('the Platform placeholder may not have edges');
  const adj = dict();
  for (const e of E) { (adj[e.a] ||= new Set()).add(e.b); (adj[e.b] ||= new Set()).add(e.a); }
  // ---- threads
  const inthreads = dict();
  const legsOk = new Set(['h', 'v', 'hv', 'vh', 'water', 'pv']);
  const capIds = new Map((caps.capabilities || []).map((c) => [c.id, c]));
  for (const th of cur.threads) {
    const st = th.stops;
    if (!marked(th)) errors.push(`thread ${th.id}: needs draft: true or an approval {by: operator, on: YYYY-MM-DD}`);
    for (const s of st) if (!(s in byid)) errors.push(`thread ${th.id}: unknown stop ${s}`);
    if (st.some((s) => !(s in byid))) continue;
    const doors = st.map((s) => byid[s].door);
    const want = [...doors].sort((x, y) => (x === 'learn' ? 0 : 1) - (y === 'learn' ? 0 : 1));
    if (doors.join() !== want.join()) errors.push(`thread ${th.id}: Learn stops must come before Work stops`);
    if (th.legs.length !== st.length - 1 || th.legs.some((l) => !legsOk.has(l))) errors.push(`thread ${th.id}: one supported leg per pair of stops`);
    for (let i = 0; i + 1 < st.length; i++) if (!(adj[st[i]] && adj[st[i]].has(st[i + 1]))) errors.push(`thread ${th.id}: no backing edge between ${st[i]} and ${st[i + 1]}`);
    for (const s of st) (inthreads[s] ||= []).push(th.id);
    const evs = th.evidence || [];
    if (!evs.length) errors.push(`thread ${th.id}: no evidence for its hook`);
    for (const ev of evs) {
      const body = get(texts, ev.essay);
      if (body == null) errors.push(`thread ${th.id}: evidence essay ${ev.essay} not in the snapshot`);
      else if (!body.includes(squashQuote(ev.quote))) errors.push(`thread ${th.id}: quote not found in ${ev.essay}: ${ev.quote.slice(0, 60)}`);
    }
    // a thread may name the lab capability rows it leans on; each must be in the lab's export and released (§5)
    for (const cid of th.capabilities || []) {
      const c = capIds.get(cid);
      if (!c) errors.push(`thread ${th.id}: capability ${cid} is not in the lab's capabilities export`);
      else if (c.status !== 'released') errors.push(`thread ${th.id}: capability ${cid} is ${c.status}, not released`);
    }
  }
  // ---- positions: every Learn item gets one (curated, else the tray, else list-only); Work rows from the layout
  const tray = [...(lay.tray || [])];
  for (const n of learn) {
    let p = get(lay.learn, n.id);
    if (p == null) {
      if (tray.length) { lay.learn[n.id] = tray.shift(); warns.push(`${n.id}: no map position yet; placed in the tray`); }
      else { n.listOnly = true; warns.push(`${n.id}: no map position and the tray is full; in the Learn list only`); }
    }
    p = get(lay.learn, n.id);
    if (p && !(Array.isArray(p) && p.slice(0, 2).every(finite) && p[0] >= 0 && p[0] <= lay.cols && p[1] >= 0 && p[1] <= lay.rows && ['above', 'below', 'left', 'right'].includes(p[2]))) errors.push(`${n.id}: bad map position ${JSON.stringify(p)}`);
    n.mapLabel = get(cur.mapLabels, n.id) || (n.title.length <= 20 ? n.title : n.title.slice(0, 18).trimEnd() + '…');
    n.threads = inthreads[n.id] || [];
    if (!n.threads.length) warns.push(`${n.id}: not in a thread yet`);
  }
  for (const th of cur.threads) for (const s of th.stops) if ((byid[s] || {}).listOnly) errors.push(`thread ${th.id}: stop ${s} has no map position (list-only)`);
  for (const n of worknodes) {
    const r = get(lay.work, n.id);
    if (!finite(r) || r < 0 || r > lay.rows) errors.push(`${n.id}: no Work row (or one off the map: ${r})`);
    n.threads = inthreads[n.id] || [];
  }
  // the door names and the hero copy: one data string each, and the hero is a draft until the operator approves it
  const lb = cur.labels || {};
  if (!['learn', 'work'].every((k) => typeof lb[k] === 'string' && lb[k].trim() && lb[k].length <= 16)) errors.push('labels: learn and work must each be a short non-empty name');
  const hero = cur.hero || {};
  if (!(typeof hero.h1 === 'string' && hero.h1.trim() && typeof hero.sub === 'string' && hero.sub.trim()) || 'options' in hero) errors.push('hero: needs one h1 and one sub (the operator decided the hero; no option sets)');
  if (!marked(hero)) errors.push('hero: needs draft: true or an approval {by: operator, on: YYYY-MM-DD}');
  const out = { asOf: cur.asOf, types: cur.types, rule, filtersOnly, underTheHood: lab.underTheHood, getStarted: lab.getStarted, layout: lay,
    threadsDraft: cur.threadsDraft, labels: cur.labels, hero: cur.hero, nodes, edges: E, threads: cur.threads };
  return { out, errors, warns };
}
const squashQuote = (q) => String(q).replace(/<[^>]+>/g, ' ').replace(/[  ]/g, ' ').replace(/\s+/g, '').toLowerCase().replace(/’/g, "'");

/** the derived feed records (no text) and the hook-check texts keyed by essay id */
export function feedParts(items, cur) {
  const feed = [], texts = dict();
  for (const p of items) {
    feed.push({ title: p.title, link: p.link, date: p.date, sub: p.sub, mins: p.mins ?? null, tags: p.tags, asOf: p.asOf ?? null });
    texts[essayId(cur, p.link)] = p.words.split('|').join('');
  }
  return { feed, texts };
}

/** load the sources and build; when live data breaks a rule the curated file meets on the last served data, keep
    that data and say why (DES §6.9: a source's failure falls back to the file the site last served) */
export async function buildFromSources(cur, opts = {}) {
  const run = (src) => { const { feed, texts } = feedParts(src.writing.items, cur); return { src, ...build(feed, cur, src.bits.data.items, src.labProducts.data, src.labCapabilities.data, texts) }; };
  const first = run(await loadSources(opts));
  const live = first.src.writing.from.includes('live') || ['bits', 'labProducts', 'labCapabilities'].some((k) => first.src[k].from === 'live');
  if (!first.errors.length || !live) return { ...first, fellBack: null };
  const second = run(await loadSources({ ...opts, mode: 'served' }));
  if (second.errors.length) return { ...first, fellBack: null };
  return { ...second, fellBack: first.errors };
}

async function selftest() {
  let ok = true;
  const expect = (name, cond) => { console.log((cond ? 'PASS ' : 'FAIL ') + name); ok = ok && !!cond; };
  const cur = JSON.parse(await readFile(ROOT + 'src/content/graph.json', 'utf8'));
  const src = await loadSources({ mode: 'seed' });
  const { feed, texts } = feedParts(src.writing.items, cur);
  const bits = src.bits.data.items, lab = src.labProducts.data, caps = src.labCapabilities.data;
  const run = (o = {}) => build(o.feed || feed, o.cur || cur, o.bits || bits, o.lab || lab, o.caps || caps, o.texts || texts);
  const has = (r, s) => r.errors.some((x) => x.includes(s));
  expect('the seeds build with no rule break', !run().errors.length);
  const f2 = clone(feed).concat([{ title: 'A Brand New Essay About Something', link: 'https://medium.com/@x/a-brand-new-essay-0123456789ab', date: '2026-11-03', sub: 'New.', mins: 5, tags: ['ai'] }]);
  const r2 = run({ feed: f2 });
  expect('a new essay does not break the build', !r2.errors.length);
  expect('a new essay is warned as not in a thread and placed in the tray', r2.warns.some((x) => x.includes('a-brand-new-essay') && x.includes('not in a thread')) && r2.warns.some((x) => x.includes('a-brand-new-essay') && x.includes('tray')));
  const c2 = clone(cur); delete c2.related[0].draft;
  expect('a Related link without draft or approval fails', has(run({ cur: c2 }), 'needs draft'));
  const c3 = clone(cur); c3.threads[0].draft = false; c3.threads[0].approval = { by: 'operator', on: '2026-11-04' };
  expect('an approved thread passes', !run({ cur: c3 }).errors.length);
  const l2 = clone(lab); l2.products[l2.products.length - 1].url = 'https://example.invalid/';
  expect('a Platform url fails', has(run({ lab: l2 }), 'Platform placeholder may carry only'));
  const c4 = clone(cur); c4.threads[0].stops = ['the-last-engineer', 'lookalike', 'studio']; c4.threads[0].legs = ['h', 'water'];
  expect('a thread step without a backing edge fails', has(run({ cur: c4 }), 'no backing edge'));
  const c5 = clone(cur); c5.threads[0].evidence[0].quote = 'A sentence the essay never says.';
  expect('a hook quote not in the essay fails', has(run({ cur: c5 }), 'quote not found'));
  expect('a duplicate id fails', has(run({ bits: bits.concat(clone(bits[0])) }), 'duplicate node id'));
  const c7 = clone(cur); delete c7.layout.work.crew;
  expect('a missing Work row fails', has(run({ cur: c7 }), 'no Work row'));
  const c8 = clone(cur); delete c8.hero.approval;
  expect('hero copy without draft or approval fails', has(run({ cur: c8 }), 'hero: needs draft'));
  const c9 = clone(cur); c9.hero.options = [{ id: 'a', h1: 'x', sub: 'y' }];
  expect('a hero option set fails (the hero is decided)', has(run({ cur: c9 }), 'hero: needs one h1'));
  const c10 = clone(cur); c10.labels.work = 'Build';
  expect('the Work door can be renamed in one place (Build)', !run({ cur: c10 }).errors.length);
  const c12 = clone(cur); c12.threads[0].draft = false; c12.threads[0].approval = { by: 'anyone', on: 'not-a-date' };
  expect('an approval not by the operator on a real date fails', has(run({ cur: c12 }), 'needs draft'));
  const c13 = clone(cur); c13.hero.sub = ' ';
  expect('a hero without a sub-line fails', has(run({ cur: c13 }), 'hero: needs one h1'));
  const c14 = clone(cur); c14.layout.work.studio = 100;
  expect('a Work row off the map fails', has(run({ cur: c14 }), 'off the map'));
  const c15 = clone(cur); delete c15.layout.learn['the-last-engineer']; c15.layout.tray = [];
  expect('a thread stop with no map position fails', has(run({ cur: c15 }), 'has no map position'));
  const c11 = clone(cur); c11.labels.work = '';
  expect('an empty door name fails', has(run({ cur: c11 }), 'labels:'));
  // the rules the port adds or the review asked to see proven (round 1)
  const c19 = clone(cur); c19.threads[2].stops = ['code-is-cheap', 'crew', 'how-many-releases', 'the-code-after-the-prose', 'garden'];
  expect('a thread with a Work stop before a Learn stop fails', has(run({ cur: c19 }), 'Learn stops must come before Work stops'));
  const l3 = clone(lab); l3.relations.push({ a: 'crew', b: 'platform', sentence: 'x', ref: 'x' });
  expect('an edge to the Platform placeholder fails', has(run({ lab: l3 }), 'the Platform placeholder may not have edges'));
  const c20 = clone(cur); c20.related.push({ a: 'the-hard-block', b: 'lookalike', note: 'x', draft: true });
  expect('two edge kinds on one pair fail (a Related link where a topic edge is)', has(run({ cur: c20 }), 'two edge kinds on one pair'));
  const c16 = clone(cur); c16.threads[0].capabilities = ['C99'];
  expect('a thread naming a capability the lab export lacks fails', has(run({ cur: c16 }), 'capability C99 is not in'));
  const c17 = clone(cur); c17.threads[0].capabilities = ['C1'];
  expect('a thread naming an unreleased capability fails', has(run({ cur: c17, caps: { capabilities: [{ id: 'C1', status: 'planned' }] } }), 'not released'));
  const c18 = clone(cur); c18.threads[0].draft = false; delete c18.threads[0].approval;
  expect('a thread with neither draft nor approval fails', has(run({ cur: c18 }), 'thread start: needs draft'));
  // a title edit keeps the essay (its id is keyed by the Medium post id), and keys from outside can't shadow anything
  const f3 = clone(feed); f3.find((p) => p.link.endsWith('e960f1174961')).title = 'Code Is Cheap, a New Title';
  const r3 = run({ feed: f3 });
  expect("a Medium title edit keeps the essay's id, threads and links (ids are keyed by the post id)", !r3.errors.length && r3.out.nodes.some((n) => n.id === 'code-is-cheap' && n.title === 'Code Is Cheap, a New Title'));
  const f4 = clone(feed).concat([{ title: 'Constructor', link: 'https://medium.com/@x/constructor-0123456789ab', date: '2026-11-03', sub: 'x', mins: 3, tags: ['constructor', '__proto__', 'toString'] }]);
  expect("a post or category named like an object property ('constructor', '__proto__') builds", !run({ feed: f4 }).errors.length);
  const b2 = clone(bits); b2[0].url = 'https://bits.wickedagile.com/x" onmouseover="alert(1)';
  expect('a link that would break out of an attribute fails the build', has(run({ bits: b2 }), 'not a plain https URL'));
  // when live data breaks a rule the curated file meets (two more fiction posts: fiction passes the chain's limit and
  // the green thread loses its backing), the build keeps the last served data and says why
  const seedRead = (rel) => readFile(ROOT + rel, 'utf8');
  const seedItems = JSON.parse(await seedRead('src/data/seed/writing.json')).items;
  const item = (p) => `<item><title><![CDATA[${p.title}]]></title><link>${p.link}?source=rss</link>${p.tags.map((t) => `<category><![CDATA[${t}]]></category>`).join('')}<pubDate>${new Date(p.date + 'T12:00:00Z').toUTCString()}</pubDate><content:encoded><![CDATA[${p.full ?? `<h4>${p.sub}</h4><p>${p.words.split('|').join(' ')}</p>`}]]></content:encoded></item>`;
  const rss = (list) => '<rss><channel>' + list.map(item).join('') + '</channel></rss>';
  const fiction = [1, 2].map((k) => ({ ...seedItems[0], title: `Another Parable ${k}`, link: `https://medium.com/@mike.parcewski/another-parable-${k}-${'0123456789a' + k}`, date: `2026-11-0${k}`, tags: ['fiction'] }));
  const liveOnly = (body) => async (u) => (u.startsWith('https://medium.com/') ? { ok: true, text: async () => body } : { ok: false, status: 503 });
  const g1 = await buildFromSources(cur, { mode: 'live', read: seedRead, fetch: liveOnly(rss([...fiction, ...seedItems.slice(0, 8)])) });
  expect('live posts that break a thread fall back to the last served data, and the build says why', !g1.errors.length && g1.fellBack && g1.fellBack.some((x) => x.includes('thread green: no backing edge')) && !g1.out.nodes.some((n) => n.title === 'Another Parable 1'));
  const g2 = await buildFromSources(c5, { mode: 'live', read: seedRead, fetch: liveOnly(rss(seedItems.slice(0, 9))) });
  expect('a rule the curated file itself breaks still fails the build (no fallback hides it)', g2.errors.some((x) => x.includes('quote not found')) && !g2.fellBack);
  // a post the feed cuts short keeps its complete text from the fallback, so the hook quotes are still found
  const cutLive = seedItems.slice(0, 10).map((p) => (p.link.endsWith('c5fa23024c5b') ? { ...p, full: '<h4>An AI parable.</h4><p>The board had six squares.</p><p><a href="x">Continue reading on Medium »</a></p>' } : p));
  const s5 = await loadSources({ mode: 'live', read: seedRead, fetch: liveOnly(rss(cutLive)) });
  const g3 = (() => { const { feed: f, texts: t } = feedParts(s5.writing.items, cur); return build(f, cur, bits, lab, caps, t); })();
  const ag = s5.writing.items.find((p) => p.link.endsWith('c5fa23024c5b'));
  expect('a post the feed cuts short keeps the complete text, subtitle and read time of its fallback copy', !g3.errors.length && ag.from === 'live' && ag.mins === seedItems[0].mins && ag.words === seedItems[0].words);
  const down = async () => { throw new Error('offline'); };
  const s1 = await loadSources({ mode: 'live', fetch: down, read: seedRead });
  expect('every fetch failing falls back to the committed seeds', s1.writing.from.join() === 'seed' && ['bits', 'labProducts', 'labCapabilities'].every((k) => s1[k].from === 'seed') && s1.log.length === 8);
  const served = JSON.parse(await seedRead('src/data/seed/bits.json')); served.items[0].title = 'Served copy';
  const s2 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u === 'https://wickedagile.com/data/bits.json' ? { ok: true, json: async () => served } : { ok: false, status: 503 }) });
  expect('a failed live export falls back to the file the site last served', s2.bits.from === 'served' && s2.bits.data.items[0].title === 'Served copy');
  const bad = { ok: true, json: async () => ({ products: 'not a list' }) };
  const s3 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u.includes('products.json') ? bad : { ok: false, status: 404 }) });
  expect('an export that fails its shape check is not used', s3.labProducts.from === 'seed');
  const nested = clone(lab); nested.underTheHood = [null];
  const s6 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u === 'https://wickedlabs.ai/data/products.json' ? { ok: true, json: async () => nested } : { ok: false, status: 404 }) });
  expect('an export with a malformed row (underTheHood: [null]) is not used', s6.labProducts.from === 'seed');
  const quoted = clone(served); quoted.items[0].url = 'https://bits.wickedagile.com/"><img src=x>';
  const s7 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u === 'https://bits.wickedagile.com/bits.json' ? { ok: true, json: async () => quoted } : { ok: false, status: 404 }) });
  expect('an export whose link carries a quote or angle bracket is not used', s7.bits.from === 'seed');
  // the feed carries only the newest ten: a post that drops off it keeps its place from the served file or the seed
  const newest = { ...seedItems[0], title: 'A Newer Post', link: 'https://medium.com/@mike.parcewski/a-newer-post-0123456789ab', date: '2026-11-03' };
  const s4 = await loadSources({ mode: 'live', read: seedRead, fetch: liveOnly(rss([newest, ...seedItems.slice(0, 9)])) });
  const links = s4.writing.items.map((p) => p.link);
  expect('a post that drops off the ten-post feed stays (the union of live, served and seed)', links.length === 11 && links.includes(seedItems[9].link) && s4.writing.items.find((p) => p.link === newest.link).from === 'live');
  const today = new Date().toISOString().slice(0, 10);
  const b4 = (() => { const { feed: f, texts: t } = feedParts(s4.writing.items, cur); return build(f, cur, bits, lab, caps, t); })();
  expect("a fetched post's provenance carries its source's date, not the curated file's (the node, as built)", s4.writing.items.find((p) => p.link === newest.link).asOf === today && b4.out.nodes.find((n) => n.title === 'A Newer Post').source.asOf === today && b4.out.nodes.find((n) => n.id === 'the-last-engineer').source.asOf === '2026-11-02');   // dropped off the feed: the seed's date
  // a stored copy keeps its own date: the served file is stamped when it is published, its items are not re-dated
  const servedDoc = { asOf: '2026-11-03', items: seedItems.map((p, i) => (i ? p : { ...p, asOf: '2026-10-01' })) };
  const s8 = await loadSources({ mode: 'served', read: seedRead, fetch: async (u) => (u === 'https://wickedagile.com/data/writing.json' ? { ok: true, json: async () => servedDoc } : { ok: false, status: 404 }) });
  expect("a served copy keeps each post's own provenance date (the file's date only for a post without one)", s8.writing.items.find((p) => p.link === seedItems[0].link).asOf === '2026-10-01' && s8.writing.items.find((p) => p.link === seedItems[1].link).asOf === '2026-11-03');
  // a Medium slug edit (same post id) replaces the old copy: one essay, the new link and title, no duplicate
  const moved = seedItems.map((p) => (p.link.endsWith('e960f1174961') ? { ...p, title: 'Code Is Cheap, Renamed', link: 'https://medium.com/@mike.parcewski/code-is-cheap-renamed-e960f1174961' } : p));
  const s9 = await loadSources({ mode: 'live', read: seedRead, fetch: liveOnly(rss(moved)) });
  const g9 = (() => { const { feed: f, texts: t } = feedParts(s9.writing.items, cur); return build(f, cur, bits, lab, caps, t); })();
  expect("a Medium slug and title edit replaces the post's old copy (one essay, its new link; the union is keyed by the post id)", !g9.errors.length && s9.writing.items.filter((p) => p.link.endsWith('e960f1174961')).length === 1 && g9.out.nodes.find((n) => n.id === 'code-is-cheap').url.includes('code-is-cheap-renamed'));
  const noSlash = clone(lab); noSlash.products[1].url = 'https:wickedlabs.ai/crew/';
  const s10 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u === 'https://wickedlabs.ai/data/products.json' ? { ok: true, json: async () => noSlash } : { ok: false, status: 404 }) });
  expect('an export with a link missing its slashes (https:host/...) is not used', s10.labProducts.from === 'seed');
  // the lab routes by hash: wickedlabs.ai/crew/ is a 404. The copy the site last served carried those paths, so it is
  // not used either, and the deploy build falls through to the seed (and publishes the seed's links from then on)
  const pathLinks = clone(lab); for (const c of pathLinks.products) if (c.url) c.url = `https://wickedlabs.ai/${c.id}/`;
  const s11 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u === 'https://wickedagile.com/data/lab-products.json' ? { ok: true, json: async () => pathLinks } : { ok: false, status: 404 }) });
  expect('a served copy whose lab links are paths (wickedlabs.ai/crew/, a 404) is not used; the seed is', s11.labProducts.from === 'seed' && s11.labProducts.data.products.filter((c) => c.url).every((c) => c.url === labHref(c.id)));
  const otherRoute = clone(lab); otherRoute.products[1].url = labHref('garden');
  const s12 = await loadSources({ mode: 'live', read: seedRead, fetch: async (u) => (u === 'https://wickedlabs.ai/data/products.json' ? { ok: true, json: async () => otherRoute } : { ok: false, status: 404 }) });
  expect("an export whose product links another product's lab view is not used", s12.labProducts.from === 'seed');
  expect('the seed links each product to its lab view (https://wickedlabs.ai/#/<id>)', lab.products.filter((c) => !c.experiment).map((c) => c.url).join() === ['studio', 'crew', 'garden', 'estate'].map((id) => `https://wickedlabs.ai/#/${id}`).join());
  const parsed = parseFeed(rss([newest, ...seedItems.slice(0, 9)]));
  expect('the feed parser reads title, link, date, subtitle, read time and categories', parsed.length === 10 && parsed[0].link === newest.link && parsed[0].date === '2026-11-03' && parsed[0].sub === newest.sub && parsed[0].tags.join() === newest.tags.join() && parsed[0].mins >= 1);
  console.log(ok ? 'selftest: all rules hold' : 'selftest: FAILED');
  process.exit(ok ? 0 : 1);
}

async function main() {
  const cur = JSON.parse(await readFile(ROOT + 'src/content/graph.json', 'utf8'));
  const door = process.argv.find((a) => a.startsWith('--door-work='));
  if (door) cur.labels.work = door.slice('--door-work='.length);
  const { src, out, errors, warns, fellBack } = await buildFromSources(cur);
  for (const l of src.log) console.log('source:', l);
  for (const w of warns) console.log('warning:', w);
  if (errors.length) { console.log('BUILD FAILED'); for (const e of errors) console.log(' -', e); process.exit(1); }
  if (fellBack) {   // a GitHub annotation, so the run shows it
    console.log('::warning title=Live data breaks a graph rule::The build kept the last served data. Re-curate src/content/graph.json: ' + fellBack.join('; '));
  }
  out.sources = { writing: src.writing.from, bits: src.bits.from, labProducts: src.labProducts.from, labCapabilities: src.labCapabilities.from, fellBack: fellBack || null };
  await mkdir(ROOT + 'src/data', { recursive: true });
  await writeFile(ROOT + 'src/data/graph.built.json', JSON.stringify(out));
  // publish what this build used, so the next build can fall back to it (§6.9)
  await mkdir(ROOT + 'public/data', { recursive: true });
  const stamp = new Date().toISOString().slice(0, 10);
  await writeFile(ROOT + 'public/data/writing.json', JSON.stringify({ asOf: stamp, items: src.writing.items.map(({ from, ...p }) => p) }));
  await writeFile(ROOT + 'public/data/bits.json', JSON.stringify(src.bits.data));
  await writeFile(ROOT + 'public/data/lab-products.json', JSON.stringify(src.labProducts.data));
  await writeFile(ROOT + 'public/data/lab-capabilities.json', JSON.stringify(src.labCapabilities.data));
  const kinds = {};
  for (const e of out.edges) kinds[e.kind] = (kinds[e.kind] || 0) + 1;
  const nl = out.nodes.filter((n) => n.door === 'learn').length;
  console.log(`ok: ${nl} Learn + ${out.nodes.length - nl} Work nodes, ${out.edges.length} edges ${JSON.stringify(kinds)}; filters only: ${JSON.stringify(out.filtersOnly)}; warnings: ${warns.length}; sources: ${JSON.stringify(out.sources)}`);
}

if (process.argv.includes('--selftest')) await selftest();
else await main();
