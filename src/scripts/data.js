/* ──────────────────────────────────────────────────────────────
   wickedagile — shared client data module
   Helpers, the baked articles promise, the GitHub repos fetch, and the
   FEATURED list. Consumed by the hero terminal (terminal.js) and the
   shipped split-editor (shipped.js).
   ────────────────────────────────────────────────────────────── */
'use strict';

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
/* The 3 featured sites for the shipped mosaic. Screenshots resolve
   from the public/ root → '/screenshots/<name>.png'. */
/* Order = the "accelerators" folder order (the 3 deployed sites). */
export var FEATURED=[
  {name:'wicked-interactive',url:'https://wi.wickedagile.com',screenshot:'/screenshots/wicked-interactive.png',
   desc:'Say the thing. Watch it build. Point at what\'s wrong. Ship.'},
  {name:'wicked-garden',url:'https://wg.wickedagile.com',screenshot:'/screenshots/wicked-garden.png',
   desc:'Orchestration without the org chart.'},
  {name:'wicked-estate',url:'https://we.wickedagile.com',screenshot:'/screenshots/wicked-estate.png',
   desc:'The code graph agents actually trust.'}
];
