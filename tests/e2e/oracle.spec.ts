/* Port of the design lane's audit3.py: the map's layout oracle. The page's own `__audit()` checks every label, badge,
   mark (with its ring), hull, route, hover edge and the pulse against each other and the map frame, and that the map
   stays inside its section; PANEL adds the side panel's fit. Run across 1440x700, 1280x660, 1920x1080, 390x844 and
   360x740, both themes: the overview, each of the five threads framed, six chosen pieces, every mark hovered (desktop,
   in the overview and inside each thread), eight filter links, and, with motion on, the zoom, lighting and pulse
   sampled through each thread's animation. Every state must come back clean (251 states). */
import { test, expect } from '@playwright/test';
import { G, open, ev } from './lib';

const THREADS = ['start', 'green', 'checks', 'reality', 'state'];
const FILTERS = ['?off=bit', '?off=article', '?off=repository,other', '?off=article,bit', '?work=0', '?learn=0', '?learn=0&work=0', '?off=article,bit,repository,other'];
const PANEL = String.raw`const a = __audit(); const p = document.getElementById('panel'); if (!p.classList.contains('sheet') && p.scrollHeight > p.clientHeight + 1) a.push('panel overflows by ' + (p.scrollHeight - p.clientHeight) + 'px'); return a;`;
const VPS: [number, number][] = [[1440, 700], [1280, 660], [1920, 1080], [390, 844], [360, 740]];

const PIECES = ['code-is-cheap', 'all-green', 'studio', 'platform', 'how-many-releases', 'the-work'];

for (const [w, h] of VPS) {
  test(`layout oracle ${w}x${h}: every state of the map is clean`, async ({ browser, baseURL }) => {
    test.setTimeout(240_000);
    // the deploy runs this on live data: a thread or piece that went missing would leave a state unaudited, so it fails
    expect(THREADS.filter((t) => !G.threads.some((x: any) => x.id === t)), 'threads the oracle drives').toEqual([]);
    expect(PIECES.filter((id) => !G.nodes.some((n: any) => n.id === id)), 'pieces the oracle drives').toEqual([]);
    const bad: string[] = [];
    let n = 0;
    const report = (tag: string, res: unknown[]) => { n += 1; if (res.length) bad.push(`${tag}: ${JSON.stringify(res.slice(0, 6))}`); };
    for (const theme of ['dark', 'light']) {
      const o = await open(browser, baseURL!, { w, h, url: '?theme=' + theme });
      const states: [string, string][] = [['overview', '__map.choose(null)'], ...THREADS.map((t) => [t, `__map.choose('${t}')`] as [string, string]),
        ...PIECES.map((id) => [`sel:${id}`, `__map.choose(null);__map.select('${id}')`] as [string, string])];
      for (const [name, js] of states) {
        await ev(o.pg, js); await o.pg.waitForTimeout(40);
        report(`${w}x${h} ${theme} ${name}`, await ev(o.pg, PANEL));
      }
      if (w > 760) {
        for (const t of [null, ...THREADS]) {
          await ev(o.pg, `__map.choose(${t ? `'${t}'` : 'null'});`); await o.pg.waitForTimeout(30);
          const ids: string[] = await ev(o.pg, "return [...document.querySelectorAll('#stations .st')].filter(s => s.tabIndex === 0).map(s => s.dataset.id)");
          const fails: unknown[] = [];
          for (const id of ids) {
            await ev(o.pg, `__map.hover('${id}')`); await o.pg.waitForTimeout(15);
            const r: string[] = await ev(o.pg, 'return __audit()');
            if (r.length) fails.push([id, r.slice(0, 2)]);
          }
          await ev(o.pg, '__map.hover(null)');
          report(`${w}x${h} ${theme} hover every mark (${t || 'overview'})`, fails);
        }
      }
      for (const q of FILTERS) {
        await o.pg.goto(baseURL!.replace(/\/$/, '') + '/' + q + '&theme=' + theme); await o.pg.waitForTimeout(200);
        report(`${w}x${h} ${theme} filter ${q}`, await ev(o.pg, PANEL));
      }
      if (o.errs.length) report(`${w}x${h} ${theme} page errors`, o.errs);
      await o.ctx.close();
    }
    if (w > 760) {   // motion on: sample the zoom, the lighting and the travelling pulse
      const o = await open(browser, baseURL!, { w, h, reduced: false });
      await o.pg.waitForTimeout(50);
      for (const t of THREADS) {
        await ev(o.pg, `__map.chooseAnimated('${t}')`); await o.pg.waitForTimeout(60);
        const fails: unknown[] = [];
        await ev(o.pg, `__map.choose(null); __map.chooseAnimated('${t}');`);
        let t0 = 0;
        for (const ms of [80, 180, 300, 450, 650, 900, 1300, 1800, 2400]) {
          await o.pg.waitForTimeout(ms - t0); t0 = ms;
          const r: string[] = await ev(o.pg, 'return __audit()');
          if (r.length) fails.push([ms, r.slice(0, 2)]);
        }
        report(`${w}x${h} motion ${t}: zoom, lighting and pulse sampled`, fails);
      }
      if (o.errs.length) report(`${w}x${h} motion page errors`, o.errs);
      await o.ctx.close();
    }
    console.log(`${w}x${h}: ${n} states, ${bad.length} failed`);
    expect(bad).toEqual([]);
  });
}
