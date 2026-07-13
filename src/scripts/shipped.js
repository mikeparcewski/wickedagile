/* ──────────────────────────────────────────────────────────────
   wickedagile — SHIPPED : THE LOOP (living orbit)
   The seven-package catalog as an orbital loop. Package STATIONS sit around a
   ring; the reused preview pane sits in the CENTER. Selecting a station drives
   the same DUAL-MODE preview pane the old split-editor used:

     (a) SITE  — the 3 DEPLOYED sites (FEATURED[0..2] = interactive · garden ·
         estate) drive the browser-frame: /screenshots/<name>.png via a
         clip-path wipe (gated by prefers-reduced-motion).
     (b) LIB   — the other 4 packages (brain · testing · crew · bus) have no
         screenshot; selecting one hides the browser-frame and renders a faux
         code-editor card in the SAME pane.

   Every station carries data-idx 0..6 + data-mode/site|lib + data-preview/lib +
   data-vx/data-vy (viewBox point), plus data-role/data-color used to tint the
   center. Exactly one station holds aria-current.

   AUTO-PLAY: on load the loop plays itself — the active station advances around
   the cycle (garden→estate→brain→testing→bus→crew→back), and the "current" pulse
   is DRIVEN along #ringPath (getPointAtLength) in lock-step, arriving at each
   station exactly as it becomes active. Any click / focus / arrow-key pins the
   loop (the affordance resumes it). Under prefers-reduced-motion there is no
   auto-advance: the loop parks on garden with a static pulse.

   The old tree-folder toggles + scroll-walk are gone — the orbit fits one screen.

   FEATURED + shared helpers come from the data module.
   ────────────────────────────────────────────────────────────── */
import { FEATURED, esc, safeUrl } from './data.js';

var PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ── LIBRARY snippets — the two NO-SITE products (garden/estate/testing/crew/
   interactive are live sites → real screenshots). brain and bus are deliberately
   distinct from each other: brain = memory/code-graph, bus = durable event log. */
var LIB_SNIPPETS = {
  'wicked-brain': {
    tagline: 'Memory + code-graph with provenance — knowledge the agent can search, challenge, correct, and trace back to its source.',
    repo: 'https://github.com/mikeparcewski/wicked-brain',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// memory + code-graph with provenance. markdown + SQLite FTS5 — no vector db.",
      "import { brain } from 'wicked-brain'",
      "await brain.remember('chose SQLite: zero-infra, ACID, crash-safe')",
      "const why = await brain.recall('why sqlite?')",
      "// → cited · [[backlinked]] · traceable to the commit that decided it"
    ]
  },
  'wicked-bus': {
    tagline: 'The durable event fabric beneath it all — local-first, at-least-once, replayable. The nervous system the loop rides on.',
    repo: 'https://github.com/mikeparcewski/wicked-bus',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// durable event log: at-least-once, causality-traced, replayable. local-first.",
      "bus.emit('wicked.qe.verdict.passed', { run: 42 })",
      "// log ▸ 12:04:07 delivered ▸ 12:04:07 acked ▸ 1 subscriber",
      "bus.subscribe('wicked.qe.*', handle)  // dead-letter + operator replay"
    ]
  }
};

/* keyword set spans JS/TS + Python (a few extra keywords highlight harmlessly) */
var TS_KEYWORDS = { 'import': 1, 'from': 1, 'await': 1, 'const': 1, 'let': 1, 'var': 1, 'return': 1, 'new': 1, 'def': 1, 'async': 1, 'class': 1, 'for': 1, 'in': 1, 'with': 1, 'None': 1, 'True': 1, 'False': 1, 'not': 1, 'and': 1, 'or': 1 };

/* highlightLine — tokenizes ONE line into syntax spans (escaped-safe). */
function highlightLine(raw){
  var code = raw, comment = '';
  var inStr = false, q = '';
  for(var i=0;i<raw.length;i++){
    var ch = raw[i];
    if(inStr){ if(ch===q) inStr=false; continue; }
    if(ch==="'"||ch==='"'){ inStr=true; q=ch; continue; }
    if(ch==='/' && raw[i+1]==='/'){ code = raw.slice(0,i); comment = raw.slice(i); break; }
    if(ch==='#'){ code = raw.slice(0,i); comment = raw.slice(i); break; }  /* Python comment */
  }

  var html = '';
  var re = /('[^']*'|"[^"]*"|\b[A-Za-z_$][\w$]*\b|[^A-Za-z_$'"]+)/g;
  var m;
  while((m = re.exec(code)) !== null){
    var tok = m[0];
    if(tok.charAt(0)==="'"||tok.charAt(0)==='"'){
      html += '<span class="st">'+esc(tok)+'</span>';
    } else if(Object.prototype.hasOwnProperty.call(TS_KEYWORDS, tok)){
      html += '<span class="kw">'+esc(tok)+'</span>';
    } else if(/^[A-Za-z_$][\w$]*$/.test(tok)){
      html += '<span class="fn">'+esc(tok)+'</span>';
    } else {
      html += esc(tok);
    }
  }
  if(comment){ html += '<span class="cm">'+esc(comment)+'</span>'; }
  if(html==='') html = '&nbsp;';
  return html;
}

function boot(){
  var browserShot=document.getElementById('browserShot');
  var workspacePane=document.getElementById('workspacePane');
  /* shipped markup absent (e.g. another page) — nothing to run */
  if(!browserShot||!workspacePane)return;

  var idePreview=document.getElementById('idePreview');
  var browserFrame=document.getElementById('browserFrame');
  var codeCard=document.getElementById('codeCard');
  var codeFile=document.getElementById('codeFile');
  var ccGlyph=document.querySelector('#codeCard .cc-glyph');
  var codeBlock=document.getElementById('codeBlock');
  var previewUrl=document.getElementById('previewUrl');
  var crumbName=document.getElementById('crumbName');
  var centerRole=document.getElementById('centerRole');
  var readoutDesc=document.getElementById('readoutDesc');
  var readoutCta=document.getElementById('readoutCta');
  /* every selectable "station": the inner ring nodes PLUS the crew frame legend
     and the wicked-interactive strip (all carry data-idx + data-mode). */
  var stations=Array.prototype.slice.call(document.querySelectorAll('#projects [data-idx][data-mode]'));
  if(!stations.length)return;
  var crewBox=document.getElementById('crewBox');

  /* the AUTO-PLAY walk set = only the on-track ring nodes (they carry data-vx);
     crew (the box) and interactive (the strip) are NOT on the ring, so excluded. */
  var ringStations=stations.filter(function(s){return s.dataset.vx!==undefined;});

  /* ── PULSE: driven along #ringPath via getPointAtLength (no SMIL) ─────
     The "current" pulse walks the auto-play selection station→station; it is
     pinned/parked on interaction and under prefers-reduced-motion. */
  var ringPathEl=document.getElementById('ringPath');
  var pulseDot=document.querySelector('.orbit-pulse');
  var pulseGlow=document.querySelector('.orbit-pulse-glow');
  var pathLen=(ringPathEl&&ringPathEl.getTotalLength)?ringPathEl.getTotalLength():0;

  function setPulseLen(L){
    if(!ringPathEl||!pathLen)return;
    L=((L%pathLen)+pathLen)%pathLen;
    var p=ringPathEl.getPointAtLength(L);
    if(pulseDot){pulseDot.setAttribute('cx',p.x);pulseDot.setAttribute('cy',p.y);}
    if(pulseGlow){pulseGlow.setAttribute('cx',p.x);pulseGlow.setAttribute('cy',p.y);}
  }
  /* the path-length nearest a station's viewBox point (coarse sample is plenty) */
  function nearestLen(vx,vy){
    if(!ringPathEl||!pathLen)return 0;
    var best=0,bd=Infinity,N=480,i,L,p,dx,dy,d;
    for(i=0;i<=N;i++){
      L=pathLen*i/N;p=ringPathEl.getPointAtLength(L);
      dx=p.x-vx;dy=p.y-vy;d=dx*dx+dy*dy;
      if(d<bd){bd=d;best=L;}
    }
    return best;
  }
  /* auto-play order = ring stations sorted along the track (garden→…→crew) */
  var seq=ringStations.map(function(s){
    return {el:s,len:nearestLen(parseFloat(s.dataset.vx),parseFloat(s.dataset.vy))};
  }).sort(function(a,b){return a.len-b.len;});

  /* ── wipeSlot — two-layer clip-path inset wipe (reduced-motion gated) ── */
  function wipeSlot(el,project){
    var back=el.querySelector('.shot-bg-back');
    var front=el.querySelector('.shot-bg-front');
    back.style.backgroundImage=front.style.backgroundImage;
    if(PREFERS_REDUCED){
      front.style.transition='none';
      front.style.clipPath='inset(0 0 0 0)';
      front.style.backgroundImage="url('"+project.screenshot+"')";
      return;
    }
    front.style.transition='none';
    front.style.clipPath='inset(0 100% 0 0)';
    front.style.backgroundImage="url('"+project.screenshot+"')";
    requestAnimationFrame(function(){
      requestAnimationFrame(function(){
        front.style.transition='clip-path 0.58s cubic-bezier(.16,1,.3,1)';
        front.style.clipPath='inset(0 0 0 0)';
      });
    });
  }

  /* ── station chrome: exactly one aria-current + tint the center ── */
  function applyStation(el){
    var role=el.getAttribute('data-role')||'';
    var color=el.getAttribute('data-color')||'var(--accent)';
    if(centerRole){centerRole.textContent=role;centerRole.style.color=color;}
    workspacePane.style.setProperty('--center-glow', color);
    stations.forEach(function(s){
      s.setAttribute('aria-current', s===el ? 'true':'false');
    });
  }

  /* ── MODE (a): paint a site into the browser-frame ── */
  function showSite(featIdx, animate){
    var p=FEATURED[featIdx];
    if(!p)return;
    idePreview.dataset.mode='site';
    if(codeCard){codeCard.hidden=true;codeCard.setAttribute('aria-hidden','true');}
    if(browserFrame)browserFrame.hidden=false;
    if(animate===false){
      var front=browserShot.querySelector('.shot-bg-front');
      if(front){front.style.clipPath='inset(0 0 0 0)';front.style.backgroundImage="url('"+p.screenshot+"')";}
    }else{
      wipeSlot(browserShot,p);
    }
    if(previewUrl)previewUrl.textContent=p.url.replace('https://','');
    if(crumbName)crumbName.textContent=p.name;
    if(readoutDesc)readoutDesc.textContent=p.desc;
    if(readoutCta){readoutCta.href=safeUrl(p.url);readoutCta.textContent='Open ↗';}
  }

  /* ── MODE (b): render a library as a faux source file ── */
  function showLib(libKey){
    var snip=LIB_SNIPPETS[libKey];
    if(!snip){return;}
    idePreview.dataset.mode='lib';
    if(browserFrame)browserFrame.hidden=true;
    if(codeCard){codeCard.hidden=false;codeCard.setAttribute('aria-hidden','false');}

    if(codeFile)codeFile.textContent=libKey+'.'+(snip.ext||'js');
    if(ccGlyph)ccGlyph.textContent=snip.glyph||'JS';
    if(crumbName)crumbName.textContent=libKey;
    if(readoutDesc)readoutDesc.textContent=snip.tagline;
    if(readoutCta){readoutCta.href=safeUrl(snip.repo);readoutCta.textContent=snip.cta||((snip.install||'npm i')+' '+libKey+' ↗');}

    if(codeBlock){
      var code=codeBlock.querySelector('code')||codeBlock;
      var rows='';
      snip.lines.forEach(function(line,i){
        rows += '<span class="code-line"><span class="ln">'+(i+1)+'</span>'+
                '<span class="lc">'+highlightLine(line)+'</span></span>';
      });
      code.innerHTML=rows;
      codeBlock.scrollTop=0;
    }
  }

  /* ── select a station → tint the center + drive the right preview mode ── */
  function selectStation(el, animate){
    applyStation(el);
    if(el.dataset.mode==='site'){
      showSite(parseInt(el.dataset.preview,10), animate);
    }else{
      showLib(el.dataset.lib);
    }
  }

  /* ── AUTO-PLAY: the loop plays itself until the visitor takes control ──
     The active station advances around the cycle (garden→estate→brain→testing→
     bus→crew→back), dwelling ~DWELL ms each; the "current" pulse travels the
     track in lock-step and ARRIVES at each station exactly as it becomes active.
     Any click / focus / arrow-key pins the loop; the affordance resumes it. */
  var DWELL=3400;
  var autoplay=false, rafId=0, segStart=0, curIdx=0;
  var toggle=document.getElementById('autoplayToggle');
  var toggleText=toggle&&toggle.querySelector('.ap-text');

  function easeInOut(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}

  function setAffordance(playing){
    /* crew's frame gets a gentle govern-purple "running" glow while auto-playing */
    if(crewBox)crewBox.classList.toggle('is-running',playing);
    if(!toggle)return;
    toggle.classList.toggle('is-paused',!playing);
    if(toggleText)toggleText.textContent=playing
      ? 'auto-playing · click any station to drive'
      : 'you’re driving · resume auto-play ↺';
  }

  function tick(now){
    if(!autoplay)return;
    var from=seq[curIdx].len, to=seq[(curIdx+1)%seq.length].len;
    if(to<from)to+=pathLen;                 /* wrap the closing leg past the seam */
    var t=Math.min((now-segStart)/DWELL,1);
    setPulseLen(from+(to-from)*easeInOut(t));
    if(t>=1){                                /* arrived → select the next station */
      curIdx=(curIdx+1)%seq.length;
      selectStation(seq[curIdx].el,true);
      segStart=now;
    }
    rafId=requestAnimationFrame(tick);
  }
  function startAuto(fromIdx){
    if(PREFERS_REDUCED||!seq.length)return;
    if(typeof fromIdx==='number')curIdx=fromIdx;
    autoplay=true;setAffordance(true);
    segStart=(window.performance&&performance.now)?performance.now():Date.now();
    cancelAnimationFrame(rafId);rafId=requestAnimationFrame(tick);
  }
  function stopAuto(){
    autoplay=false;cancelAnimationFrame(rafId);setAffordance(false);
  }
  /* pin the loop to a station (stops auto-play + snaps the pulse to it) */
  function pin(el,animate){
    stopAuto();
    for(var k=0;k<seq.length;k++){if(seq[k].el===el){curIdx=k;setPulseLen(seq[k].len);break;}}
    selectStation(el,animate);
  }

  /* ── boot: default selected = the first ring node (Steer / wicked-garden) ── */
  function initPreview(){
    /* seq[0] is garden (smallest track length); stations[0] is now the surface
       strip in DOM order, so target the ring set explicitly. */
    var first=(seq[0] && seq[0].el) || stations[0];
    selectStation(first, false); /* no wipe on load — static HTML already matches */
  }

  function wireStations(){
    stations.forEach(function(el){
      /* left-click updates the preview + pins (href stays live for cmd/ctrl-click) */
      el.addEventListener('click',function(e){
        if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;
        e.preventDefault();
        pin(el,true);
      });
      /* focus (tab/keyboard) pins too — matches "you're driving" on the family sites */
      el.addEventListener('focus',function(){ if(autoplay)pin(el,true); });
    });

    /* arrow-key walk around the ring nodes (pins). Only the on-track ring set. */
    var ring=ringStations, orbit=document.querySelector('.orbit');
    if(orbit && ring.length){
      orbit.addEventListener('keydown',function(e){
        var idx=ring.indexOf(document.activeElement);
        if(idx<0)return;
        var next=-1;
        if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(idx+1)%ring.length;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(idx-1+ring.length)%ring.length;
        else if(e.key==='Home')next=0;
        else if(e.key==='End')next=ring.length-1;
        if(next>=0){
          e.preventDefault();
          ring[next].focus();
          pin(ring[next],true);
        }
      });
    }

    /* the affordance pauses / resumes the auto-play */
    if(toggle){
      toggle.addEventListener('click',function(){
        if(autoplay)stopAuto();
        else startAuto(curIdx);
      });
    }
  }

  initPreview();
  wireStations();
  var isMobile=window.matchMedia&&window.matchMedia('(max-width:880px)').matches;
  if(PREFERS_REDUCED||isMobile){
    if(seq.length)setPulseLen(seq[0].len); /* park the current on garden (static) */
  }else{
    startAuto(0);                           /* garden → estate → … self-playing */
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}
