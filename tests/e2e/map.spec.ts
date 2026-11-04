/* Port of the design lane's test3.py: the company site's behaviour, in its sixteen groups (data, hover, threads,
   filters, questions, phone, motion, fit, folds, nojs, hero, learn, work, labels, folds2, final). The in-page probes
   are the reference's, verbatim but for the hook's production name (window.__map, was __mock). What changed, and why:
   - the header has no section links (operator, 2026-11-03, wickedagile#68): the checks that read them now check that
     there are none, and focus checks start from a header icon link;
   - the footer is the family footer (operator, 2026-11-03, wickedagile#69): the byline checks read it instead, and the
     new-tab checks cover the page's own links and the header (the family footer is wicked-web's, unchanged);
   - the hero's Work line runs on to "Follow a thread" (wickedagile#69): the hero's own tube now ends at its turn;
   - draft marks are a render setting, off in production (DES §5.1): the draft checks turn them on with __map.drafts();
   - the thread badges' leftover code is gone (final review P3), so the checks find none at all. */
import { test, expect } from '@playwright/test';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { Checks, G, ROOT, open, openDist, ev, same, sorted, type Opened } from './lib';

test.describe.configure({ mode: 'parallel' });

test('data: the built graph keeps the design rules', async () => {
  const c = new Checks();
  const ids: Record<string, any> = Object.fromEntries(G.nodes.map((x: any) => [x.id, x]));
  c.check('every edge carries provenance', G.edges.every((e: any) => e.provenance && e.provenance.length));
  c.check('curated links are labelled Related', G.edges.filter((e: any) => e.kind === 'related').every((e: any) => e.label === 'Related'));
  c.check('the Platform experiment has no edges', !G.edges.some((e: any) => e.a === 'platform' || e.b === 'platform'));
  c.check('bits are Learn items', G.nodes.filter((x: any) => x.type === 'bit').every((x: any) => x.door === 'learn') && G.nodes.some((x: any) => x.type === 'bit'));
  c.check('video is a supported type with no items yet', 'video' in G.types && !G.nodes.some((x: any) => x.type === 'video'));
  c.check('Work is studio, crew, garden, estate and Platform only', same(sorted(G.nodes.filter((x: any) => x.door === 'work').map((x: any) => x.id)), ['crew', 'estate', 'garden', 'platform', 'studio']));
  c.check('featured: studio and Platform', same(sorted(G.nodes.filter((x: any) => x.tier === 'featured').map((x: any) => x.id)), ['platform', 'studio']));
  c.check('Platform badge defaults to Experiment, no url, no rows', ids.platform.badge === 'Experiment' && !ids.platform.url);
  c.check('under the hood: core, bus, interactive (not nodes)', same(G.underTheHood.map((h: any) => h.id), ['core', 'bus', 'interactive']) && !['core', 'bus', 'interactive', 'installer'].some((k) => k in ids));
  c.check('threads are marked draft (production hides the marks; the data keeps them)', G.threads.every((t: any) => t.draft) && G.threadsDraft.includes('DRAFT FOR OPERATOR APPROVAL'));
  c.check('4-6 threads including Start here', G.threads.length >= 4 && G.threads.length <= 6 && G.threads[0].name === 'Start here');
  c.check('a thread runs Learn, then the lab', G.threads.every((t: any) => { const d = t.stops.map((s: string) => ids[s].door); return same(d, [...d].sort((a: string, b: string) => (a === 'learn' ? 0 : 1) - (b === 'learn' ? 0 : 1))); }));
  c.check('at least one thread stays in Learn', G.threads.some((t: any) => t.stops.every((s: string) => ids[s].door === 'learn')));
  c.check('crossroads exist (pieces in 2+ threads)', G.nodes.filter((x: any) => (x.threads || []).length > 1).length >= 3);
  c.check('the door names are one data string each', ['learn', 'work'].every((k) => typeof G.labels[k] === 'string' && G.labels[k].trim()) && G.nodes.every((x: any) => x.door === 'learn' || x.door === 'work'));
  c.check('one hero, decided by the operator (no option sets)', !('options' in G.hero) && G.hero.h1 === 'We write about the work. The tools are the receipts.' && G.hero.approval?.by === 'operator');
  // the reference checked its template; here it is the site's own markup and scripts
  const files = [...readdirSync(ROOT + 'src/components').map((f: string) => 'src/components/' + f), 'src/pages/index.astro', 'src/scripts/map.js', 'src/lib/render.mjs'];
  const hits: string[] = [];
  for (const f of files) {
    if (!/\.(astro|m?js)$/.test(f)) continue;
    const t = readFileSync(ROOT + f, 'utf8').replace(/\/\*[\s\S]*?\*\/|<!--[\s\S]*?-->|^\s*\/\/.*$/gm, '')
      .replace(/^import .*$/gm, '').replace(/<\/?[A-Z]\w*/g, '<');   // a component's own name is not copy
    for (const m of t.matchAll(/.{0,30}\b(?:Play|Work)\b.{0,10}/g)) hits.push(f + ': ' + m[0]);
  }
  c.check('the site spells no door name outside the label data', !hits.length, hits.slice(0, 4));
  // review r1: a link, id, title or read time from a source can't break out of the markup it lands in
  const { learnHtml, workHtml } = await import('../../src/lib/render.mjs');
  const G2 = structuredClone(G), evil = '"><img src=x onerror=alert(1)><a x="';
  const e1 = G2.nodes.find((n: any) => n.type === 'essay'), w1 = G2.nodes.find((n: any) => n.id === 'crew');
  Object.assign(e1, { url: 'https://medium.com/' + evil, title: '<script>x</script>' + evil, summary: evil, mins: evil });
  Object.assign(w1, { url: 'https://wickedlabs.ai/' + evil, summary: evil, tag: evil, ver: evil });
  const out2 = learnHtml(G2) + workHtml(G2);
  c.check('Learn and Work escape every string from the sources (links, titles, lines, read times)', !/<img|<script|<a x=/i.test(out2) && out2.includes('&quot;&gt;&lt;img'), out2.match(/.{40}(<img|<script).{20}/)?.[0]);
  // review r1/r2: the newest bit shows before Show all; any other waits for it, so a second bit can't push Learn past
  // its frame. A newer bit listed after an older one is the one that shows
  const G3 = structuredClone(G), b0 = G3.nodes.find((n: any) => n.type === 'bit');
  b0.date = '2026-10-01';
  G3.nodes.splice(G3.nodes.indexOf(b0) + 1, 0, { ...b0, id: 'another-bit', title: 'Another bit', date: '2026-11-01' });
  const cards = [...learnHtml(G3).matchAll(/<li class="([^"]*)" data-node="([^"]*)"/g)].map((m) => [m[2], m[1]]);
  c.check('Learn: the newest bit shows before Show all (whatever its place in the export), another waits for it', same(cards.filter(([id]) => id === b0.id || id === 'another-bit'), [[b0.id, 'ecard bit more'], ['another-bit', 'ecard bit']]), cards);
  c.done('data');
});

test('hover: every station hovers cleanly, framed or not', async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const c = new Checks();
  for (const [w, h] of [[1440, 700], [1280, 660]]) {
    const { ctx, pg, errs } = await open(browser, baseURL!, { w, h });
    const ids: string[] = await ev(pg, "return [...document.querySelectorAll('#stations .st')].filter(s=>s.tabIndex===0).map(s=>s.dataset.id)");
    const bad: unknown[] = [];
    for (const i of ids) {
      await pg.hover(`.st[data-id="${i}"] .dot`); await pg.waitForTimeout(30);
      const r: string[] = await ev(pg, 'return __audit({ring:6})');
      const lit = await ev(pg, `return document.querySelector('.st[data-id="${i}"]').classList.contains('hov')`);
      if (r.length || !lit) bad.push([i, r.slice(0, 2), lit]);
    }
    c.check(`hover oracle ${w}x${h}: every station (${ids.length}) hovers with no overlap, clip or route under a label`, !bad.length, bad.slice(0, 3));
    await pg.mouse.move(2, 2); await pg.waitForTimeout(30);
    await pg.hover('.st[data-id="code-is-cheap"] .dot');
    c.check(`hover ${w}x${h}: neighbourhood lit, rest dimmed`, await ev(pg, "var g=document.getElementById('gwrap');return g.classList.contains('hovering')&&document.querySelectorAll('.st.near').length>=3"));
    for (const t of ['start', 'green', 'checks', 'reality', 'state']) {
      await ev(pg, `__map.choose('${t}')`); await pg.waitForTimeout(20);
      const ids2: string[] = await ev(pg, "return [...document.querySelectorAll('#stations .st')].filter(s=>s.tabIndex===0&&!s.classList.contains('away')).map(s=>s.dataset.id)");
      const bad2: unknown[] = [];
      for (const i of ids2) {
        await pg.hover(`.st[data-id="${i}"] .dot`); await pg.waitForTimeout(20);
        const r: string[] = await ev(pg, 'return __audit({ring:6})');
        if (r.length) bad2.push([i, r.slice(0, 2)]);
      }
      c.check(`framed ${t} ${w}x${h}: members hover cleanly`, !bad2.length, bad2.slice(0, 3));
    }
    c.check(`no page errors ${w}x${h}`, !errs.length, errs);
    await ctx.close();
  }
  c.done('hover');
});

test('threads: choosing, stepping, crossroads, deep links, keyboard', async ({ browser, baseURL }) => {
  const c = new Checks();
  const { ctx, pg, errs } = await open(browser, baseURL!, { w: 1440, h: 700 });
  await ev(pg, "__map.choose('checks')");
  const st: any = await ev(pg, "var S=__map.S;return [S.thread,S.step,__map.FR().z,document.getElementById('gwrap').classList.contains('framed')]");
  c.check('choosing a thread frames it (zoom > 1) and lights the whole path (reduced motion)', st[0] === 'checks' && st[1] === 5 && st[2] > 1 && st[3], st);
  const card: string = await ev(pg, "return document.getElementById('panel').innerText");
  c.check('thread card: hook, counts, read time, landing (the pressed question names it)', (await ev(pg, "return document.querySelector('.q[aria-pressed=true]').textContent")) === 'Who checks the work?' && ['Code is cheap', '3 articles ·', '40 min to read', 'wicked-crew (Related'].every((x) => card.includes(x)), card.slice(0, 200));
  const vis: any[] = await ev(pg, "var m=__map.G.threads.find(t=>t.id==='checks').stops;return [...document.querySelectorAll('.st.learn')].map(s=>[s.dataset.id,getComputedStyle(s.querySelector('.lab')).visibility,m.indexOf(s.dataset.id)>=0])");
  c.check('framed: members labelled, the rest dimmed and unlabelled', vis.every(([, v, mem]) => (v === 'visible') === mem), vis);
  c.check('framed: the rest stays visible (marks shown)', await ev(pg, "return [...document.querySelectorAll('.st.dimmed')].filter(s=>!s.classList.contains('gone')).every(s=>getComputedStyle(s).opacity>0)"));
  await ev(pg, "document.getElementById('tPrev').click()");
  c.check('step back', (await ev(pg, 'return __map.S.step')) === 4);
  c.check('URL carries the thread and step', pg.url().includes('thread=checks') && pg.url().includes('step=4'), pg.url());
  await ev(pg, "__map.choose('green')");
  c.check('a thread with no lab stop says so', (await ev<string>(pg, "return document.getElementById('panel').innerText")).includes('This thread stays in Learn'));
  await ev(pg, "__map.choose(null);__map.select('code-is-cheap')");
  const cr: string = await ev(pg, "return document.getElementById('panel').innerText");
  c.check("crossroads: 'This piece is in 2 threads' with a jump to each", cr.toLowerCase().includes('in 2 threads') && (await ev(pg, "return document.querySelectorAll('#panel [data-jump]').length")) === 2, cr.slice(0, 200));
  await ev(pg, "document.querySelector('#panel [data-jump=\"checks\"]').click()"); await pg.waitForTimeout(50);
  c.check('a crossroads jump frames that thread', (await ev(pg, 'return __map.S.thread')) === 'checks');
  c.check('crossroads carry a marker', (await ev(pg, "return document.querySelectorAll('.st.cross').length")) >= 3);
  await pg.goto(baseURL + '/?thread=state&step=2'); await pg.waitForTimeout(200);
  c.check('a thread URL restores', (await ev(pg, "return __map.S.thread+':'+__map.S.step")) === 'state:2');
  await ev(pg, '__map.choose(null)'); await pg.keyboard.press('Tab'); await pg.keyboard.press('Tab');
  const focusables = await ev(pg, "return document.querySelectorAll('#stations .st[tabindex=\"0\"]').length");
  c.check('every station is keyboard-reachable', focusables === 16, focusables);
  await pg.focus('.st[data-id="code-is-cheap"]'); await pg.keyboard.press('ArrowRight');
  c.check('arrow keys move along the map', (await ev(pg, 'return document.activeElement.dataset.id')) === 'all-green', await ev(pg, 'return document.activeElement.dataset.id'));
  await pg.keyboard.press('Enter');
  c.check('Enter selects', (await ev(pg, 'return __map.S.node')) === 'all-green');
  const t0 = await ev(pg, 'return document.documentElement.dataset.theme'); await ev(pg, "document.getElementById('themeBtn').click()");
  c.check('theme switch', (await ev(pg, 'return document.documentElement.dataset.theme')) !== t0);
  c.check('no page errors (threads)', !errs.length, errs);
  await ctx.close();
  c.done('threads');
});

test('filters: the Learn and Work checkboxes and the type pills', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const c = new Checks();
  const { ctx, pg, errs } = await open(browser, baseURL!, { w: 1440, h: 700 });
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(150);
  const on = async (): Promise<string[]> => sorted(await ev(pg, "return [...document.querySelectorAll('#stations .st:not(.off)')].map(s=>s.dataset.id)"));
  const allmarks: string[] = sorted(await ev(pg, "return [...document.querySelectorAll('#stations .st')].map(s=>s.dataset.id)"));
  c.check('filters: no dropdowns are left on the map', (await ev(pg, "return document.querySelectorAll('#graph select').length")) === 0);
  // the count is part of each checkbox's name now (final review P3), in visually hidden text after the side's name
  c.check('filters: Learn and Work are real checkboxes, both on', same(await ev(pg, "return [...document.querySelectorAll('#controls input[type=checkbox]')].map(c=>c.checked+':'+c.closest('label').querySelector('.t').textContent.trim())"), ['true:Learn', 'true:Work']));
  c.check("filters: each checkbox's name carries its count (final review P3)", same(await ev(pg, "return [...document.querySelectorAll('#controls label.cbx')].map(l=>l.textContent.replace(/\\s+/g,' ').trim())"), ['Learn, 11 pieces', 'Work, 5 pieces']), await ev(pg, "return [...document.querySelectorAll('#controls label.cbx')].map(l=>l.textContent)"));
  const pills: any[] = await ev(pg, "return [...document.querySelectorAll('.pill')].map(p=>[p.dataset.pill,p.getAttribute('aria-pressed'),p.disabled,p.innerText.replace(/\\s+/g,' ').trim()])");
  // no Video pill (operator, 2026-11-03, wickedagile#70): a future video lands in Other
  c.check('types: Article, Bit, Repository, Other as toggle pills, all on (no Video pill)', same(pills.map((x) => x[0]), ['article', 'bit', 'repository', 'other']) && pills.every((x) => x[1] === 'true' && !x[2]) && !(await ev(pg, "return /Video|none yet/.test(document.getElementById('graph').textContent+document.getElementById('learn').textContent)")), pills);
  await pg.click('.pill[data-pill="article"]'); await pg.waitForTimeout(40);
  const essays: string[] = await ev(pg, "return __map.G.nodes.filter(n=>n.type==='essay').map(n=>n.id)");
  c.check('one type off: articles leave the map, everything else stays', same(await on(), sorted(allmarks.filter((x) => !essays.includes(x)))) && (await ev(pg, "return document.querySelector('.pill[data-pill=article]').getAttribute('aria-pressed')")) === 'false');
  await pg.click('.pill[data-pill="repository"]'); await pg.waitForTimeout(40);
  c.check('multi-select: a second type off narrows further (bit and Other left)', same(await on(), ['platform', 'the-work']), await on());
  c.check('filters are in the URL', pg.url().includes('off=article%2Crepository') || pg.url().includes('off=article,repository'), pg.url());
  await pg.reload(); await pg.waitForTimeout(250);
  c.check('the URL restores them', same(await on(), ['platform', 'the-work']) && (await ev(pg, "return document.querySelector('.pill[data-pill=repository]').getAttribute('aria-pressed')")) === 'false', await on());
  await pg.click('.pill[data-pill="article"]'); await pg.click('.pill[data-pill="repository"]'); await pg.waitForTimeout(40);
  c.check('toggling back on restores every mark', same(await on(), allmarks));
  await pg.focus('#cb-work'); await pg.keyboard.press('Space'); await pg.waitForTimeout(40);
  c.check('Work off (keyboard Space on the checkbox): only Learn marks', (await ev(pg, "return document.querySelectorAll('.st.work:not(.off)').length")) === 0 && (await ev(pg, "return document.querySelectorAll('.st.learn:not(.off)').length")) === 11 && pg.url().includes('work=0'));
  const BOX = (d: string) => `var c=document.querySelector('.cbx[data-door=${d}]');return [c.offsetWidth,c.offsetHeight,getComputedStyle(c).borderTopStyle,getComputedStyle(c.querySelector('.mkl')).strokeDasharray]`;
  const onBox: any = await ev(pg, BOX('learn'));
  const offBox: any = await ev(pg, BOX('work'));
  await ev(pg, '__map.set({work:true})'); await pg.waitForTimeout(40);
  const back: any = await ev(pg, BOX('work'));
  c.check('checkboxes: on and off are the same size; off reads as off (dashed edge, dotted mark), on as a solid, filled route', same(offBox.slice(0, 2), back.slice(0, 2)) && offBox[2] === 'dashed' && back[2] === 'solid' && onBox[2] === 'solid' && offBox[3] !== back[3], [onBox, offBox, back]);
  c.check("checkboxes: each side's mark is a graphic in its own colour, never text colour", await ev(pg, "var l=document.querySelector('.cbx[data-door=learn]'),w=document.querySelector('.cbx[data-door=work]');return getComputedStyle(w.querySelector('.mkl')).stroke!==getComputedStyle(l.querySelector('.mkl')).stroke&&getComputedStyle(w.querySelector('.t')).color===getComputedStyle(l.querySelector('.t')).color"));
  c.check("reduced motion: the marks don't animate", await ev(pg, "return [...document.querySelectorAll('.cbx .mkl,.cbx .mks')].every(x=>x.getAnimations().length===0)"));
  await ev(pg, '__map.set({work:false})'); await pg.waitForTimeout(20);
  await pg.click('label.cbx[data-door="learn"]'); await pg.waitForTimeout(40);
  c.check('both checkboxes off: nothing shows, with a short empty state and Clear filters (one name for the action)', same(await on(), []) && await ev(pg, "var e=document.getElementById('mapEmpty');return !e.hidden&&e.getClientRects().length>0&&/Clear filters/.test(e.innerText)"));
  c.check('the checked state is obvious (box filled on, empty off)', (await ev(pg, "var a=getComputedStyle(document.querySelector('.cbx[data-door=learn] .box')).backgroundColor;return a")) !== (await ev(pg, "__map.set({learn:true});var a=getComputedStyle(document.querySelector('.cbx[data-door=learn] .box')).backgroundColor;__map.set({learn:false});return a")));
  await pg.click('#resetF4'); await pg.waitForTimeout(60);
  c.check('Reset brings everything back and focuses the first control', same(await on(), allmarks) && (await ev(pg, 'return document.activeElement.id')) === 'cb-learn' && !pg.url().includes('learn=') && !pg.url().includes('work='));
  await ev(pg, "['article','bit','repository','other'].forEach(id=>document.querySelector('.pill[data-pill='+id+']').click()); return null;");
  c.check('types off leave every type off the map, and the empty state shows', same(await on(), []) && await ev(pg, "return !document.getElementById('mapEmpty').hidden"));
  await pg.click('#resetF4'); await pg.waitForTimeout(40);
  c.check('filtered-out labels are hidden, not faint', await ev(pg, "document.querySelector('.pill[data-pill=article]').click();return [...document.querySelectorAll('.st.off .lab')].every(l=>getComputedStyle(l).visibility==='hidden')"));
  // final review P3: a hidden mark adds no glow, and a thread with a hidden stop is dimmed
  c.check('filtered-out marks draw no hull glow, and routes through them are dimmed (final review P3)', await ev(pg, "var off=[...document.querySelectorAll('.st.off')].map(s=>s.dataset.id);return off.length>0&&[...document.querySelectorAll('#svg .route')].every(p=>{var t=__map.G.threads.find(x=>x.id===p.dataset.t);var part=t.stops.some(id=>off.indexOf(id)>=0);return p.classList.contains('part')===part&&(!part||parseFloat(getComputedStyle(p).opacity)<=0.2);})&&[...document.querySelectorAll('#hulls .hullg')].every(g=>g.classList.contains('part')===__map.G.threads.find(x=>x.id===g.dataset.t).stops.some(id=>off.indexOf(id)>=0))"));
  await ev(pg, "document.getElementById('resetF4').click()");
  await pg.goto(baseURL + '/?door=work'); await pg.waitForTimeout(250);
  c.check('an old ?door=work link still works (Learn off)', await ev(pg, 'return __map.S.learn===false&&__map.S.work===true'));
  await pg.goto(baseURL + '/?work=0&off=bit'); await pg.waitForTimeout(250);
  c.check('a link that carries filters opens on the map', Math.abs((await ev(pg, "return document.getElementById('graph').getBoundingClientRect().top")) - 56) <= 2 && await ev(pg, 'return __map.S.work===false&&!!__map.S.off.bit'));
  await pg.goto(baseURL + '/?type=essay&topic=fiction'); await pg.waitForTimeout(250);
  c.check('an old ?type=essay link keeps articles only; topic is no longer a map filter', await ev(pg, 'var S=__map.S;return !S.off.article&&S.off.bit&&S.off.repository&&S.off.other'));
  for (const [w, h] of [[1440, 700], [1280, 660], [390, 844]]) {
    await pg.setViewportSize({ width: w, height: h }); await pg.goto(baseURL + '/'); await pg.waitForTimeout(300);
    await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(150);
    const small = await ev(pg, "return [...document.querySelectorAll('#graph *')].filter(x=>x.getClientRects().length&&[...x.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim())&&getComputedStyle(x).visibility!=='hidden'&&!x.closest('.sr,svg,.nojs')&&parseFloat(getComputedStyle(x).fontSize)<12).map(x=>x.tagName+'.'+x.className+':'+getComputedStyle(x).fontSize+' '+x.textContent.trim().slice(0,16)).slice(0,6)");
    c.check(`min font ${w}x${h}: every label in the map section, the checkboxes, pills and questions included, is 12px or larger`, !small.length, small);
    c.check(`targets ${w}x${h}: checkboxes, pills and questions at least 36px tall, marks 22px`, await ev(pg, "return [...document.querySelectorAll('.cbx, .pill, .q, .qclear:not([hidden]), .tcard, .st')].filter(x=>x.getClientRects().length).every(x=>{var r=x.getBoundingClientRect();return x.classList.contains('st')?r.width>=22&&r.height>=22:r.height>=36;})"));
  }
  c.check('no page errors (filters)', !errs.length, errs);
  await ctx.close();
  c.done('filters');
});

test('questions: the thread questions above the map', async ({ browser, baseURL }) => {
  const c = new Checks();
  const { ctx, pg, errs } = await open(browser, baseURL!, { w: 1440, h: 700 });
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(150);
  c.check('questions: the five thread questions are buttons above the map; the small badges are gone from the map (final review P3)', (await ev(pg, "return document.querySelectorAll('#qrow .q').length")) === 5 && (await ev(pg, "return document.querySelectorAll('.tb').length")) === 0);
  await pg.hover('.q[data-thread="checks"]'); await pg.waitForTimeout(40);
  c.check('hovering a question lights its route without choosing it', await ev(pg, "return document.getElementById('gwrap').classList.contains('preview')&&document.querySelector('.route.pv').dataset.t==='checks'&&__map.S.thread===null"));
  await pg.click('.q[data-thread="checks"]'); await pg.waitForTimeout(60);
  c.check('clicking it chooses it: pressed, framed, Clear shown', await ev(pg, "return document.querySelector('.q[data-thread=checks]').getAttribute('aria-pressed')==='true'&&__map.S.thread==='checks'&&!document.getElementById('qClear').hidden"));
  await pg.mouse.move(2, 2); await pg.focus('.q[data-thread="green"]'); await pg.waitForTimeout(40);
  c.check('focus previews too', await ev(pg, "return document.querySelector('.route.pv').dataset.t==='green'"));
  await pg.click('#qClear'); await pg.waitForTimeout(60);
  c.check('Clear clears it and keeps focus on its question', await ev(pg, "return __map.S.thread===null&&document.getElementById('qClear').hidden&&document.activeElement.dataset.thread==='checks'"));
  await pg.click('.q[data-thread="state"]'); await pg.waitForTimeout(40); await pg.click('.q[data-thread="state"]'); await pg.waitForTimeout(40);
  c.check('clicking the chosen question again clears it', await ev(pg, 'return __map.S.thread===null'));
  c.check('no page errors (questions)', !errs.length, errs);
  await ctx.close();
  c.done('questions');
});

test('phone: the thread cards and the compact map', async ({ browser, baseURL }) => {
  const c = new Checks();
  const { ctx, pg, errs } = await open(browser, baseURL!, { w: 390, h: 844 });
  c.check('phone: a row of thread cards', (await ev(pg, "return getComputedStyle(document.getElementById('tcards')).display")) === 'flex' && (await ev(pg, "return document.querySelectorAll('.tcard').length")) === 5);
  c.check('phone: frames Start here by default', (await ev(pg, 'return __map.S.thread')) === 'start' && (await ev(pg, 'return __map.FR().z')) > 1);
  await ev(pg, "var r=document.getElementById('tcards'),c=r.querySelectorAll('.tcard')[2];r.scrollTo({left:c.offsetLeft-16})"); await pg.waitForTimeout(450);
  c.check('phone: swiping the row picks that thread', (await ev(pg, 'return __map.S.thread')) === 'checks', await ev(pg, 'return __map.S.thread'));
  await ev(pg, "__map.choose('state')");
  const fr = await ev(pg, "var t=__map.G.threads.find(x=>x.id==='state');return t.stops.filter(id=>__map.G.nodes.find(n=>n.id===id).door==='learn').map(id=>document.querySelector('.st[data-id=\"'+id+'\"] .num').textContent)");
  c.check('phone: a framed thread numbers its stops in order', same(fr, ['1', '2']), fr);
  // final review P3 (WCAG 2.5.3): a phone mark's name starts with the number it shows
  c.check("phone: a mark's accessible name starts with its number (final review P3)", await ev(pg, "return [...document.querySelectorAll('.st.learn')].every(s=>s.getAttribute('aria-label').indexOf(s.querySelector('.num').textContent+'. ')===0)"), await ev(pg, "return [...document.querySelectorAll('.st.learn')].slice(0,3).map(s=>s.getAttribute('aria-label'))"));
  await ev(pg, '__map.choose(null)');
  const nums = await ev(pg, "return [...document.querySelectorAll('.st.learn .num')].map(x=>x.textContent)");
  const lst = await ev(pg, "return [...document.querySelectorAll('#ed .num')].map(x=>x.textContent)");
  c.check('phone: overview numbers match the ordered list', same(nums, lst) && lst.length === 11, [nums, lst]);
  c.check('phone: graph is real (marks and routes drawn)', (await ev(pg, "return document.querySelectorAll('#svg .route').length")) === 5);
  c.check('phone: no page errors', !errs.length, errs);
  await ctx.close();
  c.done('phone');
});

test('motion: the ambient flow, the pulse, the draw-in and the idle tour', async ({ browser, baseURL }) => {
  const c = new Checks();
  let o: Opened = await open(browser, baseURL!, { w: 1440, h: 700, reduced: false });
  let pg = o.pg;
  c.check('motion: ambient flow drawn', (await ev(pg, "return document.querySelectorAll('#svg .ambient').length")) === 5);
  await ev(pg, "document.getElementById('cb-work').click();document.getElementById('cb-work').click()"); await pg.waitForTimeout(30);
  c.check('motion: switching a side on draws its mark in', (await ev(pg, "return document.querySelector('.cbx[data-door=work] .mkl').getAnimations().length")) > 0);
  c.check('idle tour waits while the map is out of view (the page opens on the hero)', (await ev(pg, 'return __map.tour()')) === false);
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(250);
  c.check('the routes draw in the first time the map is in view', (await ev(pg, "return document.querySelector('#svg .route').getAnimations().length")) > 0);
  c.check('idle tour starts when idle', (await ev(pg, 'return __map.tour()')) === true && await ev(pg, 'return __map.touring()'));
  await pg.keyboard.press('Shift'); await pg.waitForTimeout(50);
  c.check('idle tour stops on input', !(await ev(pg, 'return __map.touring()')) && (await ev(pg, 'return __map.S.thread')) === null);
  // the pulse travels only where it can be seen: the map is on screen here (off screen it ends, offscreen.spec.ts)
  await ev(pg, "__map.choose('checks',5)"); await pg.waitForTimeout(120);
  const a = await ev(pg, "return document.getElementById('pulse').style.transform"); await pg.waitForTimeout(300); const b = await ev(pg, "return document.getElementById('pulse').style.transform");
  c.check('motion: a pulse travels along the lit path', a !== b && await ev(pg, "return document.getElementById('pulse').classList.contains('on')"), [a, b]);
  await ev(pg, '__map.choose(null)'); await pg.waitForTimeout(50);
  await ev(pg, "Object.defineProperty(document,'hidden',{configurable:true,get:()=>true})");
  c.check('idle tour is off when the tab is hidden', (await ev(pg, 'return __map.tour()')) === false);
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 1440, h: 700, reduced: true }); pg = o.pg;
  c.check('reduced motion: no ambient flow, no pulse, no tour', (await ev(pg, "return document.querySelectorAll('#svg .ambient').length")) === 0 && await ev(pg, "__map.choose('start');return !document.getElementById('pulse').classList.contains('on')") && (await ev(pg, '__map.choose(null);return __map.tour()')) === false);
  c.check('reduced motion: the path is fully lit at once', (await ev(pg, "__map.choose('start');return __map.S.step")) === 5);
  await o.ctx.close();
  c.done('motion');
});

test('fit: every frame fits the viewport and snaps', async ({ browser, baseURL }) => {
  const c = new Checks();
  for (const [w, h] of [[1440, 700], [1280, 660], [1920, 1080], [390, 844], [360, 740]]) {
    const { ctx, pg } = await open(browser, baseURL!, { w, h, reduced: false });
    const r = await ev(pg, String.raw`var hh=document.querySelector('header.topbar').offsetHeight,out=[];document.querySelectorAll('.snap').forEach(s=>{if(Math.abs(s.getBoundingClientRect().height-(innerHeight-hh))>1)out.push(s.id+' height');var w=s.querySelector('.wrap');if(w.scrollHeight>w.clientHeight+1)out.push(s.id+' overflows by '+(w.scrollHeight-w.clientHeight));});
      if(getComputedStyle(document.documentElement).scrollSnapType.indexOf('mandatory')<0)out.push('no snap');if(document.documentElement.scrollWidth>innerWidth)out.push('h-scroll');return out`);
    c.check(`fit ${w}x${h}: every section fits the viewport and snaps`, !r.length, r);
    await ctx.close();
  }
  // review r1: under reduced motion the page doesn't snap (snapping moves the viewport for you; wicked-web#31)
  const rm = await open(browser, baseURL!, { w: 1440, h: 700, reduced: true });
  c.check('fit: with reduced motion the page scrolls freely (no snapping)', (await ev(rm.pg, 'return getComputedStyle(document.documentElement).scrollSnapType')) === 'none');
  await rm.ctx.close();
  c.done('fit');
});

test('folds: the review folds of rev 8 to 10', async ({ browser, baseURL }) => {
  test.setTimeout(120_000);
  const c = new Checks();
  let o = await open(browser, baseURL!, { w: 1440, h: 700 });
  let pg = o.pg;
  await ev(pg, "__map.choose('green')");
  const pt: string = await ev(pg, "return document.getElementById('panel').innerText");
  c.check('stays-in-Learn wording is exact', pt.includes('This thread stays in Learn.') && !pt.includes('nothing in the lab'), pt.slice(0, 120));
  c.check('thread card shows stop dates', pt.includes('Oct 17') && pt.includes('Oct 24'));
  await ev(pg, "__map.choose(null);__map.select('platform')");
  const pl = (await ev<string>(pg, "return document.getElementById('panel').innerText")).split('\n').map((x) => x.trim()).filter(Boolean);
  c.check("Platform panel: only its name, 'the enterprise ADE' and the badge", same(pl.slice(0, 4).map((x) => x.toLowerCase()), [G.labels.work.toLowerCase() + ' · featured', 'wicked ai platform', 'the enterprise ade', 'experiment']) && pl.length <= 5, pl);
  await ev(pg, "__map.select('estate')");
  const est: string = await ev(pg, "return document.getElementById('panel').innerText");
  c.check('lab relations read as directional sentences', est.includes('wicked-garden reads wicked-estate’s code graph'));
  c.check('versions read "v0.32.0" in the map panel as on the Work cards (final review P3)', est.includes('v0.32.0'), est.slice(0, 200));
  await ev(pg, "__map.choose('checks')"); await ev(pg, "document.querySelector('.pill[data-pill=bit]').click()"); await pg.waitForTimeout(50);
  c.check('a filter change clears the framed thread', await ev(pg, "return __map.S.thread===null&&!document.getElementById('gwrap').classList.contains('framed')"));
  await ev(pg, "document.querySelector('.pill[data-pill=bit]').click();document.querySelector('.pill[data-pill=article]').click()"); await pg.waitForTimeout(50);
  c.check('the Learn cards follow the filters (compact, featured hidden)', (await ev(pg, "return [...document.querySelectorAll('#ed [data-node]')].filter(l=>!l.hidden).length")) === 1 && (await ev<string>(pg, "return document.getElementById('learnNote').innerText")).includes('1 of 11') && await ev(pg, "return document.getElementById('ed').classList.contains('all')&&document.getElementById('showAll').hidden"));
  c.check('idle tour refuses while a filter is on', (await ev(pg, 'return __map.tour()')) === false);
  await ev(pg, "document.getElementById('resetF').click()");
  await ev(pg, "__map.choose('checks')");
  const hid = await ev(pg, "return [...document.querySelectorAll('.q')].filter(b=>b.getAttribute('aria-pressed')==='true').map(b=>b.dataset.thread)");
  c.check('framed: only the chosen question is pressed', same(hid, ['checks']), hid);
  const inside = await ev(pg, "var g=document.getElementById('gwrap').getBoundingClientRect();return [...document.querySelectorAll('#stations .st')].filter(s=>{var r=s.querySelector('.dot').getBoundingClientRect();return r.left>=g.left&&r.right<=g.right&&r.top>=g.top&&r.bottom<=g.bottom&&getComputedStyle(s).opacity>0}).length");
  c.check('framed: the lens keeps every mark on the map', inside === 16, inside);
  c.check('constellation hulls are regions (one per thread, member boxes + route)', await ev(pg, "return document.querySelectorAll('#hulls .hullg').length===5&&[...document.querySelectorAll('#hulls .hullg')].every(g=>g.querySelectorAll('rect').length>=4&&g.querySelector('path'))"));
  await ev(pg, '__map.choose(null)'); await pg.hover('.st[data-id="code-is-cheap"] .dot'); await pg.waitForTimeout(40);
  const ne = await ev(pg, "return document.querySelectorAll('#nedges path').length");
  c.check('hover draws the real neighbourhood edges', ne >= 3 && !(await ev<string[]>(pg, 'return __audit()')).length, ne);
  await pg.mouse.move(2, 2);
  await pg.goto(baseURL + '/#learn'); await pg.waitForTimeout(200);
  await ev(pg, "document.querySelector('#learnList [data-show=\"lookalike\"]').click()"); await pg.waitForTimeout(100);
  c.check("'Show in the graph' points the URL at the map", pg.url().endsWith('#graph') && pg.url().includes('node=lookalike'), pg.url());
  c.check('no page errors (folds)', !o.errs.length, o.errs);
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 1440, h: 700, reduced: false }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(250);
  await ev(pg, "__map.chooseAnimated('checks')"); await pg.waitForTimeout(650);
  await pg.focus('#tPrev'); await pg.waitForTimeout(1000);
  c.check('panel focus survives the stop-by-stop lighting', (await ev(pg, 'return document.activeElement&&document.activeElement.id')) === 'tPrev');
  await ev(pg, '__map.choose(null)'); await pg.waitForTimeout(600);
  await ev(pg, '__map.set({work:false})');
  c.check('idle tour refuses while a door filter is on', (await ev(pg, 'return __map.tour()')) === false);
  await ev(pg, '__map.set({work:true});document.activeElement.blur()');
  c.check('idle tour starts from the overview', (await ev(pg, 'return __map.tour()')) === true);
  await pg.keyboard.press('Shift'); await pg.waitForTimeout(80);
  c.check('tour stop restores the overview and filters', await ev(pg, 'var S=__map.S;return !__map.touring()&&S.thread===null&&S.learn&&S.work&&!Object.keys(S.off).length'));
  await ev(pg, "__map.chooseAnimated('start')"); await pg.waitForTimeout(300);
  await pg.emulateMedia({ reducedMotion: 'reduce' }); await pg.waitForTimeout(200);
  c.check('reduced motion turned on mid-session settles at once', await ev(pg, "return __map.reduced()&&!document.getElementById('pulse').classList.contains('on')&&document.querySelectorAll('#svg .ambient').length===0&&__map.S.step===5"));
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 390, h: 844 }); pg = o.pg;
  c.check('phone: on the hero the URL carries no thread, so a reload stays on the hero', !pg.url().includes('thread='), pg.url());
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  c.check('phone: the default thread is in the URL once the map is in view', pg.url().includes('thread=start'), pg.url());
  await ev(pg, "document.getElementById('tPrev').click()");
  await pg.reload(); await pg.waitForTimeout(250);
  c.check('phone: a stepped stop survives reload', (await ev(pg, "return __map.S.thread+':'+__map.S.step")) === 'start:4');
  await ev(pg, "__map.choose(null);__map.select('code-is-cheap')"); await ev(pg, "document.getElementById('moreBtn').click()"); await pg.waitForTimeout(50);
  c.check('phone: Details opens a sheet with the summary and every link', await ev(pg, "var p=document.getElementById('panel');return p.classList.contains('sheet')&&p.innerText.indexOf('Why AI-native engineering')>=0&&p.innerText.toLowerCase().indexOf('all of them')>=0"));
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(50);
  c.check('phone: Escape closes the sheet and returns focus', await ev(pg, "return !document.getElementById('panel').classList.contains('sheet')&&document.activeElement.id==='moreBtn'"));
  await ev(pg, "__map.choose('state')"); await ev(pg, "document.getElementById('moreBtn').click()");
  const sh: string = await ev(pg, "return document.getElementById('panel').innerText");
  c.check('phone: the full hook is in the sheet', sh.includes('If I deleted') || sh.includes('deleted the screen'));
  await ev(pg, "document.getElementById('learn').scrollIntoView()"); await pg.waitForTimeout(300);
  c.check('phone: the details sheet closes when the map leaves the screen', !(await ev(pg, "return document.getElementById('panel').classList.contains('sheet')")));
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300); await ev(pg, "__map.choose('checks')");
  c.check('phone: the thread card lists its stops in one line', await ev(pg, "var l=document.querySelector('#panel .stopsl');return !!l&&l.getClientRects().length>0&&l.textContent.indexOf('1 Code Is Cheap')===0"));
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 390, h: 844, js: false }); pg = o.pg;
  c.check('no-JS phone header: no section links (operator, 2026-11-03), the script-only buttons hidden', (await pg.locator('#nav a.family-sec').count()) === 0 && await pg.locator('#menuBtn').isHidden() && await pg.locator('#themeBtn').isHidden());
  await o.ctx.close();
  c.done('folds');
});

test('nojs: the page without script', async ({ browser, baseURL }) => {
  const c = new Checks();
  const { ctx, pg } = await open(browser, baseURL!, { w: 1440, h: 700, js: false });
  const cards = pg.locator('#ed [data-node]');
  let allShown = true;
  for (let i = 0; i < (await cards.count()); i++) allShown = allShown && await cards.nth(i).isVisible();
  c.check('no-JS: every Learn piece is there and shown', (await cards.count()) === 11 && allShown);
  c.check('no-JS: Work is there (studio, Platform, three components, the install command)', (await pg.locator('#work [data-node]').count()) === 5 && await pg.locator('#cmd').isVisible());
  c.check('no-JS: nothing is cut off (sections grow, no snapping)', await ev(pg, "return [...document.querySelectorAll('.snap')].every(s=>s.scrollHeight<=s.clientHeight+1)&&getComputedStyle(document.documentElement).scrollSnapType.indexOf('mandatory')<0"));
  c.check('no-JS: the map is hidden and says why', await pg.locator('.stage').isHidden() && await pg.locator('.nojs').isVisible());
  await ctx.close();
  c.done('nojs');
});

test('hero: the decided copy, the braid and its Work line running on', async ({ browser, baseURL }) => {
  const c = new Checks();
  let o = await open(browser, baseURL!, { w: 1440, h: 700, reduced: false });
  let pg = o.pg;
  c.check('the page opens on the hero, with the decided copy', (await ev(pg, "return document.getElementById('home').getBoundingClientRect().top")) <= 57 && (await ev<string>(pg, "return document.getElementById('hh').innerText")).replace(/\n/g, ' ') === G.hero.h1 && (await ev(pg, "return document.getElementById('heroSub').innerText")) === G.hero.sub);
  const ctas = await ev(pg, "return [...document.querySelectorAll('#home .ctas a')].map(a=>a.getAttribute('href')+' '+a.innerText.trim())");
  c.check('hero CTAs: follow a thread, Learn, Work', same(ctas, ['#graph Follow a thread', '#learn ' + G.labels.learn, '#work ' + G.labels.work]), ctas);
  c.check('the braid moves (strands reveal, two dots travel)', (await ev(pg, "return document.querySelector('.braid .rev').getAnimations().length")) > 0 && (await ev(pg, "return document.querySelectorAll('.braid animateMotion').length")) === 2);
  c.check("the braid's labels are text in an ink token, never the signal yellow", await ev(pg, "var c=[...document.querySelectorAll('.braid .bl')].map(t=>getComputedStyle(t).fill),w=getComputedStyle(document.querySelector('.braid .s.w')).stroke;return c.length===2&&c[0]===c[1]&&c.indexOf(w)<0"));
  c.check('R17 (scoped): every hyphen in a product name is pulled in', await ev(pg, "return [...document.querySelectorAll('.st .lab b, .wcard .ttl, .ccard .ttl')].filter(x=>/wicked/.test(x.textContent)).every(x=>!!x.querySelector('.hy'))"));
  // wickedagile#69: the hero's Work line no longer leaves the bottom edge; it turns and runs on to "Follow a thread"
  await pg.waitForTimeout(300);
  c.check("the hero's Work line runs on: the hero's own tube ends at its turn and the run carries it to Follow a thread (wickedagile#69)", await ev(pg, "var own=[...document.querySelectorAll('.braid .tube,.braid .tube-o')].map(p=>p.getAttribute('d')),run=document.querySelector('.braid-run path.tube'),cap=document.querySelector('.braid-run circle.cap');return own.length===2&&own.every(d=>!/L580 2400$/.test(d))&&!!run&&/^M[\\d.]+ [\\d.]+ Q/.test(run.getAttribute('d'))&&+cap.getAttribute('r')>0"));
  await pg.click('#home .ctas a.primary'); await pg.waitForTimeout(900);
  c.check('Follow a thread goes to the map', Math.abs((await ev(pg, "return document.getElementById('graph').getBoundingClientRect().top")) - 56) <= 2);
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 1440, h: 700, reduced: true }); pg = o.pg;
  c.check('reduced motion: the braid is settled (no reveal, no dots)', (await ev(pg, "return document.querySelector('.braid .rev').getAnimations().length")) === 0 && await ev(pg, "return [...document.querySelectorAll('.braid .dotm')].every(d=>getComputedStyle(d).display==='none')"));
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 1440, h: 700, url: '?hero=b' }); pg = o.pg;
  c.check('there are no hero previews any more (?hero= changes nothing, and the URL drops it)', (await ev<string>(pg, "return document.getElementById('hh').innerText")).replace(/\n/g, ' ') === G.hero.h1 && !pg.url().includes('hero=') && !(await ev(pg, "return document.getElementById('heroNote')")), pg.url());
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 1440, h: 700, url: '?thread=checks&step=3' }); pg = o.pg;
  c.check('a link that carries map state opens on the map', Math.abs((await ev(pg, "return document.getElementById('graph').getBoundingClientRect().top")) - 56) <= 2 && (await ev(pg, 'return __map.S.thread')) === 'checks');
  c.check('no page errors (hero)', !o.errs.length, o.errs);
  await o.ctx.close();
  c.done('hero');
});

test('learn: the editorial frame, Show all and Show fewer', async ({ browser, baseURL }) => {
  const c = new Checks();
  for (const [w, h, wantN] of [[1440, 700, 5], [1280, 660, 5], [1920, 1080, 7], [390, 844, 5], [360, 740, 4]]) {
    const { ctx, pg } = await open(browser, baseURL!, { w, h });
    await ev(pg, "document.getElementById('learn').scrollIntoView()"); await pg.waitForTimeout(100);
    const vis: string[] = await ev(pg, "return [...document.querySelectorAll('#ed [data-node]')].filter(c=>c.getClientRects().length).map(c=>c.dataset.node)");
    c.check(`learn ${w}x${h}: the newest piece is featured, then ${wantN - 1} more, the bit among them`, vis.length === wantN && vis[0] === 'all-green' && vis.includes('the-work') && (await ev(pg, "return document.querySelector('#ed .edfeat').dataset.node")) === 'all-green', vis);
    c.check(`learn ${w}x${h}: the bit has its own card style`, await ev(pg, "var b=document.querySelector('.ecard.bit');return !!b&&getComputedStyle(b).backgroundImage.indexOf('gradient')>=0"));
    if (w > 760) c.check(`learn ${w}x${h}: cards carry cover art, a type glyph and thread chips`, await ev(pg, "return [...document.querySelectorAll('#ed [data-node]')].filter(c=>c.getClientRects().length).every(c=>c.querySelector('.cover svg')&&c.querySelector('.glyph')&&c.querySelector('.tchip'))"));
    await ev(pg, "document.getElementById('showAll').click()"); await pg.waitForTimeout(80);
    const allv = await ev(pg, "return [...document.querySelectorAll('#ed [data-node]')].filter(c=>c.getClientRects().length).length");
    const fits = await ev(pg, "var s=document.getElementById('learn'),e=document.getElementById('ed'),r=e.getBoundingClientRect(),sr=s.getBoundingClientRect();return s.scrollHeight<=s.clientHeight+1&&r.bottom<=sr.bottom+1");
    c.check(`learn ${w}x${h}: Show all shows all 11 and the section stays in its frame`, allv === 11 && fits && (await ev(pg, "return document.getElementById('showAll').getAttribute('aria-expanded')")) === 'true', [allv, fits]);
    await ev(pg, "document.getElementById('showAll').click()"); await pg.waitForTimeout(50);
    c.check(`learn ${w}x${h}: Show fewer goes back`, (await ev(pg, "return [...document.querySelectorAll('#ed [data-node]')].filter(c=>c.getClientRects().length).length")) === wantN && (await ev(pg, 'return document.activeElement.id')) === 'showAll');
    await ctx.close();
  }
  c.done('learn');
});

test('work: the showcase, Copy and Under the hood', async ({ browser, baseURL }) => {
  const c = new Checks();
  const { ctx, pg, errs } = await open(browser, baseURL!, { w: 1440, h: 700 });
  await ctx.grantPermissions(['clipboard-read', 'clipboard-write']);
  await ev(pg, "document.getElementById('work').scrollIntoView()"); await pg.waitForTimeout(100);
  c.check('Work: studio and the Platform are featured, with art', same(await ev(pg, "return [...document.querySelectorAll('.wfeat .wcard')].map(c=>c.dataset.node+(c.querySelector('.art svg')?'+art':''))"), ['studio+art', 'platform+art']));
  c.check("Work: the Platform card has its name, 'the enterprise ADE' and the badge only, no link", await ev(pg, "var c=document.querySelector('.wcard.exp');return !c.querySelector('a')&&c.innerText.toLowerCase().replace(/\\s+/g,' ').indexOf('the enterprise ade wicked ai platform experiment')>=0"));
  const comps: any[] = await ev(pg, "return [...document.querySelectorAll('.wcomps .ccard')].map(c=>[c.dataset.node,!!c.querySelector('.ver'),c.querySelector('a.ttl').href,c.innerText.indexOf('Open in the lab')>=0])");
  c.check('Work: crew, garden, estate with their line, version and lab link', same(comps.map((x) => x[0]), ['crew', 'garden', 'estate']) && comps.every((x) => x[1] && x[2].startsWith('https://wickedlabs.ai/') && x[3]), comps);
  await pg.click('#copyBtn'); await pg.waitForTimeout(150);
  const clip = await pg.evaluate(() => navigator.clipboard.readText());
  c.check('Get started: Copy puts the command on the clipboard and says so', clip === 'npx wicked-installer' && (await ev<string>(pg, "return document.getElementById('copyBtn').innerText")).includes('Copied') && (await ev<string>(pg, "return document.getElementById('copyMsg').textContent")).includes('Copied'), clip);
  c.check('Under the hood: core, bus, interactive, one line each', same(await ev(pg, "return [...document.querySelectorAll('.whood li b')].map(b=>b.textContent)"), ['core', 'bus', 'interactive']));
  c.check('product names never break at their hyphen (final review P3)', await ev(pg, "return [...document.querySelectorAll('.wcard h3 .ttl,.ccard h3 .ttl,.wcard .pname')].every(a=>getComputedStyle(a).whiteSpace==='nowrap')"));
  c.check('no page errors (work)', !errs.length, errs);
  await ctx.close();
  c.done('work');
});

const DOOR_NAMES = String.raw`__map.choose('start');var p=document.getElementById('panel').innerText;__map.choose(null);return {
  cta:[...document.querySelectorAll('#home .ctas a')].slice(1).map(a=>a.innerText.trim()),
  shore:document.getElementById('shoreR').textContent, doors:[...document.querySelectorAll('.cbx .t')].map(b=>b.textContent),
  h2:[document.getElementById('lh').innerText,document.getElementById('wh').innerText],
  braid:[...document.querySelectorAll('.braid .bl')].map(t=>t.textContent), legend:document.getElementById('panel').textContent.indexOf('Lab, in '+__map.G.labels.work)>=0,
  card:p, map:document.getElementById('gwrap').getAttribute('aria-label'), nav:document.querySelectorAll('#nav a.family-sec').length};`;
const namesOk = (d: any, lb: any) => same(d.cta, [lb.learn, lb.work]) && d.shore === lb.work && same(d.doors, [lb.learn, lb.work]) && same(d.h2, [lb.learn, lb.work])
  && same(d.braid.map((x: string) => x.toLowerCase()), [lb.learn.toLowerCase(), lb.work.toLowerCase()]) && d.legend && d.card.toLowerCase().includes(lb.work.toLowerCase()) && d.map.includes(lb.work) && d.nav === 0;

test('labels: every door name is the data, and a rename is one edit', async ({ browser, baseURL }) => {
  const c = new Checks();
  const o = await open(browser, baseURL!, { w: 1440, h: 700 });
  // the page's own content (the family footer's bits promo says "Play it", which is no door name)
  const txt: string = await ev(o.pg, "return document.querySelector('main').innerText+document.querySelector('header').innerText");
  c.check("no 'Play' left on the page", !/\bPlay\b/.test(txt), (txt.match(/.{20}\bPlay\b.{10}/g) || []).slice(0, 3));
  const d = await ev(o.pg, DOOR_NAMES);
  c.check(`every door name on the page is the data's (${G.labels.learn}, ${G.labels.work})`, namesOk(d, G.labels), d);
  await o.ctx.close();
  // the renamed build: `npm run build:renamed` builds the site with labels.work = "Build" into dist-renamed/ (CI builds
  // it before the site; locally the check runs once it has been built), served to the browser from disk
  const built = existsSync(ROOT + 'dist-renamed/index.html');
  if (process.env.CI) c.check('a renamed door builds from one edit (labels.work = Build)', built);
  if (built) {
    const r = await openDist(browser, ROOT + 'dist-renamed', { w: 1440, h: 700 });
    const d2 = await ev(r.pg, DOOR_NAMES);
    c.check('...and every door name on the page says Build: CTAs, shore, filters, headings, the braid, the legend, the thread card, the map', namesOk(d2, { learn: G.labels.learn, work: 'Build' }), d2);
    await r.ctx.close();
  }
  c.done('labels');
});

test('folds2: history, inert marks, draft marks, deep links, focus across breakpoints', async ({ browser, baseURL }) => {
  const c = new Checks();
  let o = await open(browser, baseURL!, { w: 1440, h: 700, url: '?thread=checks&step=5' });
  let pg = o.pg;
  await ev(pg, "history.pushState(null,'',location.pathname+'?node=studio');dispatchEvent(new PopStateEvent('popstate'))"); await pg.waitForTimeout(80);
  c.check('Back/Forward restores the state its URL names', await ev(pg, "return __map.S.thread===null&&__map.S.node==='studio'"));
  await ev(pg, "__map.choose(null);document.querySelector('.pill[data-pill=article]').click()"); await pg.waitForTimeout(40);
  c.check('filtered-out marks leave the accessibility tree (inert)', await ev(pg, "return [...document.querySelectorAll('.st.off')].every(s=>s.inert)&&[...document.querySelectorAll('.st:not(.off)')].every(s=>!s.inert)"));
  await ev(pg, "document.querySelector('.pill[data-pill=article]').click()"); await pg.waitForTimeout(40);
  await pg.focus('.pill[data-pill="bit"]');
  c.check('the idle tour waits while keyboard focus is in the map', (await ev(pg, 'return __map.tour()')) === false);
  await pg.evaluate(() => (document.activeElement as HTMLElement).blur());
  // production hides the draft marks (DES §5.1): the threads are drafts in the data, and no chip shows
  await ev(pg, "__map.choose('checks')");
  c.check('production: no Draft chip while the marks are off, though the thread is a draft in the data', await ev(pg, "return __map.G.threads.every(t=>t.draft===true)&&!document.querySelector('#panel .draft')"));
  await ev(pg, "__map.drafts(true);__map.G.threads.forEach(t=>t.draft=false);__map.choose('checks')");
  c.check("the Draft chip follows each thread's status", await ev(pg, "return !document.querySelector('#panel .draft')"));
  await ev(pg, "__map.G.threads.forEach(t=>t.draft=true);__map.choose('checks')");
  c.check('...and shows while it is a draft', await ev(pg, "return !!document.querySelector('#panel .draft')"));
  await ev(pg, '__map.drafts(false)');
  await ev(pg, "document.getElementById('work').scrollIntoView()"); await pg.waitForTimeout(60);
  c.check("crew, garden and estate each have 'On the map'", await ev(pg, "return [...document.querySelectorAll('.wcomps .ccard')].every(c=>c.querySelector('[data-show]'))"));
  c.check('every Learn and Work title says it opens elsewhere (an arrow)', await ev(pg, "return [...document.querySelectorAll('#ed a.ttl,.wcomps a.ttl')].every(a=>a.querySelector('.xo'))"));
  c.check('no page errors (folds2)', !o.errs.length, o.errs);
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 1440, h: 700, url: '?thread=checks&step=2.5' }); pg = o.pg;
  c.check('a fractional step in a link is read as a whole stop', (await ev(pg, 'return __map.S.step')) === 2 && (await ev<string>(pg, "return document.getElementById('panel').innerText")).toLowerCase().includes('stop 2 of 5'));
  await ev(pg, "history.pushState(null,'',location.pathname+'?thread=checks&step=3&node=crew');dispatchEvent(new PopStateEvent('popstate'))"); await pg.waitForTimeout(80);
  c.check('Back/Forward restores a thread and its selected stop together, without rewriting the URL', await ev(pg, "return __map.S.thread==='checks'&&__map.S.step===3&&__map.S.node==='crew'") && pg.url().includes('node=crew'), pg.url());
  await ev(pg, '__map.set({off:{article:true,bit:true}})'); await ev(pg, "document.getElementById('learn').scrollIntoView()"); await pg.waitForTimeout(60);
  c.check("a filter with no matching piece shows Learn's empty state", await ev(pg, "var e=document.getElementById('learnEmpty');return !e.hidden&&e.getClientRects().length>0&&document.getElementById('ed').hidden"));
  await pg.click('#resetF3'); await pg.waitForTimeout(120);
  c.check('its Clear filters keeps the reader in Learn (focus on Show all, no jump to the map)', (await ev(pg, 'return document.activeElement.id')) === 'showAll' && Math.abs((await ev(pg, "return document.getElementById('learn').getBoundingClientRect().top")) - 56) <= 2);
  await ev(pg, '__map.set({off:{},learn:false})'); await pg.waitForTimeout(40);
  c.check("the door filter is the map's: Learn stays full under the Work-only door", (await ev(pg, "return [...document.querySelectorAll('#ed [data-node]')].filter(c=>!c.hidden).length")) === 11);
  c.check('no page errors (folds2, deep links)', !o.errs.length, o.errs);
  await o.ctx.close();
  o = await open(browser, baseURL!, { w: 390, h: 844 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await pg.focus('.tcard[data-thread="checks"]'); await ev(pg, "__map.choose('start')");
  await pg.setViewportSize({ width: 1440, height: 700 });
  await pg.waitForFunction(() => { const a = document.activeElement as HTMLElement | null; return !!a && a !== document.body && a.offsetParent !== null; }, null, { timeout: 2000 }).catch(() => {});
  const fo = await ev(pg, "var a=document.activeElement;return a&&a!==document.body&&a.offsetParent!==null&&getComputedStyle(a).visibility!=='hidden'?(a.id||a.className):null");
  c.check('crossing the phone breakpoint keeps keyboard focus on a visible control', !!fo, fo);
  await o.ctx.close();
  c.done('folds2');
});

test("final: the final cross-model review's folds", async ({ browser, baseURL }) => {
  test.setTimeout(240_000);
  const c = new Checks();
  const B = baseURL!;
  let o = await open(browser, B, { w: 1440, h: 700 }); let pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await ev(pg, "__map.choose(null);__map.select('code-is-cheap')"); await pg.waitForTimeout(200);
  const n0 = await ev(pg, "return document.querySelectorAll('#panel .more .nb').length");
  const has = await ev(pg, "return !!document.getElementById('allCons')");
  await pg.click('#allCons'); await pg.waitForTimeout(200);
  const n1: any = await ev(pg, "return [document.querySelectorAll('#panel .more .nb').length, document.activeElement.classList.contains('nb'), !document.getElementById('allCons')]");
  c.check("C4-1: on a desktop, 'and N more' is a button that shows every neighbour and moves focus to the first new one", has && n1[0] > n0 && n1[1] && n1[2], [n0, n1]);
  c.check('pi C3-1: the details panel is not a live region; one short status line is', await ev(pg, "var p=document.getElementById('panel'),s=document.getElementById('mapStatus');return !p.hasAttribute('aria-live')&&!!s&&s.getAttribute('aria-live')==='polite'"));
  await pg.waitForTimeout(800);
  c.check('pi C3-1: the status line names the chosen piece', (await ev(pg, "return document.getElementById('mapStatus').textContent")) === (await ev(pg, "return __map.G.nodes.filter(n=>n.id==='code-is-cheap')[0].title")));
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700, reduced: false, url: '?theme=light' }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(600);
  await ev(pg, "__map.choose('checks',2)"); await pg.waitForTimeout(300);
  const op = await ev(pg, "var d=document.querySelector('.st.dimmed .dot');return d?parseFloat(getComputedStyle(d).opacity):null");
  c.check('C2-3: in light mode a dimmed mark keeps 3:1 (opacity .55 or more; .38 gave 2.4:1)', op !== null && op >= 0.55, op);
  await pg.waitForTimeout(5600);
  const mo: any = await ev(pg, "return [document.getElementById('gwrap').classList.contains('still'), getComputedStyle(document.querySelector('.ambient')).animationPlayState, document.getElementById('pulse').classList.contains('on'), (function(){var b=document.querySelector('svg.braid');return b&&b.animationsPaused?b.animationsPaused():null;})()]");
  c.check('pi C3-2: motion that starts by itself stops within 5 s: the ambient flow and twinkle pause, the route pulse ends, the hero braid rests', mo[0] && mo[1] === 'paused' && !mo[2] && mo[3] === true, mo);
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700, reduced: false }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(400);
  const started = await ev(pg, 'return __map.tour()');
  await pg.waitForTimeout(300);
  const sb = await ev(pg, "return !!document.getElementById('stopTour')");
  if (started && sb) { await pg.focus('#stopTour'); await pg.keyboard.press('Enter'); await pg.waitForTimeout(200); }
  c.check('pi C3-2: the idle tour shows a Stop button that stops it', started && sb && !(await ev(pg, 'return __map.touring()')), [started, sb]);
  c.check('pi r5 C3-2: after Stop the tour, focus is on a visible question button', await ev(pg, "var a=document.activeElement;return !!a&&a.classList.contains('q')&&a.offsetParent!==null"));
  await o.ctx.close();
  o = await open(browser, B, { w: 390, h: 844 }); pg = o.pg;
  await pg.click('#menuBtn'); await pg.waitForTimeout(150);
  const fm = await ev(pg, "return [document.getElementById('nav').classList.contains('open'), document.activeElement.closest('#nav')!==null]");
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(100);
  const kept = await ev(pg, 'return location.search');
  c.check('C3-2/pi C3-4: opening the menu moves focus into it; Escape closes it and leaves the map alone', same(fm, [true, true]) && !(await ev(pg, "return document.getElementById('nav').classList.contains('open')")), [fm, kept]);
  await o.ctx.close();
  // the header hides its icon links without script; the lab and bits stay reachable on the page (the Work header's lab
  // links) and in the family footer (its Media column)
  o = await open(browser, B, { w: 390, h: 844, js: false }); pg = o.pg;
  const fl: string[] = await ev(pg, "return [...document.querySelectorAll('main a, footer a')].filter(a=>a.offsetParent).map(a=>a.getAttribute('href'))");
  c.check('C1-2: without script the lab and bits are still linked (the Work frame and the footer)', fl.includes('https://wickedlabs.ai/') && fl.some((h) => (h || '').startsWith('https://bits.wickedagile.com')), fl);
  await o.ctx.close();
  let small: string[] = [];
  for (const [w, h] of [[1440, 700], [390, 844]]) {
    o = await open(browser, B, { w, h }); pg = o.pg;
    for (const tgt of ['#home', '#graph', '#learn', '#work', 'footer.footer']) {
      await ev(pg, `document.querySelector('${tgt}').scrollIntoView()`); await pg.waitForTimeout(250);
      small = small.concat(await ev(pg, String.raw`var o=[];document.querySelectorAll('body *').forEach(function(el){if(!el.getClientRects().length||el.closest('svg,.sr,.skip'))return;var cs=getComputedStyle(el);if(cs.visibility==='hidden')return;var own=[...el.childNodes].some(n=>n.nodeType===3&&n.nodeValue.trim());if(own&&parseFloat(cs.fontSize)<12)o.push(el.tagName+'.'+el.className+':'+cs.fontSize);['::before','::after'].forEach(function(ps){var q=getComputedStyle(el,ps);if(q.content&&q.content!=='none'&&q.content!=='normal'&&q.content!=='""'&&parseFloat(q.fontSize)<12)o.push(el.tagName+ps+':'+q.fontSize);});});return o.slice(0,8);`));
    }
    await o.ctx.close();
  }
  c.check('C2-1: no visible text under 12 px anywhere on the company site (every frame and the footer, pseudo-elements; 1440 and 390)', !small.length, [...new Set(small)].sort().slice(0, 8));
  // round 2
  o = await open(browser, B, { w: 390, h: 844 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  const bx: any = await ev(pg, "var b=document.querySelector('.st[data-id=\"platform\"] .badgex');if(!b)return null;var r=b.getBoundingClientRect(),g=document.getElementById('gwrap').getBoundingClientRect();return [getComputedStyle(b).display, b.textContent, r.right<=g.right+1&&r.bottom<=g.bottom+1&&r.width>0]");
  c.check("r2 C1-2: the phone map shows the Platform's Experiment badge, inside the map", bx !== null && bx[0] !== 'none' && bx[1] === 'Experiment' && bx[2], bx);
  await o.ctx.close();
  for (const [th, wantOp] of [['dark', 0.6], ['light', 0.75]] as [string, number][]) {
    o = await open(browser, B, { w: 1440, h: 700, reduced: false, url: '?theme=' + th }); pg = o.pg;
    await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(500);
    await ev(pg, "__map.choose('checks',2)"); await pg.waitForTimeout(300);
    const op2 = await ev(pg, "var d=document.querySelector('.st[data-id=\"platform\"].dimmed .dot');return d?parseFloat(getComputedStyle(d).opacity):null");
    c.check(`r2 C2-1: the dimmed Platform ring keeps 3:1 in ${th} mode (opacity ${wantOp} or more)`, op2 !== null && op2 >= wantOp, op2);
    await o.ctx.close();
  }
  o = await open(browser, B, { w: 1440, h: 700, reduced: false }); pg = o.pg;
  await pg.waitForTimeout(5600); await ev(pg, "document.dispatchEvent(new Event('visibilitychange'))"); await pg.waitForTimeout(200);
  c.check('r2 C3-1: after its 5 s the hero braid stays at rest when the tab comes back', await ev(pg, "var b=document.querySelector('svg.braid');return b.animationsPaused()"));
  await o.ctx.close();
  const CLIP = String.raw`return [...document.querySelectorAll('.snap')].map(function(s){var fr=s.getBoundingClientRect(),t=1e9,b=-1e9;s.querySelectorAll(':scope > *, :scope > .wrap > *').forEach(function(c){if(c.classList.contains('wrap')||c.classList.contains('art')||c.getAttribute('aria-hidden')==='true'||!c.getClientRects().length)return;var cs=getComputedStyle(c);if(cs.position==='absolute'||cs.position==='fixed')return;var r=c.getBoundingClientRect();t=Math.min(t,r.top);b=Math.max(b,r.bottom);});return [s.id, s.classList.contains('grow'), Math.round(t-fr.top), Math.round(fr.bottom-b)];})`;
  for (const [w, h] of [[1440, 700], [1280, 660], [390, 844]]) {
    o = await open(browser, B, { w, h }); pg = o.pg; await pg.waitForTimeout(200);
    const gr: any[] = await ev(pg, CLIP);
    c.check(`pi r2 C3-2: at ${w}x${h} (a frame-rule size) no frame needs to grow and snapping stays on`, !gr.some((g) => g[1]) && !(await ev(pg, "return document.documentElement.classList.contains('loose')")), gr);
    await o.ctx.close();
  }
  for (const [w, h] of [[1280, 600], [640, 330]]) {
    o = await open(browser, B, { w, h }); pg = o.pg; await pg.waitForTimeout(300);
    const gr: any[] = await ev(pg, CLIP);
    c.check(`pi r2 C3-2: at ${w}x${h} (a short window, or 200% zoom) no frame cuts its content off`, gr.every((g) => g[2] >= -1 && g[3] >= -1), gr);
    await o.ctx.close();
  }
  // review r1: on a tablet the Learn cards are taller than the frame; the frame grows rather than cutting them off
  for (const [w, h] of [[820, 1180], [1024, 768]]) {
    o = await open(browser, B, { w, h }); pg = o.pg; await pg.waitForTimeout(400);
    const cut = await ev(pg, "return [...document.querySelectorAll('.snap')].filter(s=>s.scrollHeight>s.clientHeight+1).map(s=>s.id+' '+(s.scrollHeight-s.clientHeight))");
    c.check(`review r1: at ${w}x${h} (a tablet) no frame cuts its content off`, !cut.length, cut);
    await o.ctx.close();
  }
  o = await open(browser, B, { w: 820, h: 1180 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await ev(pg, "__map.choose(null);__map.select('code-is-cheap')"); await pg.waitForTimeout(200);
  const vis = await ev(pg, "var b=document.getElementById('moreBtn');return !!b&&b.offsetParent!==null");
  if (vis) { await pg.click('#moreBtn'); await pg.waitForTimeout(200); }
  const sh = await ev(pg, "var p=document.getElementById('panel'),m=p.querySelector('.more');return [p.classList.contains('sheet'), !!m&&getComputedStyle(m).display!=='none']");
  c.check("pi r2 C4-2: on a tablet (820) the Details button opens the sheet with the piece's summary and shared list", vis && same(sh, [true, true]), [vis, sh]);
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await ev(pg, "__map.choose(null);__map.select('code-is-cheap')"); await pg.waitForTimeout(200);
  await ev(pg, "document.getElementById('learn').scrollIntoView();var a=document.querySelector('#learn a, #learn button');a.focus()"); await pg.waitForTimeout(150);
  await pg.keyboard.press('Escape'); await pg.waitForTimeout(150);
  c.check("pi r2 C4-3: Escape outside the map leaves the map's selection alone", (await ev(pg, 'return __map.S.node')) === 'code-is-cheap', await ev(pg, 'return __map.S.node'));
  await o.ctx.close();
  // round 3
  o = await open(browser, B, { w: 1440, h: 700 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await ev(pg, "__map.choose(null);__map.select('studio')"); await pg.waitForTimeout(200);
  const href = await ev(pg, "var a=document.querySelector('#panel a[href]');if(!a)return null;a.focus();return a.getAttribute('href')");
  await ev(pg, '__map.set({})'); await pg.waitForTimeout(150);
  c.check('r3 C3-1: a focused link in the map panel keeps focus when the panel re-renders', href !== null && (await ev(pg, "var a=document.activeElement;return a&&a.tagName==='A'&&a.closest('#panel')!==null?a.getAttribute('href'):null")) === href, href);
  await o.ctx.close();
  o = await open(browser, B, { w: 640, h: 330 }); pg = o.pg;
  await pg.click('#menuBtn'); await pg.waitForTimeout(200);
  const mm: any = await ev(pg, "var n=document.getElementById('nav'),r=n.getBoundingClientRect(),a=[...n.querySelectorAll('a')];var last=a[a.length-1];last.scrollIntoView({block:'nearest'});var lr=last.getBoundingClientRect();return [Math.round(r.bottom)<=innerHeight, getComputedStyle(n).overflowY, lr.bottom<=innerHeight+1&&lr.top>=r.top-1]");
  c.check('r3 C3-2: on a short window the open menu fits it and scrolls, so its last link can be reached', mm[0] && ['auto', 'scroll'].includes(mm[1]) && mm[2], mm);
  await o.ctx.close();
  o = await open(browser, B, { w: 390, h: 844 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await ev(pg, "__map.choose(null);__map.select('code-is-cheap')"); await pg.waitForTimeout(200);
  await pg.click('#moreBtn'); await pg.waitForTimeout(200);
  const dup = await ev(pg, "var s=document.querySelector('#panel .more.shr');return [document.getElementById('panel').classList.contains('sheet'), s?getComputedStyle(s).display:null]");
  c.check('r3 C4-1: the Details sheet lists the neighbours once (the full list)', same(dup, [true, 'none']), dup);
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700, url: '?off=bit' }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await ev(pg, "window.__lnm=0;new MutationObserver(function(){window.__lnm++;}).observe(document.getElementById('learnNote'),{childList:true,subtree:true,characterData:true})");
  for (const i of await ev<string[]>(pg, "return [...document.querySelectorAll('#stations .st')].filter(s=>s.tabIndex===0).slice(0,6).map(s=>s.dataset.id)")) { await pg.hover(`.st[data-id="${i}"] .dot`); await pg.waitForTimeout(40); }
  c.check("pi r3 C3-1: hovering across the map doesn't rewrite the Learn note (a live region)", (await ev(pg, 'return window.__lnm')) === 0, await ev(pg, 'return window.__lnm'));
  const names = await ev(pg, "return [...document.querySelectorAll('#stations .st')].map(s=>s.getAttribute('aria-label')||'').filter(t=>/[.?!][.] /.test(t)||/[.?!]\\. /.test(t))");
  c.check("pi r3 C3-5: no doubled punctuation in the marks' names", !names.length, names.slice(0, 3));
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView()"); await pg.waitForTimeout(300);
  await pg.click('.q[data-thread="checks"]'); await pg.waitForTimeout(300);
  const other = await ev(pg, "var t=__map.G.threads.filter(x=>x.id==='checks')[0].stops;return [...document.querySelectorAll('#stations .st')].map(s=>s.dataset.id).filter(id=>t.indexOf(id)<0&&__map.G.nodes.some(n=>n.id===id))[0]");
  await ev(pg, `__map.select('${other}')`); await pg.waitForTimeout(200);
  const qs = await ev(pg, "return [[...document.querySelectorAll('.q[aria-pressed=\"true\"]')].length, document.getElementById('qClear').hidden]");
  c.check('pi r4 C4-1: choosing a piece outside the framed thread releases its question and hides Clear', same(qs, [0, true]), [other, qs]);
  await ev(pg, '__map.choose(null);__map.select(null)'); await pg.waitForTimeout(200);
  const lg: string | null = await ev(pg, "var l=document.querySelector('#panel .legend');return l?l.textContent:null");
  c.check("pi r3 C5-5: the legend calls the Platform's mark Experiment, not Placeholder", lg !== null && lg.includes('Experiment') && !lg.includes('Placeholder'), lg);
  await ev(pg, "__map.select('studio')"); await pg.waitForTimeout(150);
  const onA = await ev(pg, "return [document.querySelector('.st[data-id=\"studio\"]').getAttribute('aria-pressed'), document.querySelector('.st[data-id=\"crew\"]').getAttribute('aria-pressed'), document.querySelector('.st[data-id=\"studio\"]').getAttribute('aria-controls')]");
  await pg.waitForTimeout(800);
  const said1 = await ev(pg, "return document.getElementById('mapStatus').textContent");
  await ev(pg, '__map.select(null)'); await pg.waitForTimeout(900);
  const offA = await ev(pg, "return [document.querySelector('.st[data-id=\"studio\"]').getAttribute('aria-pressed'), document.getElementById('mapStatus').textContent]");
  c.check('r5 C3-2: a mark says it is the selected piece (aria-pressed, controls the panel), and clearing it is announced', same(onA, ['true', 'false', 'panel']) && said1 === 'wicked-studio' && same(offA, ['false', 'Nothing selected on the map.']), [onA, said1, offA]);
  await ev(pg, "__map.choose('checks',2)"); await pg.waitForTimeout(200);
  await pg.focus('#tNext'); await pg.keyboard.press('ArrowRight'); await pg.waitForTimeout(150);
  c.check("r5 C3-3: with focus in a thread's panel, the right arrow steps the thread", (await ev(pg, 'return __map.S.step')) === 3, await ev(pg, 'return __map.S.step'));
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700, js: false }); pg = o.pg;
  c.check("r5 C3-1: without script the hero braid's travelling dots are hidden (nothing would stop them)", await ev(pg, "return [...document.querySelectorAll('.braid .dotm')].every(d=>getComputedStyle(d).display==='none')"));
  await o.ctx.close();
  // the page's own links and the header's; the family footer is wicked-web's, shared with every family site
  const NT = "return [...document.querySelectorAll('main a, header a')].filter(a=>a.textContent.indexOf('↗')>=0&&!(a.target==='_blank'&&/noopener/.test(a.rel||''))).map(a=>a.textContent.trim().slice(0,30)+' '+a.getAttribute('href'))";
  let bad: string[] = [];
  for (const [js, sel] of [[true, null], [true, 'studio'], [true, 'the-work'], [false, null]] as [boolean, string | null][]) {
    o = await open(browser, B, { w: 1440, h: 700, js }); pg = o.pg;
    if (sel) { await ev(pg, `document.getElementById('graph').scrollIntoView();__map.select('${sel}')`); await pg.waitForTimeout(200); }
    bad = bad.concat(await ev(pg, NT)); await o.ctx.close();
  }
  c.check('r6 C1-1: every company-site link that shows ↗ opens a new tab (page, map panel, header, no-JS)', !bad.length, bad.slice(0, 5));
  o = await open(browser, B, { w: 1440, h: 700 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView();__map.select('studio')"); await pg.waitForTimeout(200);
  const nn = await ev(pg, "return [...document.querySelectorAll('main a[target=_blank], header a[target=_blank]')].filter(a=>!/new tab/.test((a.getAttribute('aria-label')||'')+a.textContent)).map(a=>a.textContent.trim().slice(0,30))");
  c.check('pi r8 C3-2: every company-site link that opens a new tab says so to screen readers', !nn.length, nn.slice(0, 5));
  await ev(pg, "__map.select(null);__map.choose('checks',2)"); await pg.waitForTimeout(200);
  await pg.focus('#tNext'); await pg.keyboard.press('Escape'); await pg.waitForTimeout(200);
  c.check('pi r8 C3-1: Escape that clears a thread puts focus on its question', await ev(pg, "var a=document.activeElement;return a.classList.contains('q')&&a.getAttribute('data-thread')==='checks'"), await ev(pg, 'return document.activeElement.className'));
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700, url: '?ref=feed&thread=checks&step=5' }); pg = o.pg;
  await pg.waitForTimeout(300);
  const legs: string[] = await ev(pg, "return [...document.querySelectorAll('#panel ol.stops li')].map(l=>l.textContent)");
  await ev(pg, '__map.drafts(true)'); await pg.waitForTimeout(100);
  const legsD: string[] = await ev(pg, "return [...document.querySelectorAll('#panel ol.stops li')].map(l=>l.textContent)");
  await ev(pg, '__map.drafts(false)');
  await ev(pg, "__map.choose('green',2)"); await pg.waitForTimeout(300);
  c.check("pi r9 C4-1: the map's URL sync keeps a parameter it doesn't own (?ref=)", (await ev<string>(pg, 'return location.search')).includes('ref=feed'), await ev(pg, 'return location.search'));
  await pg.focus('#qClear'); await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(700);
  const fq: any = await ev(pg, "var a=document.activeElement;return [a.className, a.getAttribute('data-thread'), a.offsetParent!==null]");
  c.check("r10 C3-1: the desktop Clear, focused when the layout turns phone, hands focus to the thread's card", fq[2] && (fq[0] || '').includes('tcard') && fq[1] === 'green', fq);
  await pg.setViewportSize({ width: 820, height: 1180 }); await pg.waitForTimeout(800); await pg.focus('#menuBtn'); await pg.waitForTimeout(100); await pg.setViewportSize({ width: 1440, height: 700 });
  await pg.waitForFunction(() => document.activeElement && document.activeElement.id === 'themeBtn', null, { timeout: 2000 }).catch(() => {});
  c.check('r10 C3-1: a focused Menu button that the wider layout hides hands focus to the theme switch', (await ev(pg, 'return document.activeElement.id')) === 'themeBtn', await ev(pg, 'return document.activeElement.id'));
  await o.ctx.close();
  const res: Record<string, unknown> = {};
  o = await open(browser, B, { w: 1440, h: 700 }); pg = o.pg;
  await pg.focus('#nav a.family-ic'); await pg.setViewportSize({ width: 820, height: 1180 }); await pg.waitForTimeout(700);
  res['nav link'] = await ev(pg, 'return document.activeElement.id');
  await ev(pg, "document.getElementById('work').scrollIntoView()"); await pg.waitForTimeout(300); await pg.setViewportSize({ width: 1440, height: 700 }); await pg.waitForTimeout(600);
  await ev(pg, "var b=[...document.querySelectorAll('#work [data-show=\"studio\"]')].filter(x=>x.offsetParent)[0];b.focus()"); await pg.setViewportSize({ width: 390, height: 844 }); await pg.waitForTimeout(700);
  res['studio twin'] = await ev(pg, "var a=document.activeElement;return [a.getAttribute('data-show'), a.offsetParent!==null]");
  await o.ctx.close();
  c.check("pi r11 C3-1: hidden-by-layout controls hand focus on (a header link to Menu, studio's map button to its twin)", res['nav link'] === 'menuBtn' && same(res['studio twin'], ['studio', true]), res);
  o = await open(browser, B, { w: 390, h: 844, url: '?thread=state&step=2' }); pg = o.pg;
  await pg.waitForTimeout(400); await pg.click('#pClear'); await pg.waitForTimeout(300);
  c.check("pi r11 C3-2: the phone strip's Clear returns focus to the cleared thread's card", (await ev(pg, "return document.activeElement.getAttribute('data-thread')")) === 'state', await ev(pg, 'return document.activeElement.className'));
  c.check("pi r9 C1-4: a thread card's Work stops say what backs them (in the lab, or Related; with its draft mark when the marks are on)", legs.some((l) => l.includes('(in the lab)')) && legs.some((l) => l.includes('(Related)')) && !legs.some((l) => /draft/i.test(l)) && legsD.some((l) => l.includes('(Related, draft)')), [legs, legsD]);
  await o.ctx.close();
  o = await open(browser, B, { w: 820, h: 1180 }); pg = o.pg;
  await ev(pg, "document.getElementById('graph').scrollIntoView();__map.choose(null);__map.select('code-is-cheap')"); await pg.waitForTimeout(250);
  await pg.click('#moreBtn'); await pg.waitForTimeout(200); await pg.focus('#moreBtn');
  await pg.setViewportSize({ width: 1440, height: 700 }); await pg.waitForTimeout(600);
  const fv: any = await ev(pg, "var a=document.activeElement;return [a.className||a.id, a.offsetParent!==null&&a!==document.body, document.getElementById('panel').classList.contains('sheet')]");
  c.check('r7 C3-1: widening past the tablet range closes the Details sheet and keeps focus on a visible control', fv[1] && !fv[2], fv);
  await o.ctx.close();
  o = await open(browser, B, { w: 1440, h: 700 }); pg = o.pg;
  await ev(pg, "document.getElementById('learn').scrollIntoView();document.getElementById('showAll').click()"); await pg.waitForTimeout(300);
  c.check('r7 C1-2: in Show all the featured card keeps its ↗', await ev(pg, "var x=document.querySelector('#ed .edfeat .xo');return !!x&&getComputedStyle(x).display!=='none'"));
  c.check('no page errors (final)', !o.errs.length, o.errs);
  await o.ctx.close();
  c.done('final');
});

test('security: strings in the map script land as text, not markup (review r1)', async ({ browser, baseURL }) => {
  const c = new Checks();
  const { ctx, pg } = await open(browser, baseURL!, { w: 1440, h: 700 });
  await ev(pg, "var n=__map.G.nodes.find(x=>x.id==='code-is-cheap');n.url='https://medium.com/x\"><b id=pwn1>x</b>';n.title='<b id=pwn2>t</b>';n.date='2026\"><b id=pwn3>-09-21';n.mins='<b id=pwn4>9</b>';document.getElementById('graph').scrollIntoView();__map.select('code-is-cheap')");
  await pg.waitForTimeout(200);
  c.check("the map panel escapes a piece's link, title, date and read time", await ev(pg, "return !document.querySelector('#pwn1,#pwn2,#pwn3,#pwn4')&&document.getElementById('panel').textContent.indexOf('<b id=pwn2>')>=0"));
  await ctx.close();
  c.done('security');
});
