/* ──────────────────────────────────────────────────────────────
   wickedagile — SHIPPED : the living IDE split-editor (tree-only)
   Decomposed from index.next.html. DUAL-MODE preview pane:

     (a) SITE  — the 3 DEPLOYED accelerators (FEATURED[0..2]) drive the
         browser-frame: /screenshots/<name>.png via a clip-path wipe,
         3 editor-tabs + auto-rotation (all gated by prefers-reduced-motion).
     (b) LIB   — the other 6 packages have no screenshot; selecting one
         hides the browser-frame and renders a faux code-editor card in the
         SAME pane (header "<name>.ts", line-number gutter, short
         syntax-highlighted TS snippet) with an "npm i <name> ↗" CTA.

   EVERY one of the nine tree leaves is clickable (data-idx 0..8). Exactly
   one active state is kept across the tab strip + the tree (aria-selected /
   aria-current). Auto-rotation cycles ONLY the 3 accelerators and pauses on
   hover/focus, when document.hidden, when a library is selected, and is
   fully disabled under prefers-reduced-motion.

   FEATURED + shared helpers come from the data module — no helper is
   redefined here.
   ────────────────────────────────────────────────────────────── */
import { FEATURED, esc, safeUrl } from './data.js';

var PREFERS_REDUCED = window.matchMedia && window.matchMedia('(prefers-reduced-motion:reduce)').matches;

/* ── LIBRARY snippets (VERBATIM) ──────────────────────────────────
   Each entry: tagline (readout desc), repo (github), and the snippet as
   an array of lines. A line is either a plain string (rendered as a
   comment when it starts with //) or pre-tokenized — here we keep the
   verbatim text and tokenize at render time with a tiny TS highlighter so
   the source stays exactly as authored. */
var LIB_SNIPPETS = {
  'wicked-signals': {
    tagline: 'Text in. Intent out.',
    repo: 'https://github.com/mikeparcewski/wicked-signals',
    ext: 'ts', glyph: 'TS', install: 'npm i',
    lines: [
      "// classify any signal. route it. store it.",
      "import { ingestText } from 'wicked-signals'",
      "const result = await ingestText('Build a dark mode toggle')",
      "// → { signal_id, route_target: 'crew_idd', confidence: 0.87 }"
    ]
  },
  'wicked-crew': {
    tagline: 'The session layer your agent teams need.',
    repo: 'https://github.com/mikeparcewski/wicked-crew',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// phase-gated sessions. hitl. council. audit trail.",
      "$ wicked-crew crew launch --type feature \\",
      "    --problem 'Add OAuth to the API'",
      "// → { session_id, current_phase: 'clarify', status: 'Open' }"
    ]
  },
  'wicked-studio': {
    tagline: 'The UI your agent should have.',
    repo: 'https://github.com/mikeparcewski/wicked-studio',
    ext: 'rs', glyph: 'RS', install: 'cargo add',
    lines: [
      "// desktop hitl shell. tauri. stateful. offline.",
      "use wicked_studio::HitlStore;",
      "let mut store = HitlStore::new();",
      "store.open_session(session_id, prompt)?;"
    ]
  },
  'wicked-brain': {
    tagline: 'Agents forget everything. This one doesn\'t.',
    repo: 'https://github.com/mikeparcewski/wicked-brain',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// agents forget everything. this one doesn't.",
      "import { brain } from 'wicked-brain'",
      "await brain.remember(decision)",
      "const ctx = await brain.recall('why sqlite?')  // cited · ranked · local"
    ]
  },
  'wicked-understanding': {
    tagline: 'Not what the code does — why it does it.',
    repo: 'https://github.com/mikeparcewski/wicked-understanding',
    ext: 'py', glyph: 'PY', install: 'pip install',
    lines: [
      "# not what the code does — why it does it.",
      "from wicked_understanding import why",
      "rationale = await why('PaymentService')"
    ]
  },
  'wicked-vault': {
    tagline: 'The diff said it worked. The vault says what actually happened.',
    repo: 'https://github.com/mikeparcewski/wicked-vault',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// the diff said it worked. the vault says what happened.",
      "import { vault } from 'wicked-vault'",
      "await vault.record(evidence).attest()  // re-derived, never asserted"
    ]
  },
  'wicked-testing': {
    tagline: 'AI tests that actually require proof.',
    repo: 'https://github.com/mikeparcewski/wicked-testing',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// AI tests that actually require proof.",
      "import { acceptance } from 'wicked-testing'",
      "const verdict = await acceptance(scenario)  // PASS | FAIL, evidence-gated"
    ]
  },
  'wicked-bus': {
    tagline: 'Fire-and-forget. Minus the forgetting.',
    repo: 'https://github.com/mikeparcewski/wicked-bus',
    ext: 'js', glyph: 'JS', install: 'npm i',
    lines: [
      "// fire-and-forget. minus the forgetting.",
      "import { bus } from 'wicked-bus'",
      "bus.emit('order.placed', payload)   // at-least-once",
      "bus.subscribe('order.*', handle)"
    ]
  },
  'wicked-loom': {
    tagline: 'Teaches the agent what you built before you got here.',
    repo: 'https://github.com/mikeparcewski/wicked-loom',
    ext: 'py', glyph: 'PY', install: 'pip install',
    lines: [
      "# teaches the agent what you built before you got here.",
      "from wicked_loom import loom",
      "playbook = await loom.weave(repo)"
    ]
  }
};

/* keyword set spans JS/TS + Python (a few extra keywords highlight harmlessly) */
var TS_KEYWORDS = { 'import': 1, 'from': 1, 'await': 1, 'const': 1, 'let': 1, 'var': 1, 'return': 1, 'new': 1, 'def': 1, 'async': 1, 'class': 1, 'for': 1, 'in': 1, 'with': 1, 'None': 1, 'True': 1, 'False': 1, 'not': 1, 'and': 1, 'or': 1 };

/* highlightLine — tokenizes ONE escaped-safe TS line into syntax spans.
   Comments (everything from // onward) → .cm. Strings ('...') → .st.
   Keywords → .kw. The text is escaped first (esc) so the snippet is safe;
   tokens are wrapped in spans whose contents are themselves escaped. */
function highlightLine(raw){
  /* split off a trailing/inline comment (// ...) — but not inside a string */
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
  /* the 3 accelerator (site) leaves map their data-preview → FEATURED idx */
  var siteLeaves=allLeaves.filter(function(l){return l.dataset.mode==='site';});

  var activeSite=0;        /* current FEATURED preview index (0..2) */
  var activeLeafIdx=0;     /* current tree leaf data-idx (0..8) */
  var mode='site';         /* 'site' | 'lib' */

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

  /* ── MODE (a): show a site (accelerator) ── */
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

    if(codeFile)codeFile.textContent=libKey+'.'+(snip.ext||'ts');
    if(ccGlyph)ccGlyph.textContent=snip.glyph||'TS';
    if(crumbName)crumbName.textContent=libKey;
    if(readoutDesc)readoutDesc.textContent=snip.tagline;
    if(readoutCta){readoutCta.href=safeUrl(snip.repo);readoutCta.textContent=(snip.install||'npm i')+' '+libKey+' ↗';}

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
    /* used by tabs + auto-rotation — find the matching site leaf for state */
    var leaf=siteLeaves.filter(function(l){return parseInt(l.dataset.preview,10)===featIdx;})[0];
    showSite(featIdx, leaf?parseInt(leaf.dataset.idx,10):activeLeafIdx);
  }

  /* ── SCROLL-DRIVEN WALK ───────────────────────────────────────────
     The Shipped section is a tall "track" with a pinned IDE stage and 9
     invisible snap steps (.ide-step, data-step 0..8). Scrolling snaps
     step-by-step; an IntersectionObserver maps the most-visible step → the
     matching package (data-idx), opening that folder, closing the rest, and
     driving the preview. No timer — the visitor's scroll IS the walk. */
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
    /* paint the first accelerator without the wipe transition */
    var p=FEATURED[0];
    var front=browserShot.querySelector('.shot-bg-front');
    front.style.clipPath='inset(0 0 0 0)';
    front.style.backgroundImage="url('"+p.screenshot+"')";
    var firstLeaf=siteLeaves[0];
    activeLeafIdx=firstLeaf?parseInt(firstLeaf.dataset.idx,10):0;
    syncActive(activeLeafIdx, 0);
  }

  function buildPreview(){
    initPreview();

    /* the visitor's scroll position drives the package walk (no timer) */
    wireScrollSteps();

    /* editor-tab click → jump to that accelerator's step (scroll-synced) */
    editorTabs.forEach(function(tab){
      tab.addEventListener('click',function(){
        var fi=parseInt(tab.dataset.idx,10);
        selectSiteByPreview(fi);
        scrollToStep(fi);
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
        if(next>=0){e.preventDefault();editorTabs[next].focus();selectSiteByPreview(next);scrollToStep(next);}
      });
    }

    /* EVERY tree leaf (all nine) drives the preview pane — site OR lib.
       Left-click without modifiers updates the in-page preview; the leaf
       keeps its href so cmd/ctrl-click and the keyboard still open the
       real destination in a new tab. */
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
