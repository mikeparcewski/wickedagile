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
/* The DEPLOYED sites shown in the loop's center preview (browser-frame mode).
   Screenshots resolve from the public/ root → '/screenshots/<name>.png'.
   Consumed by shipped.js via each station's data-preview index. Five live
   sites now: interactive · garden · estate · testing · crew. Each carries its
   OWN real screenshot + a specific tagline so no preview reads as a template. */
export var FEATURED=[
  {name:'wicked-interactive',url:'https://wi.wickedagile.com',screenshot:'/screenshots/wicked-interactive.png',
   desc:'A sample application on the same substrate — describe it, watch it build, ship HTML/PDF/deck. It composes the family\'s blocks; it does not close the loop.'},
  {name:'wicked-garden',url:'https://wg.wickedagile.com',screenshot:'/screenshots/wicked-garden.png',
   desc:'Steering before execution — reads each prompt\'s work-shape + risk and applies the right rigor, plus the capabilities a planner-executor can\'t do alone.'},
  {name:'wicked-estate',url:'https://we.wickedagile.com',screenshot:'/screenshots/wicked-estate.png',
   desc:'Your live technical environment, queryable — requirements↔implementation, blast-radius, infra + policy relationships, operational history.'},
  {name:'wicked-testing',url:'https://wt.wickedagile.com',screenshot:'/screenshots/wicked-testing.png',
   desc:'No agent grades its own homework — an enforced wall between the agent that runs the tests and the one that judges them.'},
  {name:'wicked-crew',url:'https://wc.wickedagile.com',screenshot:'/screenshots/wicked-crew.png',
   desc:'The control room for governed agent delivery — drive, gate, and audit; the human stays in command. The harness for your agent harnesses.'},
];
