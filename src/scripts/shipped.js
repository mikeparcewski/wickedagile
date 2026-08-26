/* ──────────────────────────────────────────────────────────────
   wickedagile — SHIPPED : THE FOUR-PLANE STACK (planes → one surface)
   The platform as a composing stack: foundation (estate) → capability
   (garden) → control (crew) → the EXPERIENCE capstone, one surface
   (wicked-studio). The reused preview pane sits BESIDE the stack. Selecting a
   block drives the same DUAL-MODE preview pane:

     (a) SITE  — the 4 DEPLOYED sites (studio · garden · estate · crew)
         drive the browser-frame: /screenshots/<name>.png via a clip-path
         wipe (gated by prefers-reduced-motion).
     (b) LIB   — studio has no site of its own (it ships inside wicked-crew);
         selecting it renders a faux code-editor card in the SAME pane.

   Every block carries data-idx 0..4 + data-mode/site|lib + data-preview|data-lib
   + data-role/data-color to tint the pane; the stack blocks also carry
   data-order (the bottom-up assemble sequence). Exactly one holds aria-current.

   AUTO-PLAY: energy RISES up the spine — foundation → capability → control —
   pinging each plane as it passes; the experience capstone (the surface)
   fires when it arrives, holds a beat, then the pulse restarts at the bottom.
   Any click / focus / arrow-key hands the preview to the visitor. Under
   prefers-reduced-motion there is no pulse — the stack parks fully assembled
   on the foundation (estate).

   FEATURED + shared helpers come from the data module.
   ────────────────────────────────────────────────────────────── */
import { FEATURED, esc, safeUrl } from './data.js';

var PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ── LIBRARY snippets — products with no site of their own, rendered as a faux source file.
   Empty for now. The one entry here was wicked-studio, described as "ships inside wicked-crew"
   and linked to wicked-crew/tree/main/packages/studio — a path that stopped existing when studio
   was carved out into its own repo, and a claim that stopped being true when it got its own site
   at ws.wickedagile.com. It now previews as a site, like the other plane products. showLib()
   no-ops on a missing key, so the mechanism stays available for the next site-less product. */
var LIB_SNIPPETS = {};

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
  var stackRoot=document.getElementById('stackRoot');
  var solutionCap=document.getElementById('solutionCap');

  /* every selectable element: the stack blocks PLUS the interactive strip
     (all carry data-idx + data-mode). */
  var selectables=Array.prototype.slice.call(document.querySelectorAll('#projects [data-idx][data-mode]'));
  if(!selectables.length)return;

  /* the ASSEMBLE set = only the stack blocks (they carry data-order); the
     interactive strip is a surface beside, so it is excluded from the walk. */
  var blocks=Array.prototype.slice.call(document.querySelectorAll('#projects .block'));
  /* build sequence, bottom-up (ascending data-order) */
  var seq=blocks.slice().sort(function(a,b){
    return (parseInt(a.dataset.order,10)||0)-(parseInt(b.dataset.order,10)||0);
  });

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

  /* ── block chrome: exactly one aria-current + tint the preview ── */
  function applyStation(el){
    var role=el.getAttribute('data-role')||'';
    var color=el.getAttribute('data-color')||'var(--accent)';
    if(centerRole){centerRole.textContent=role;centerRole.style.color=color;}
    workspacePane.style.setProperty('--center-glow', color);
    selectables.forEach(function(s){
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
    if(crumbName)crumbName.textContent=snip.name||libKey;
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

  /* ── select a block → tint the preview + drive the right mode ── */
  function selectStation(el, animate){
    applyStation(el);
    if(el.dataset.mode==='site'){
      showSite(parseInt(el.dataset.preview,10), animate);
    }else{
      showLib(el.dataset.lib);
    }
  }

  /* ── ENERGY RISES UP THE SPINE ─────────────────────────────────────
     A pulse travels the rail from the foundation up into the capstone,
     "pinging" each layer as it passes; the capstone glows when it arrives,
     holds a beat, then the pulse restarts at the bottom. Blocks never dim —
     the spine carries the motion. The preview pane is explore-driven (click /
     focus a block). Parked under prefers-reduced-motion + on mobile. */
  var pulse=document.getElementById('spinePulse');
  var layerEls=Array.prototype.slice.call(document.querySelectorAll('#projects .layer'));
  var RISE=4200, HOLD=1150;
  var running=false, raf=0, t0=0, phase='rise';
  var railTop=12, railBottom=0, layerStops=[];

  function easeInOut(t){return t<0.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2;}

  /* measure rail extent + each layer's centre, relative to the stack box */
  function measure(){
    if(!stackRoot)return;
    var sr=stackRoot.getBoundingClientRect();
    railBottom=sr.height-10;
    if(solutionCap){
      var cr=solutionCap.getBoundingClientRect();
      railTop=(cr.top-sr.top)+cr.height/2;   /* arrive at the capstone's centre */
    }
    layerStops=layerEls.map(function(el){
      var r=el.getBoundingClientRect();
      return {el:el, y:(r.top-sr.top)+r.height/2, done:false};
    });
  }

  function ping(el){
    el.classList.add('is-pinged');
    setTimeout(function(){el.classList.remove('is-pinged');},520);
  }

  function frame(now){
    if(!running)return;
    if(!t0)t0=now;
    if(phase==='rise'){
      var t=Math.min((now-t0)/RISE,1);
      var y=railBottom+(railTop-railBottom)*easeInOut(t);
      pulse.style.top=y+'px';
      pulse.style.opacity='0.95';
      layerStops.forEach(function(L){ if(!L.done && y<=L.y){ L.done=true; ping(L.el); } });
      if(t>=1){ phase='hold'; t0=now; if(solutionCap)solutionCap.classList.add('is-built'); pulse.style.opacity='0'; }
    }else{ /* hold at the capstone, then reset to the foundation */
      if(now-t0>=HOLD){
        phase='rise'; t0=now;
        if(solutionCap)solutionCap.classList.remove('is-built');
        layerStops.forEach(function(L){L.done=false;});
      }
    }
    raf=requestAnimationFrame(frame);
  }

  function startRise(){
    if(PREFERS_REDUCED||!pulse)return;
    measure();
    running=true; phase='rise'; t0=0;
    cancelAnimationFrame(raf); raf=requestAnimationFrame(frame);
  }

  /* ── boot: default preview = the foundation block (estate); static matches ── */
  function initPreview(){
    selectStation(seq[0]||blocks[0], false); /* no wipe on load — static HTML matches */
  }

  function wireStations(){
    selectables.forEach(function(el){
      el.addEventListener('click',function(e){
        if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return;
        e.preventDefault();
        selectStation(el,true);              /* drive the preview; the pulse keeps rising */
      });
      el.addEventListener('focus',function(){ selectStation(el,false); });
    });

    /* arrow-key walk through the stack blocks (DOM order, top→bottom) */
    if(stackRoot && blocks.length){
      stackRoot.addEventListener('keydown',function(e){
        var idx=blocks.indexOf(document.activeElement);
        if(idx<0)return;
        var next=-1;
        if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(idx+1)%blocks.length;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(idx-1+blocks.length)%blocks.length;
        else if(e.key==='Home')next=0;
        else if(e.key==='End')next=blocks.length-1;
        if(next>=0){ e.preventDefault(); blocks[next].focus(); selectStation(blocks[next],true); }
      });
    }
  }

  initPreview();
  wireStations();
  var isMobile=window.matchMedia&&window.matchMedia('(max-width:880px)').matches;
  if(PREFERS_REDUCED||isMobile){
    if(solutionCap)solutionCap.classList.add('is-built'); /* park assembled, no pulse */
  }else{
    /* start after layout settles so the rail measurements are correct */
    requestAnimationFrame(function(){ requestAnimationFrame(startRise); });
    window.addEventListener('resize',function(){ if(running)measure(); });
  }
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}
