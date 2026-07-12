/* ──────────────────────────────────────────────────────────────
   wickedagile — SHIPPED : the living IDE split-editor (loop-role tree)
   The seven-package catalog grouped by LOOP ROLE (steer / equip / verify /
   govern / fabric / surface) — the canonical wicked loop.
   DUAL-MODE preview pane:

     (a) SITE  — the 3 DEPLOYED sites (FEATURED[0..2] = interactive · garden ·
         estate) drive the browser-frame: /screenshots/<name>.png via a
         clip-path wipe, 3 editor-tabs (all gated by prefers-reduced-motion).
     (b) LIB   — the other 4 packages (brain · testing · crew · bus) have no
         screenshot;
         selecting one hides the browser-frame and renders a faux code-editor
         card in the SAME pane (header "<name>.<ext>", line-number gutter,
         short syntax-highlighted snippet) with a repo CTA.

   EVERY one of the seven tree leaves is clickable (data-idx 0..6). Exactly
   one active state is kept across the tab strip + the tree (aria-selected /
   aria-current). The visitor's scroll drives the package walk — no timer.

   FEATURED + shared helpers come from the data module — no helper is
   redefined here.
   ────────────────────────────────────────────────────────────── */
import { FEATURED, esc, safeUrl } from './data.js';

var PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ── LIBRARY snippets ─────────────────────────────────────────────
   One entry per LIB leaf (the 5 packages without a deployed screenshot).
   Each: tagline (readout desc), repo (github), the file glyph/ext, and the
   snippet as verbatim lines tokenized at render time by a tiny highlighter.
   Copy is honest product positioning (crew = harness, bus = durable fabric). */
var LIB_SNIPPETS = {
  'wicked-brain': {
    tagline: 'Memory + code-graph with provenance — knowledge the agent can search, challenge, correct, and trace to its source.',
    repo: 'https://github.com/mikeparcewski/wicked-brain',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// memory + code-graph with provenance. markdown + SQLite FTS5, no vector db.",
      "import { brain } from 'wicked-brain'",
      "await brain.remember(decision)",
      "const ctx = await brain.recall('why sqlite?')  // cited · [[backlinked]] · traceable"
    ]
  },
  'wicked-bus': {
    tagline: 'The durable nervous system beneath it all — local-first, at-least-once, replayable.',
    repo: 'https://github.com/mikeparcewski/wicked-bus',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// the fabric beneath the loop: durable, at-least-once, replayable. local-first.",
      "import { bus } from 'wicked-bus'",
      "bus.emit('order.placed', payload)   // cursor-poll, causality-tracked",
      "bus.subscribe('order.*', handle)    // dead-letter + operator replay"
    ]
  },
  'wicked-testing': {
    tagline: 'No agent grades its own homework — an enforced wall between the agent that runs the tests and the one that judges them.',
    repo: 'https://github.com/mikeparcewski/wicked-testing',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// no agent grades its own homework. the judge never sees the runner's context.",
      "import { acceptance } from 'wicked-testing'",
      "const verdict = await acceptance(scenario)  // PASS | FAIL, evidence-gated"
    ]
  },
  'wicked-crew': {
    tagline: 'The control room for governed agent delivery — drive, gate, and audit the work; the human stays in command.',
    repo: 'https://github.com/mikeparcewski/wicked-crew',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// the control room: drive, gate, audit the coding agents you already run.",
      "$ wicked-crew launch --type feature \\",
      "    --problem 'Add OAuth to the API'",
      "// → { session_id, current_phase: 'clarify', deny_dominates: true }"
    ]
  }
};

/* keyword set spans JS/TS + Python (a few extra keywords highlight harmlessly) */
var TS_KEYWORDS = { 'import': 1, 'from': 1, 'await': 1, 'const': 1, 'let': 1, 'var': 1, 'return': 1, 'new': 1, 'def': 1, 'async': 1, 'class': 1, 'for': 1, 'in': 1, 'with': 1, 'None': 1, 'True': 1, 'False': 1, 'not': 1, 'and': 1, 'or': 1 };

/* highlightLine — tokenizes ONE escaped-safe line into syntax spans.
   Comments (// … or # …) → .cm. Strings ('…') → .st. Keywords → .kw. The
   text is escaped first (esc) so the snippet is safe. */
function highlightLine(raw){
  /* split off a trailing/inline comment — but not inside a string */
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

  /* tokenize the code part: strings, keywords, everything else */
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
  var readoutDesc=document.getElementById('readoutDesc');
  var readoutCta=document.getElementById('readoutCta');
  var editorTabs=Array.prototype.slice.call(document.querySelectorAll('.editor-tab'));
  var allLeaves=Array.prototype.slice.call(document.querySelectorAll('.tree-leaf[data-idx]'));
  /* the 3 site leaves map their data-preview → FEATURED idx */
  var siteLeaves=allLeaves.filter(function(l){return l.dataset.mode==='site';});

  var activeSite=1;        /* current FEATURED preview index (0..2); leaf-0 = steer[0] = wicked-garden = FEATURED[1], so the opening site is 1 (garden). */
  var activeLeafIdx=0;     /* current tree leaf data-idx (0..6); 0 = wicked-garden leaf (steer[0], the first leaf in DOM order) */
  var mode='site';         /* 'site' | 'lib' — leaf-0 (garden) is a deployed SITE, so we open in site mode (matches idePreview data-mode="site" in the static HTML) */

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

  /* ── single-source-of-truth active state across tabs + tree ── */
  function syncActive(leafIdx, featIdx){
    /* tabs reflect the site index (only meaningful in site mode) */
    editorTabs.forEach(function(t){
      var on=(mode==='site') && parseInt(t.dataset.idx,10)===featIdx;
      t.setAttribute('aria-selected',on?'true':'false');
      t.tabIndex=on?0:-1;
    });
    /* exactly ONE selected tab even in lib mode (keep tab strip rove-able) */
    if(mode==='lib'){
      editorTabs.forEach(function(t,i){t.tabIndex = i===0?0:-1;});
    }
    /* keep the single tabpanel labelled by whichever tab is selected */
    var panel=document.getElementById('previewPanel');
    if(panel){
      panel.setAttribute('aria-labelledby', (mode==='site') ? ('editorTab-'+featIdx) : 'editorTab-0');
    }
    /* exactly one current leaf in the tree */
    allLeaves.forEach(function(l){
      l.setAttribute('aria-current', parseInt(l.dataset.idx,10)===leafIdx ? 'true':'false');
    });
  }

  /* ── MODE (a): show a site ── */
  function showSite(featIdx, leafIdx){
    mode='site';
    activeSite=featIdx;
    activeLeafIdx=leafIdx;
    idePreview.dataset.mode='site';
    if(codeCard){codeCard.hidden=true;codeCard.setAttribute('aria-hidden','true');}
    if(browserFrame)browserFrame.hidden=false;

    var p=FEATURED[featIdx];
    wipeSlot(browserShot,p);
    if(previewUrl)previewUrl.textContent=p.url.replace('https://','');
    if(crumbName)crumbName.textContent=p.name;
    if(readoutDesc)readoutDesc.textContent=p.desc;
    if(readoutCta){readoutCta.href=safeUrl(p.url);readoutCta.textContent='Open Preview ↗';}
    syncActive(leafIdx, featIdx);
  }

  /* ── MODE (b): show a library (faux source file) ── */
  function showLib(libKey, leafIdx){
    var snip=LIB_SNIPPETS[libKey];
    if(!snip){return;}
    mode='lib';
    activeLeafIdx=leafIdx;
    idePreview.dataset.mode='lib';
    if(browserFrame)browserFrame.hidden=true;
    if(codeCard){codeCard.hidden=false;codeCard.setAttribute('aria-hidden','false');}

    if(codeFile)codeFile.textContent=libKey+'.'+(snip.ext||'js');
    if(ccGlyph)ccGlyph.textContent=snip.glyph||'JS';
    if(crumbName)crumbName.textContent=libKey;
    if(readoutDesc)readoutDesc.textContent=snip.tagline;
    if(readoutCta){readoutCta.href=safeUrl(snip.repo);readoutCta.textContent=snip.cta||((snip.install||'npm i')+' '+libKey+' ↗');}

    /* render the snippet with a real line-number gutter + syntax spans */
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
    syncActive(leafIdx, activeSite);
  }

  /* ── dispatch by a tree leaf or a tab (drives the right mode) ── */
  function selectLeaf(leaf){
    if(leaf.dataset.mode==='site'){
      showSite(parseInt(leaf.dataset.preview,10), parseInt(leaf.dataset.idx,10));
    }else{
      showLib(leaf.dataset.lib, parseInt(leaf.dataset.idx,10));
    }
  }
  function selectSiteByPreview(featIdx){
    /* used by tabs — find the matching site leaf for state */
    var leaf=siteLeaves.filter(function(l){return parseInt(l.dataset.preview,10)===featIdx;})[0];
    showSite(featIdx, leaf?parseInt(leaf.dataset.idx,10):activeLeafIdx);
  }

  /* ── SCROLL-DRIVEN WALK ───────────────────────────────────────────
     The Shipped section is a tall "track" with a pinned IDE stage and 8
     invisible snap steps (.ide-step, data-step 0..7). Scrolling snaps
     step-by-step; an IntersectionObserver maps the most-visible step → the
     matching package, opening that folder, closing the rest, and driving the
     preview. No timer — the visitor's scroll IS the walk. */
  function setFolderOpen(folder,open){
    folder.classList.toggle('is-collapsed',!open);
    var b=folder.querySelector('.folder-row');
    if(b)b.setAttribute('aria-expanded',open?'true':'false');
  }
  function openOnly(folder){
    document.querySelectorAll('.tree-folder').forEach(function(f){setFolderOpen(f,f===folder);});
  }
  function activate(i){
    var leaf=allLeaves[i]; if(!leaf)return;
    var folder=leaf.closest('.tree-folder');
    if(folder && folder.classList.contains('is-collapsed'))openOnly(folder);
    selectLeaf(leaf);
  }
  var ideSteps=Array.prototype.slice.call(document.querySelectorAll('.ide-step'));
  function scrollToStep(i){
    if(ideSteps[i])ideSteps[i].scrollIntoView({behavior:PREFERS_REDUCED?'auto':'smooth'});
  }
  function wireScrollSteps(){
    if(!ideSteps.length || !('IntersectionObserver' in window))return;
    var ratios=new Array(ideSteps.length); for(var i=0;i<ratios.length;i++)ratios[i]=0;
    var cur=-1;
    var io=new IntersectionObserver(function(entries){
      entries.forEach(function(e){
        var idx=parseInt(e.target.getAttribute('data-step'),10);
        if(!isNaN(idx))ratios[idx]=e.isIntersecting?e.intersectionRatio:0;
      });
      var best=cur,br=-1;
      for(var k=0;k<ratios.length;k++){if(ratios[k]>br){br=ratios[k];best=k;}}
      if(br>0 && best!==cur){cur=best;activate(best);}
    },{threshold:[0,0.25,0.5,0.75,1]});
    ideSteps.forEach(function(s){io.observe(s);});
  }

  function initPreview(){
    /* Paint the FIRST leaf in DOM order (= the scroll-walk's step-0 target) so
       the static HTML, shipped.js, AND the scroll walk all agree on the opening
       package — no pre-scroll flash. After the loop-role reorg, leaf-0 is
       steer[0] = wicked-garden, a deployed SITE leaf, so we open on its
       browser-frame (matching idePreview data-mode="site" in the static HTML).
       The lib branch is kept for the case where leaf-0 is ever a library. */
    var firstLeaf=allLeaves[0];
    if(!firstLeaf)return;
    if(firstLeaf.dataset.mode==='site'){
      var featIdx=parseInt(firstLeaf.dataset.preview,10);
      var front=browserShot.querySelector('.shot-bg-front');
      if(isNaN(featIdx) || !FEATURED[featIdx] || !front)return;
      mode='site';
      activeSite=featIdx;
      idePreview.dataset.mode='site';
      if(codeCard){codeCard.hidden=true;codeCard.setAttribute('aria-hidden','true');}
      if(browserFrame)browserFrame.hidden=false;
      var p=FEATURED[featIdx];
      front.style.clipPath='inset(0 0 0 0)';
      front.style.backgroundImage="url('"+p.screenshot+"')";
      activeLeafIdx=parseInt(firstLeaf.dataset.idx,10);
      if(previewUrl)previewUrl.textContent=p.url.replace('https://','');
      if(crumbName)crumbName.textContent=p.name;
      if(readoutDesc)readoutDesc.textContent=p.desc;
      if(readoutCta){readoutCta.href=safeUrl(p.url);readoutCta.textContent='Open Preview ↗';}
      syncActive(activeLeafIdx, featIdx);
    }else{
      /* lib leaf-0: render its faux code-card (no wipe transition to gate) */
      selectLeaf(firstLeaf);
    }
  }

  function buildPreview(){
    initPreview();

    /* the visitor's scroll position drives the package walk (no timer) */
    wireScrollSteps();

    /* editor-tab click → jump to that site's step (scroll-synced) */
    editorTabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        var fi=parseInt(tab.dataset.idx,10);
        selectSiteByPreview(fi);
        var leaf=siteLeaves.filter(function(l){return parseInt(l.dataset.preview,10)===fi;})[0];
        if(leaf)scrollToStep(parseInt(leaf.dataset.idx,10));
      });
    });

    /* roving-tabindex arrow-key nav on the preview tab strip (role=tab) */
    var tablist=document.getElementById('previewTabs');
    if(tablist){
      tablist.addEventListener('keydown',function(e){
        var idx=editorTabs.indexOf(document.activeElement);
        if(idx<0)return;
        var next=-1;
        if(e.key==='ArrowRight'||e.key==='ArrowDown')next=(idx+1)%editorTabs.length;
        else if(e.key==='ArrowLeft'||e.key==='ArrowUp')next=(idx-1+editorTabs.length)%editorTabs.length;
        else if(e.key==='Home')next=0;
        else if(e.key==='End')next=editorTabs.length-1;
        if(next>=0){
          e.preventDefault();editorTabs[next].focus();selectSiteByPreview(next);
          var leaf=siteLeaves.filter(function(l){return parseInt(l.dataset.preview,10)===next;})[0];
          if(leaf)scrollToStep(parseInt(leaf.dataset.idx,10));
        }
      });
    }

    /* EVERY tree leaf drives the preview pane — site OR lib. Left-click
       without modifiers updates the in-page preview; the leaf keeps its href
       so cmd/ctrl-click and the keyboard still open the real destination. */
    allLeaves.forEach(function(leaf){
      leaf.addEventListener('click',function(e){
        if(e.metaKey||e.ctrlKey||e.shiftKey||e.button===1)return; /* let new-tab through */
        e.preventDefault();
        selectLeaf(leaf);
        scrollToStep(parseInt(leaf.dataset.idx,10));
      });
    });
  }

  /* ── EXPLORER folder collapse toggles ── */
  function buildExplorer(){
    document.querySelectorAll('.folder-row').forEach(function(btn){
      btn.addEventListener('click',function(){
        var folder=btn.closest('.tree-folder');
        var open=!folder.classList.contains('is-collapsed');
        folder.classList.toggle('is-collapsed',open);
        btn.setAttribute('aria-expanded',open?'false':'true');
      });
    });
  }

  buildExplorer();
  buildPreview();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}
