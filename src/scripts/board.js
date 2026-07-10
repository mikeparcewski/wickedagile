/* ──────────────────────────────────────────────────────────────
   wickedagile — THE STACK driver (three-strata operability machine).

   Three responsibilities:
   1. CLIMB the current up the stack — an ambient self-test that energizes
      each stratum bottom→top (Building Blocks → Utilities → Solutions),
      lighting its product tiles and curing the four Agent Vitals red→green,
      finishing OPERABLE. Holds, then relapses and loops. No visitor input
      drives it (paused while a modal is open or the tab is hidden). Under
      prefers-reduced-motion it settles OPERABLE and never cycles.
   2. Open a per-product MODAL when a product tile is clicked. Esc, the scrim,
      and the ✕ all close it; focus returns to the tile.
   3. Wire the INSTALL copy button (clipboard, with a graceful fallback).
   ────────────────────────────────────────────────────────────── */
'use strict';

function boot() {
  var panel = document.getElementById('opBoard');

  /* ── INSTALL COPY (works even if the stack panel is absent) ─────── */
  (function () {
    var btn = document.querySelector('.install-copy');
    if (!btn) return;
    btn.addEventListener('click', function () {
      var text = btn.getAttribute('data-copy') || '';
      function ok() {
        var prev = btn.textContent;
        btn.textContent = 'copied';
        btn.classList.add('is-copied');
        window.setTimeout(function () {
          btn.textContent = prev;
          btn.classList.remove('is-copied');
        }, 1400);
      }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(ok, fallback);
      } else {
        fallback();
      }
      function fallback() {
        try {
          var ta = document.createElement('textarea');
          ta.value = text; ta.setAttribute('readonly', '');
          ta.style.position = 'absolute'; ta.style.left = '-9999px';
          document.body.appendChild(ta); ta.select();
          document.execCommand('copy');
          document.body.removeChild(ta);
          ok();
        } catch (e) { /* copy unavailable — no-op */ }
      }
    });
  })();

  if (!panel) return; /* stack markup absent — nothing else to drive */

  var opWord = document.getElementById('opWord');
  var opLog = document.getElementById('opLog');

  /* which stratum energizes which tiles + cures which vitals, bottom→top */
  var SEQUENCE = ['blocks', 'utilities', 'solutions'];
  var TILES = { blocks: ['estate', 'brain', 'bus'], utilities: ['garden', 'testing'], solutions: ['crew', 'interactive'] };
  var VITALS = { blocks: ['sees', 'remembers', 'coordinates'], utilities: ['judges'], solutions: [] };
  var LOG = {
    reset: 'raw agent — blind, amnesiac, self-grading, alone',
    blocks: '+ BUILDING BLOCKS — sees · remembers · coordinates',
    utilities: '+ UTILITIES — judges (the reviewer runs blind)',
    solutions: '+ SOLUTIONS — build it and drive it',
    op: 'OPERABLE — every vital green',
  };

  function stratumEl(id) { return panel.querySelector('.stratum[data-stratum="' + id + '"]'); }
  function tileEl(key) { return panel.querySelector('.tile[data-key="' + key + '"]'); }
  /* Vitals live in the LEFT rail (.stack-intro), NOT inside #opBoard — query
     the document so the climb actually cures them red→green. */
  function vitalEl(id) { return document.querySelector('.vital[data-vital="' + id + '"]'); }

  function energize(id, live) {
    var s = stratumEl(id);
    if (s) s.classList.toggle('is-live', live);
    (TILES[id] || []).forEach(function (k) {
      var t = tileEl(k); if (t) t.classList.toggle('is-on', live);
    });
    (VITALS[id] || []).forEach(function (vid) {
      var v = vitalEl(vid); if (v) v.setAttribute('data-state', live ? 'ok' : 'fail');
    });
  }

  function reset() {
    SEQUENCE.forEach(function (id) { energize(id, false); });
    panel.setAttribute('data-operable', 'false');
    if (opWord) opWord.textContent = 'STANDBY';
    if (opLog) opLog.textContent = LOG.reset;
  }

  function settleOperable() {
    SEQUENCE.forEach(function (id) { energize(id, true); });
    panel.setAttribute('data-operable', 'true');
    if (opWord) opWord.textContent = 'OPERABLE';
    if (opLog) opLog.textContent = LOG.op;
  }

  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ── CLIMB LOOP ──────────────────────────────────────────────── */
  /* step 0: reset · 1: blocks · 2: utilities · 3: solutions+operable ·
     4–5: hold · then loop. */
  var step = 0;
  var timer = null;
  var paused = false;

  function tick() {
    switch (step) {
      case 0: reset(); break;
      case 1:
        energize('blocks', true);
        if (opWord) opWord.textContent = 'PARTIAL';
        if (opLog) opLog.textContent = LOG.blocks;
        break;
      case 2:
        energize('utilities', true);
        if (opLog) opLog.textContent = LOG.utilities;
        break;
      case 3:
        settleOperable();
        break;
      /* 4,5 hold operable */
    }
    step = (step + 1) % 6;
  }

  function start() {
    if (reduced || timer || paused) return;
    timer = window.setInterval(tick, 1500);
  }
  function stop() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  if (reduced) {
    settleOperable();
  } else {
    reset();
    step = 1;
    start();
  }

  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  /* ── MODALS ──────────────────────────────────────────────────── */
  var overlay = document.getElementById('modalOverlay');
  var cards = overlay ? Array.prototype.slice.call(overlay.querySelectorAll('.modal-card')) : [];
  var tiles = Array.prototype.slice.call(panel.querySelectorAll('.tile[data-key]'));
  var lastTrigger = null;

  function openModal(key, trigger) {
    if (!overlay) return;
    lastTrigger = trigger || null;
    paused = true; stop(); /* freeze the climb while reading */
    overlay.hidden = false;
    cards.forEach(function (c) { c.hidden = c.getAttribute('data-key') !== key; });
    document.documentElement.style.overflow = 'hidden';
    var active = overlay.querySelector('.modal-card[data-key="' + key + '"]');
    var closeBtn = active && active.querySelector('.modal-x');
    if (closeBtn) closeBtn.focus();
  }

  function closeModal() {
    if (!overlay || overlay.hidden) return;
    overlay.hidden = true;
    cards.forEach(function (c) { c.hidden = true; });
    document.documentElement.style.overflow = '';
    paused = false; start(); /* resume the climb */
    if (lastTrigger && typeof lastTrigger.focus === 'function') lastTrigger.focus();
    lastTrigger = null;
  }

  tiles.forEach(function (t) {
    t.addEventListener('click', function () {
      openModal(t.getAttribute('data-key'), t);
    });
  });

  if (overlay) {
    overlay.addEventListener('click', function (e) {
      var el = e.target;
      if (el && el.hasAttribute && el.hasAttribute('data-close')) closeModal();
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && !overlay.hidden) closeModal();
    });
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
