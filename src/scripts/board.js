/* ──────────────────────────────────────────────────────────────
   wickedagile — THE OPERABILITY BOARD driver.
   Genuine visitor-driven state: throwing a product switch (click OR
   keyboard, since every switch is a <button>) flips its LED, cures the
   matching Agent Vital red→green, and fills the segmented coverage meter.
   The UMBRELLA master switch throws all seven; RESET throws all off. Flip
   all seven and the panel stamps OPERABLE. No scroll involved, no mockup.
   ────────────────────────────────────────────────────────────── */
'use strict';

function boot() {
  var panel = document.getElementById('opBoard');
  if (!panel) return; /* board markup absent — nothing to drive */

  var toggles = Array.prototype.slice.call(
    panel.querySelectorAll('.sw-toggle[data-key]')
  );
  var TOTAL = toggles.length; /* 7 real products */
  var on = Object.create(null); /* key -> true */

  var covSegs = Array.prototype.slice.call(panel.querySelectorAll('.cov-seg'));
  var covPct = document.getElementById('covPct');
  var covBar = panel.querySelector('.cov-bar');
  var opLog = document.getElementById('opLog');
  var opWord = document.getElementById('opWord');
  var masterSw = document.getElementById('masterSw');

  function setToggle(btn, isOn) {
    var key = btn.getAttribute('data-key');
    on[key] = !!isOn;
    btn.setAttribute('aria-checked', isOn ? 'true' : 'false');
    var name = btn.getAttribute('data-name') || key;
    var fix = btn.getAttribute('data-fix') || '';
    btn.setAttribute('aria-label', name + ' — ' + fix + '. ' + (isOn ? 'On.' : 'Off.'));

    // cure/relapse the matching vital
    var vital = btn.getAttribute('data-vital');
    if (vital) {
      var v = panel.querySelector('.vital[data-vital="' + vital + '"]');
      if (v) v.setAttribute('data-state', isOn ? 'ok' : 'fail');
    }
    // its coverage segment
    var seg = panel.querySelector('.cov-seg[data-key="' + key + '"]');
    if (seg) seg.classList.toggle('is-lit', isOn);
  }

  function count() {
    var n = 0;
    for (var i = 0; i < toggles.length; i++) {
      if (on[toggles[i].getAttribute('data-key')]) n++;
    }
    return n;
  }

  function refresh(lastName, lastOn, lastFix) {
    var n = count();
    var pct = Math.round((n / TOTAL) * 100);
    if (covPct) covPct.textContent = pct + '%';
    if (covBar) covBar.setAttribute('aria-valuenow', String(n));

    var operable = n === TOTAL;
    panel.setAttribute('data-operable', operable ? 'true' : 'false');
    if (opWord) opWord.textContent = operable ? 'OPERABLE' : (n === 0 ? 'STANDBY' : 'PARTIAL');
    if (masterSw) masterSw.setAttribute('aria-checked', operable ? 'true' : 'false');

    if (opLog) {
      if (operable) {
        opLog.textContent = 'OPERABLE — every vital green';
      } else if (n === 0) {
        opLog.textContent = 'raw agent — all systems failing';
      } else if (lastName) {
        opLog.textContent =
          lastName + (lastOn ? ' ON · ' + lastFix : ' OFF · vital relapsed');
      } else {
        opLog.textContent = n + ' of ' + TOTAL + ' online';
      }
    }
  }

  function flip(btn, force) {
    var key = btn.getAttribute('data-key');
    var next = typeof force === 'boolean' ? force : !on[key];
    setToggle(btn, next);
    refresh(btn.getAttribute('data-name'), next, btn.getAttribute('data-fix'));
  }

  toggles.forEach(function (btn) {
    btn.addEventListener('click', function () { flip(btn); });
  });

  // MASTER umbrella — throw all seven on, or all off if already full
  if (masterSw) {
    masterSw.addEventListener('click', function () {
      var target = count() < TOTAL; // fill up unless already operable
      toggles.forEach(function (btn) { setToggle(btn, target); });
      refresh(); // target=true → stamps OPERABLE; target=false → STANDBY
      if (!target && opLog) opLog.textContent = 'UMBRELLA — powered down';
    });
  }

  // RESET — everything off
  var resetSw = document.getElementById('resetSw');
  if (resetSw) {
    resetSw.addEventListener('click', function () {
      toggles.forEach(function (btn) { setToggle(btn, false); });
      refresh();
      if (opLog) opLog.textContent = 'reset — raw agent, all systems failing';
    });
  }

  // initial paint (all off)
  refresh();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
