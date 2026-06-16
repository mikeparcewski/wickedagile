/* ──────────────────────────────────────────────────────────────
   wickedagile — ARTICLES (yes, and...) : scroll-driven dispatch feed.
   The section is a tall track with a pinned monitor-wall stage and ONE
   snap step per article. Scrolling snaps article-by-article; an
   IntersectionObserver maps the active step → its dispatch row, and the
   LEFT priority monitor previews that article. Featured (most current) is
   row 0 and shows first. No timer — the visitor's scroll IS the walk.

   No-JS → the server-rendered featured article + full list still show.
   Reduced-motion → no smooth scroll, but scroll still drives the preview.
   No IntersectionObserver → static featured preview (graceful).
   ────────────────────────────────────────────────────────────── */
var PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

function boot(){
  var rows = Array.prototype.slice.call(document.querySelectorAll('.dispatch-row[data-idx]'));
  if(!rows.length) return;
  var steps = Array.prototype.slice.call(document.querySelectorAll('.art-step'));
  var pri    = document.getElementById('dispatchPriority');
  var bg     = document.getElementById('priorityBg');
  var title  = document.getElementById('priorityTitle');
  var meta   = document.getElementById('priorityMeta');
  var status = document.getElementById('priorityStatus');
  var ghost  = document.querySelector('.ghost-index');

  function activate(i){
    var row = rows[i]; if(!row) return;
    rows.forEach(function(r){ r.setAttribute('aria-current', r === row ? 'true' : 'false'); });
    if(pri && row.dataset.link) pri.setAttribute('href', row.dataset.link);
    if(title) title.textContent = row.dataset.title || '';
    if(meta)  meta.textContent  = row.dataset.meta || '';
    if(bg){
      if(row.dataset.thumb){ bg.style.backgroundImage = "url('" + row.dataset.thumb + "')"; if(pri) pri.classList.add('has-thumb'); }
      else { bg.style.backgroundImage = ''; if(pri) pri.classList.remove('has-thumb'); }
    }
    if(status) status.textContent = (i === 0) ? 'PRIORITY · LIVE' : 'DISPATCH · LIVE';
    if(ghost)  ghost.textContent  = (i + 1 < 10 ? '0' : '') + (i + 1);
  }

  function scrollToStep(i){ if(steps[i]) steps[i].scrollIntoView({ behavior: PREFERS_REDUCED ? 'auto' : 'smooth' }); }

  if(steps.length && ('IntersectionObserver' in window)){
    var ratios = new Array(steps.length); for(var n = 0; n < ratios.length; n++) ratios[n] = 0;
    var cur = -1;
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        var i = parseInt(e.target.getAttribute('data-step'), 10);
        if(!isNaN(i)) ratios[i] = e.isIntersecting ? e.intersectionRatio : 0;
      });
      var best = cur, br = -1;
      for(var k = 0; k < ratios.length; k++){ if(ratios[k] > br){ br = ratios[k]; best = k; } }
      if(br > 0 && best !== cur){ cur = best; activate(best); }
    }, { threshold: [0, 0.25, 0.5, 0.75, 1] });
    steps.forEach(function(s){ io.observe(s); });
  }

  /* click a row → preview it (scroll to its step); cmd/ctrl-click opens Medium */
  rows.forEach(function(row){
    var inner = row.querySelector('.dispatch-row-inner');
    if(!inner) return;
    inner.addEventListener('click', function(e){
      if(e.metaKey || e.ctrlKey || e.shiftKey || e.button === 1) return; /* let new-tab through */
      e.preventDefault();
      scrollToStep(parseInt(row.dataset.idx, 10));
    });
  });

  activate(0);
}

if(document.readyState === 'loading'){ document.addEventListener('DOMContentLoaded', boot); } else { boot(); }
