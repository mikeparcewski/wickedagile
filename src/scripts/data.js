/* ──────────────────────────────────────────────────────────────
   wickedagile — shared client data module
   Helpers, the baked articles promise, the GitHub repos fetch, and the
   FEATURED list. Consumed by the hero terminal (terminal.js) and the
   shipped split-editor (shipped.js).
   ────────────────────────────────────────────────────────────── */
'use strict';
import { product } from 'wicked-web/data/family.js';

/* ── HELPERS ──────────────────────────────────────────────────── */
export function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')}
export function safeUrl(u){try{var p=new URL(String(u));return(p.protocol==='https:'||p.protocol==='http:')?p.href:'#'}catch(_){return'#'}}
export function delay(ms){return new Promise(function(r){setTimeout(r,ms)})}
export function randInt(a,b){return a+Math.floor(Math.random()*(b-a+1))}
export function randFrom(arr){return arr[randInt(0,arr.length-1)]}
export function fmtDate(pd){var d=new Date(pd||'');if(isNaN(d.getTime()))return'';return d.toLocaleString('en',{month:'short'})+' '+d.getFullYear()}

/* ── ARTICLES ─────────────────────────────────────────────────── */
/* Articles are fetched at BUILD TIME (Node, no browser CORS) in
   src/lib/articles.mjs and baked into the page as window.__ARTICLES__ by
   index.astro. Client-side cross-origin RSS proved unreliable (corsproxy.io is
   paywalled; rss2json 422s from a browser origin), so we never fetch the feed in
   the browser. Both the hero terminal and the articles section read this. */
export var articlesPromise=Promise.resolve(
  (typeof window!=='undefined' && Array.isArray(window.__ARTICLES__)) ? window.__ARTICLES__ : []
);
export var reposPromise=fetch('https://api.github.com/users/mikeparcewski/repos?type=public&per_page=100')
  .then(function(r){return r.ok?r.json():null})
  .then(function(d){return Array.isArray(d)?d.filter(function(r){return r.name&&r.name.startsWith('wicked-')&&!r.private}).sort(function(a,b){return(b.stargazers_count||0)-(a.stargazers_count||0)}):null})
  .catch(function(){return null});

/* ── FEATURED ─────────────────────────────────────────────────── */
/* The DEPLOYED sites shown in the platform's center preview (browser-frame
   mode, badged "Site preview": a screenshot, not a live embed). Built from the
   ONE family manifest (wicked-web/data/family.js) so names, links and copy
   match the stack, the nav and the footer. The ORDER is the preview contract:
   Shipped.astro's PRESENT map points each block's data-preview at an index
   here. Screenshots resolve from the public/ root → '/screenshots/<name>.png'.
   (wicked-interactive has no site — crew spawns and proxies it — so it never
   previews here.) */
export var FEATURED=['wicked-studio','wicked-garden','wicked-estate','wicked-crew'].map(function(name){
  var s=product(name);
  return {name:s.name,url:s.href,screenshot:s.screenshot,desc:s.desc};
});
