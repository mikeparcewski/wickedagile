/* ──────────────────────────────────────────────────────────────
   wickedagile — THE OPERABILITY BOARD driver (living-panel edition).

   Two responsibilities:
   1. AUTO-CYCLE the panel on its own — an ambient self-test that keeps
      flipping product switches, curing/relapsing the four Agent Vitals
      red↔green and filling the segmented COVERAGE meter. No visitor input
      drives it; it just runs (paused while a modal is open or the tab is
      hidden). Under prefers-reduced-motion it settles OPERABLE and stops.
   2. Open a per-product MODAL when a product tile is clicked. Esc, the
      scrim, and the ✕ all close it; focus returns to the tile.
   ────────────────────────────────────────────────────────────── */
'use strict';

function boot() {
  var panel = document.getElementById('opBoard');
  if (!panel) return; /* board markup absent — nothing to drive */

  var tiles = Array.prototype.slice.call(panel.querySelectorAll('.tile[data-key]'));
  var TOTAL = tiles.length; /* 7 real products */
  var opWord = document.getElementById('opWord');
  var opLog = document.getElementById('opLog');
  var covPct = document.getElementById('covPct');

  // which product cures which agent vital
  var VITAL = { estate: 'sees', brain: 'remembers', testing: 'judges', bus: 'coordinates' };
  var FIX = {
    estate: 'SEES — queries a typed graph',
    brain: 'REMEMBERS — persistent memory',
    testing: 'JUDGES — reviewer runs blind',
    bus: 'COORDINATES — events flow',
    garden: 'BUILD — done is re-derived',
    interactive: 'BUILD — say it, watch it build',
    crew: 'OPERATE — phases governed',
  };

  var on = Object.create(null); /* key -> bool */

  function tileFor(key) { return panel.querySelector('.tile[data-key="' + key + '"]'); }

  function setState(key, isOn) {
    on[key] = !!isOn;
    var t = tileFor(key);
    if (t) t.classList.toggle('is-on', isOn);
    var seg = panel.querySelector('.cov-seg[data-key="' + key + '"]');
    if (seg) seg.classList.toggle('is-lit', isOn);
    var vit = VITAL[key];
    if (vit) {
      var v = panel.querySelector('.vital[data-vital="' + vit + '"]');
      if (v) v.setAttribute('data-state', isOn ? 'ok' : 'fail');
    }
  }

  function count() {
    var n = 0;
    for (var i = 0; i < tiles.length; i++) {
      if (on[tiles[i].getAttribute('data-key')]) n++;
    }
    return n;
  }

  function refresh(lastKey, lastOn) {
    var n = count();
    if (covPct) covPct.textContent = Math.round((n / TOTAL) * 100) + '%';
    var operable = n === TOTAL;
    panel.setAttribute('data-operable', operable ? 'true' : 'false');
    if (opWord) opWord.textContent = operable ? 'OPERABLE' : (n === 0 ? 'STANDBY' : 'PARTIAL');
    if (opLog) {
      if (operable) opLog.textContent = 'OPERABLE — every vital green';
      else if (n === 0) opLog.textContent = 'raw agent — all systems failing';
      else if (lastKey) opLog.textContent = (lastOn ? '+ ' : '– ') + (FIX[lastKey] || lastKey);
      else opLog.textContent = n + ' of ' + TOTAL + ' online';
    }
  }

  /* ── AUTO-CYCLE ──────────────────────────────────────────────── */
  var reduced = window.matchMedia &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var timer = null;
  var paused = false;

  function tick() {
    // Evolve the combination: flip one or two random switches per beat, so
    // the panel reads as a living machine rather than a fixed pattern.
    var flips = 1 + (Math.random() < 0.4 ? 1 : 0);
    var lastKey = null, lastOn = false;
    for (var f = 0; f < flips; f++) {
      var key = tiles[(Math.random() * tiles.length) | 0].getAttribute('data-key');
      setState(key, !on[key]);
      lastKey = key; lastOn = on[key];
    }
    refresh(lastKey, lastOn);
  }

  function start() {
    if (reduced || timer || paused) return;
    timer = window.setInterval(tick, 1500);
  }
  function stop() {
    if (timer) { window.clearInterval(timer); timer = null; }
  }

  // initial paint
  if (reduced) {
    tiles.forEach(function (t) { setState(t.getAttribute('data-key'), true); });
    refresh();
  } else {
    // seed a couple on for immediate life, then run
    setState('estate', true);
    setState('bus', true);
    refresh();
    start();
  }

  // pause when the tab is hidden — polite + saves cycles
  document.addEventListener('visibilitychange', function () {
    if (document.hidden) stop(); else start();
  });

  /* ── MODALS ──────────────────────────────────────────────────── */
  var overlay = document.getElementById('modalOverlay');
  var cards = overlay ? Array.prototype.slice.call(overlay.querySelectorAll('.modal-card')) : [];
  var lastTrigger = null;

  function openModal(key, trigger) {
    if (!overlay) return;
    lastTrigger = trigger || null;
    paused = true; stop(); /* freeze the panel while reading */
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
    paused = false; start(); /* resume the panel */
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
