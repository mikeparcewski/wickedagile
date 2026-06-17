/* ──────────────────────────────────────────────────────────────
   wickedagile — ABOUT : rail + snap chapter tracker (progressive enhancement)
   Decomposed from index.next.html. The FIVE chapters are full-screen snap
   panels that are VISIBLE BY DEFAULT via CSS — this script only ENHANCES the
   left running rail: it watches which chapter is active with an
   IntersectionObserver, grows the accent progress fill, lights the active
   node (marking earlier nodes done), and swaps the active label.

   No-JS  → the rail shows its steady default state (node 01 active); content
            still fully renders.
   Reduced-motion → state still updates (fill height, active node, label) but
            transitions are disabled by CSS, so there is no animated growth.
   No IntersectionObserver → bail out gracefully, leaving the default state.
   Imports nothing from data.js.
   ────────────────────────────────────────────────────────────── */
var PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

function buildAbout(){
  var chapters = Array.prototype.slice.call(document.querySelectorAll('.chapter[data-idx]'));
  if(!chapters.length) return;

  var nodes  = Array.prototype.slice.call(document.querySelectorAll('.rail-node'));
  var fill   = document.getElementById('railFill');
  var label  = document.getElementById('railLabel');
  var labelNum  = label ? label.querySelector('.rail-label-num') : null;
  var labelName = label ? label.querySelector('.rail-label-name') : null;
  var total = chapters.length;

  /* short names for the rail label — mirrors the chapter "name" field */
  var SHORT = ['Early Years','Scale','Architecture','AI','Reckoning'];

  function pad(n){ return (n < 10 ? '0' : '') + n; }

  function setActive(idx){
    /* nodes: passed → done, current → active, upcoming → faint default */
    nodes.forEach(function(node){
      var ni = parseInt(node.getAttribute('data-idx'), 10);
      node.classList.remove('is-active','is-done');
      if(ni < idx) node.classList.add('is-done');
      else if(ni === idx) node.classList.add('is-active');
    });

    /* fill grows from the top to (and including) the active chapter.
       With N nodes spread evenly, the active node sits at idx/(N-1). */
    var pct = total > 1 ? (idx / (total - 1)) * 100 : 100;
    if(fill) fill.style.height = pct + '%';

    /* label swap (cross-fade handled by CSS when .about-tracking is set) */
    if(label && labelName && label.getAttribute('data-idx') !== String(idx)){
      label.setAttribute('data-idx', String(idx));
      if(labelNum) labelNum.textContent = pad(idx + 1);
      if(PREFERS_REDUCED){
        labelName.textContent = SHORT[idx] || '';
      }else{
        label.classList.add('is-swap');
        window.setTimeout(function(){
          labelName.textContent = SHORT[idx] || '';
          label.classList.remove('is-swap');
        }, 180);
      }
    }
  }

  /* mark the section as JS-tracking so the label cross-fade is enabled */
  var section = document.getElementById('about');
  if(section) section.classList.add('about-tracking');

  /* publish the pinned masthead's REAL height as --about-mast-h so each
     chapter can offset its snap position to lock just below the band (and
     size itself to the area beneath it). Re-measure on resize/orientation. */
  var masthead = document.querySelector('.about-masthead');
  function syncMastH(){
    if(section && masthead) section.style.setProperty('--about-mast-h', masthead.offsetHeight + 'px');
  }
  syncMastH();
  window.addEventListener('resize', syncMastH);

  /* No IntersectionObserver → leave the default steady state intact. */
  if(!('IntersectionObserver' in window)){
    setActive(0);
    return;
  }

  var current = 0;
  /* per-chapter visibility ratios; the most-visible chapter becomes active */
  var ratios = new Array(total);
  for(var i = 0; i < total; i++) ratios[i] = 0;

  var io = new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      var idx = parseInt(e.target.getAttribute('data-idx'), 10);
      if(isNaN(idx)) return;
      ratios[idx] = e.isIntersecting ? e.intersectionRatio : 0;
    });
    /* pick the chapter with the greatest visible area */
    var best = current, bestRatio = -1;
    for(var j = 0; j < total; j++){
      if(ratios[j] > bestRatio){ bestRatio = ratios[j]; best = j; }
    }
    if(bestRatio > 0 && best !== current){
      current = best;
      setActive(current);
    }
    /* hide the pinned masthead once NO chapter is in view (scrolled past the
       last chapter) — it should only show while chapter content is visible. */
    var anyVisible = false;
    for(var v = 0; v < total; v++){ if(ratios[v] > 0){ anyVisible = true; break; } }
    if(masthead) masthead.classList.toggle('mast-gone', !anyVisible);
  }, { threshold:[0, 0.25, 0.5, 0.55, 0.6, 0.75, 1] });

  chapters.forEach(function(c){ io.observe(c); });

  /* prime the default active state */
  setActive(0);
}

if(document.readyState === 'loading'){
  document.addEventListener('DOMContentLoaded', buildAbout);
}else{
  buildAbout();
}
