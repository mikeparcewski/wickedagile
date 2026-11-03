/* Shared helpers for the ports of the design lane's suites (test3, audit3, frames, chrome_test, shoot). Each port
   keeps its reference's in-page probes verbatim (String.raw), so a check here means what it meant on the frozen
   mockup; only the page (the built site, served by `astro preview`) and the test runner changed. */
import { expect, type Browser, type BrowserContext, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
/** the built graph the page renders (scripts/build-graph.mjs; the e2e build reads the committed seeds) */
export const G = JSON.parse(readFileSync(ROOT + 'src/data/graph.built.json', 'utf8'));

/** a reference suite's `check(name, cond, info)`: every check runs, the test fails at the end listing every failure */
export class Checks {
  n = 0;
  fails: string[] = [];
  check(name: string, cond: unknown, info?: unknown) {
    this.n += 1;
    if (!cond) this.fails.push(name + (info === undefined ? '' : '  ' + JSON.stringify(info).slice(0, 600)));
  }
  done(group = '') {
    console.log(`checks${group ? ' (' + group + ')' : ''}: ${this.n - this.fails.length}/${this.n} pass`);
    expect(this.fails, `${this.fails.length} of ${this.n} checks failed`).toEqual([]);
  }
}

export interface Opened { ctx: BrowserContext; pg: Page; errs: string[]; external: string[]; cons: string[] }

/** a fresh context at a viewport; every request to another origin is aborted and counted (the page makes none) */
export async function open(browser: Browser, baseURL: string, o: { w: number; h: number; reduced?: boolean; js?: boolean; url?: string; scheme?: 'dark' | 'light'; init?: string }): Promise<Opened> {
  const ctx = await browser.newContext({
    viewport: { width: o.w, height: o.h },
    reducedMotion: o.reduced === false ? 'no-preference' : 'reduce',
    javaScriptEnabled: o.js !== false,
    colorScheme: o.scheme,
  });
  const pg = await ctx.newPage();
  const errs: string[] = [], external: string[] = [], cons: string[] = [];
  const origin = new URL(baseURL).origin;
  await pg.route('**/*', (r) => {
    const u = r.request().url();
    if (/^https?:/.test(u) && new URL(u).origin !== origin) { external.push(u.slice(0, 90)); return r.abort(); }
    return r.continue();
  });
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  // console errors and warnings from the first byte on (startup included)
  pg.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') cons.push(`console.${m.type()}: ${m.text().slice(0, 160)}`); });
  if (o.init) await pg.addInitScript(o.init);   // runs before the page's own first script
  await pg.goto(baseURL.replace(/\/$/, '') + '/' + (o.url || ''));
  await pg.waitForTimeout(250);
  return { ctx, pg, errs, external, cons };
}

/** run a reference probe: the body of a function, as the reference suites' `ev(pg, js)` */
/* (the TypeScript client evaluates a string as an expression and doesn't call a function string, so the body runs
   as an IIFE; a returned promise is awaited) */
export const ev = <T = any>(pg: Page, js: string): Promise<T> => pg.evaluate(`(() => {${js}})()`) as Promise<T>;
export const wait = (pg: Page, ms: number) => pg.waitForTimeout(ms);
export const sorted = (a: string[]) => [...a].sort();
export const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
/** call a reference probe written as a function with an argument (`(arg) => {...}`), compiled in the page */
export const call = <T = any>(pg: Page, fnSrc: string, arg: unknown): Promise<T> =>
  pg.evaluate(([src, a]) => (0, eval)('(' + src + ')')(a), [fnSrc, arg] as [string, unknown]) as Promise<T>;

/** a built site in a directory, served to the browser from disk (no server): http://dist.local/<path> -> <dir>/<path> */
export async function openDist(browser: Browser, dir: string, o: { w: number; h: number }): Promise<Opened> {
  const { existsSync: exists, statSync } = await import('node:fs');
  const ctx = await browser.newContext({ viewport: { width: o.w, height: o.h }, reducedMotion: 'reduce' });
  const pg = await ctx.newPage();
  const errs: string[] = [], external: string[] = [];
  await pg.route('**/*', (r) => {
    const u = new URL(r.request().url());
    if (u.origin !== 'http://dist.local') { external.push(u.href.slice(0, 90)); return r.abort(); }
    let f = dir + decodeURIComponent(u.pathname);
    if (exists(f) && statSync(f).isDirectory()) f = f.replace(/\/?$/, '/index.html');
    return exists(f) ? r.fulfill({ path: f }) : r.fulfill({ status: 404, body: '' });
  });
  pg.on('pageerror', (e) => errs.push(String(e).slice(0, 160)));
  await pg.goto('http://dist.local/');
  await pg.waitForTimeout(250);
  return { ctx, pg, errs, external, cons: [] };
}
