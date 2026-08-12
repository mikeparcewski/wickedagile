/* ──────────────────────────────────────────────────────────────
   wickedagile — hero terminal
   The runSession() machinery, ported verbatim from the source.
   Refactored to import the shared data module and to boot on
   import (DOMContentLoaded-safe). Powers the hero section only.
   ────────────────────────────────────────────────────────────── */
import { articlesPromise, reposPromise, esc, safeUrl, delay, randInt, randFrom, fmtDate } from './data.js';

function boot(){
  var termOutput=document.getElementById('termOutput');
  var termBody=document.getElementById('termBody');
  var termCursorText=document.getElementById('termCursorText');
  var slashMenu=document.getElementById('slashMenu');
  /* hero markup absent (e.g. another page) — nothing to run */
  if(!termOutput||!termBody||!termCursorText||!slashMenu)return;
  /* phones: the terminal is display:none (mobile kills the interactive), so don't
     run the typing machinery on hidden elements — bail to save CPU/battery. */
  if(window.matchMedia&&window.matchMedia('(max-width:600px)').matches)return;

  /* TERMINAL COPY BANKS */
  var ART_I=['surfacing the latest thinking from the field...','here\'s what\'s been keeping me up at night...','recent dispatches from production.','field notes. unfiltered.','the good stuff. no padding.','things that needed to be written down.','dispatches from the build.','pulled from Medium. the real stuff.'];
  var PRJ_I=['four planes. one platform.','what i\'ve been building.','two skins, one control plane, one catalog, one record.','local-first. agent-native. shipped.','the workshop, exposed.','not seven scattered tools — four planes.','intent in. verified work out.','the wicked platform. current.'];
  var ABT_I=['the human in the loop.','brief history. no padding.','the career, summarized.','who wrote the tools.','the arc.','this is mike.','thirty years, five chapters.','the backstory.'];

  /* TERMINAL */
  function scrollBot(){termBody.scrollTop=termBody.scrollHeight}
  function appendSpan(html){var s=document.createElement('span');s.innerHTML=html;termOutput.appendChild(s);scrollBot()}
  function appendTxt(t){termOutput.appendChild(document.createTextNode(t));scrollBot()}
  function commitLine(html){appendSpan(html+'\n')}
  async function typeOut(text,mpc){mpc=mpc||20;for(var i=0;i<text.length;i++){appendTxt(text[i]);await delay(text[i]==='\n'?8:mpc+randInt(-4,5))}}
  async function typeCmd(text){termCursorText.textContent='';for(var i=0;i<text.length;i++){termCursorText.textContent+=text[i];await delay(52+randInt(-8,14))}}
  function clearCmd(){termCursorText.textContent=''}
  function showMenu(sel){slashMenu.hidden=false;slashMenu.querySelectorAll('.slash-menu-item').forEach(function(el){el.classList.toggle('is-sel',el.dataset.cmd===sel)});scrollBot()}
  function hideMenu(){slashMenu.hidden=true}
  function commitCmd(cmd){commitLine('<span class="t-g">❯</span> <span class="t-y t-b">/'+esc(cmd)+'</span>');clearCmd()}
  var SEP='─'.repeat(42);
  var SPLASH=['','  ┌───────────────────────────────────────────┐','  │                                           │','  │     w i c k e d  ·  a g i l e            │','  │                                           │','  │     ai-native  ·  local-first  ·  v2026   │','  │                                           │','  └───────────────────────────────────────────┘',''];
  async function runSession(){
    for(var i=0;i<SPLASH.length;i++){commitLine('<span class="t-c">'+esc(SPLASH[i])+'</span>');await delay(38)}
    commitLine('<span class="t-d">  the best code tells a story.</span>');
    commitLine('<span class="t-d">  the best stories have architecture.</span>');
    appendTxt('\n');commitLine('<span style="opacity:.2;font-size:.68em">  type / to explore  ·  or watch this run</span>');appendTxt('\n');await delay(1500);
    await typeCmd('/');showMenu('articles');await delay(920);hideMenu();
    await typeCmd('articles');await delay(140);commitCmd('articles');await delay(160);
    await typeOut('\n'+randFrom(ART_I)+'\n\n',17);
    var arts=await Promise.race([articlesPromise,delay(4500).then(function(){return null})]);
    commitLine('<span class="t-d">'+esc(SEP)+'</span>');appendTxt('\n');
    if(arts&&arts.length){
      for(var a=0;a<Math.min(3,arts.length);a++){
        var it=arts[a],dt=fmtDate(it.pubDate);await delay(55);
        commitLine('  <a href="'+esc(safeUrl(it.link))+'" target="_blank" rel="noopener" class="t-y t-b">'+esc(it.title)+'</a>');
        commitLine('  <span class="t-d">'+(dt?dt+' · ':'')+it.readTime+' min read</span>');appendTxt('\n');
      }
    }else{await typeOut('  (visit medium.com/@mike.parcewski)\n\n',15)}
    commitLine('<span class="t-d">'+esc(SEP)+'</span>');appendTxt('\nmore → ');commitLine('<a href="https://medium.com/@mike.parcewski" target="_blank" rel="noopener">medium.com/@mike.parcewski</a>');appendTxt('\n');await delay(1100);
    await typeCmd('/');showMenu('projects');await delay(920);hideMenu();
    await typeCmd('projects');await delay(140);commitCmd('projects');await delay(160);
    await typeOut('\n'+randFrom(PRJ_I)+'\n\n',17);
    /* the FOUR PLANES — curated (the story is the architecture, not the repo
       list); live star counts are merged in only if the GitHub fetch wins the
       3.5s race below — on a slow fetch the readout simply renders without
       counts (no late merge; the typing rhythm never waits on the network). */
    var repos=await Promise.race([reposPromise,delay(3500).then(function(){return null})]);
    var STARS={};(repos||[]).forEach(function(r){STARS[r.name]=r.stargazers_count||0});
    var PLANES=[
      {name:'EXPERIENCE',cls:'t-o',note:'two front doors',items:[
        {label:'wicked-interactive',repo:'wicked-interactive',desc:'creator skin — describe it, watch it build, ship HTML/PDF/decks/video'},
        {label:'studio',suffix:' · ships inside wicked-crew',desc:'coder skin — submit intent, watch the run, answer gates'}]},
      {name:'CONTROL',cls:'t-v',note:'intent in · verified work out',items:[
        {label:'wicked-crew',repo:'wicked-crew',desc:'runs your coding agents as governed workers — evaluator ≠ creator, evidence-gated'}]},
      {name:'CAPABILITY',cls:'t-g',note:'the catalog',items:[
        {label:'wicked-garden',repo:'wicked-garden',desc:'skills + tools agents act through — councils, QE fleet, playbooks. bring your own pack'}]},
      {name:'FOUNDATION',cls:'t-c',note:'the system of record',items:[
        {label:'wicked-estate',repo:'wicked-estate',desc:'code graph (75 languages) + memory + knowledge in one binary — MCP'}]}
    ];
    commitLine('<span class="t-d">'+esc(SEP)+'</span>');appendTxt('\n');
    for(var pi=0;pi<PLANES.length;pi++){
      var pl=PLANES[pi],bar='─'.repeat(Math.max(0,24-pl.name.length));await delay(60);
      commitLine('<span class="'+pl.cls+' t-b">◆ '+esc(pl.name)+' '+bar+'</span> <span class="t-d">'+esc(pl.note)+'</span>');
      for(var r=0;r<pl.items.length;r++){
        var it2=pl.items[r],stars=(it2.repo&&STARS[it2.repo])?'  <span class="t-d">★'+STARS[it2.repo]+'</span>':'';await delay(42);
        commitLine('  <span class="'+pl.cls+' t-b">'+esc(it2.label)+'</span><span class="t-d">'+esc(it2.suffix||'')+'</span>'+stars);
        commitLine('  <span class="t-d">'+esc(it2.desc)+'</span>');
      }
      appendTxt('\n');
    }
    commitLine('<span class="t-d">'+esc(SEP)+'</span>');
    commitLine('<span class="t-d">two skins · one control plane · one catalog · one record</span>');
    appendTxt('all → ');commitLine('<a href="https://github.com/mikeparcewski" target="_blank" rel="noopener">github.com/mikeparcewski</a>');appendTxt('\n');await delay(1000);
    await typeCmd('/');showMenu('about');await delay(920);hideMenu();
    await typeCmd('about');await delay(140);commitCmd('about');await delay(160);
    await typeOut('\n'+randFrom(ABT_I)+'\n\n',17);
    commitLine('<span class="t-c">┌────────────────────────────────────────────┐</span>');
    commitLine('<span class="t-c">│</span>  <span class="t-b">mike parcewski</span>  <span class="t-d">principal architect · accenture</span>  <span class="t-c">│</span>');
    commitLine('<span class="t-c">└────────────────────────────────────────────┘</span>');
    appendTxt('\n');await delay(280);
    var ERAS=[['EARLY YEARS','Commercial internet. Travel tech. Expedia.\nLucky to be in the room when it mattered.'],['SCALE','Financial services. UBS. Singapore Exchange.\nThe tolerance for failure got very small.'],['ARCHITECTURE','Shaping how orgs build, not just what they build.\nWork that survives contact with reality.'],['AI GAP','The gap between demo and production at a global\ninstitution. Org problem. Not a model problem.'],['NOW','A four-plane platform for the problem that was always\nthere. Agents just made it obvious.']];
    for(var k=0;k<ERAS.length;k++){
      var bar='─'.repeat(Math.max(0,40-ERAS[k][0].length-2));
      commitLine('<span class="t-y t-b">◆ '+esc(ERAS[k][0])+' '+bar+'</span>');
      await typeOut('  '+ERAS[k][1].replace(/\n/g,'\n  ')+'\n\n',11);await delay(130);
    }
    appendTxt('\n');commitLine('<span class="t-d">─ session complete · scroll to continue ─</span>');appendTxt('\n');
  }

  runSession();
}

if(document.readyState==='loading'){
  document.addEventListener('DOMContentLoaded',boot);
}else{
  boot();
}
