/* wickedagile.com v3: the map of Learn and Work (DES-SITES-V2 §4.4), with the rev 10 controls (the thread questions,
   the Learn and Work checkboxes, the multi-select type pills, the empty state and Reset, the deep links), the motion
   budget (motion that starts by itself stops within 5 s; the idle tour has a Stop button), the settled status line,
   the family menu and theme switch, the frame fit and the Copy button. Split from the approved mockup's inline script
   (design/mockups/wickedagile-v3.html); the layout code is ours, with no graph library and no request at run time.
   window.__audit is the layout oracle the e2e suites run; window.__map exposes the state and actions they drive. */

(function(){
'use strict';
document.documentElement.classList.remove('no-js');document.documentElement.classList.add('js');
var G=JSON.parse(document.getElementById('graph-data').textContent);
/* draft marks are a render setting (DES §5.1): the data keeps draft: true until the operator approves; production
   builds hide every draft surface (the thread card's chip, "(draft)" and "(Related, draft)", the overview's line) */
var SHOW_DRAFTS=G.showDrafts===true;function isDraft(x){return SHOW_DRAFTS&&!!x&&x.draft===true;}
var NODES=G.nodes,EDGES=G.edges,TH=G.threads,LAY=G.layout,byId={},thById={};
NODES.forEach(function(n){byId[n.id]=n;});TH.forEach(function(t){thById[t.id]=t;});
var LB=G.labels,LEARN=NODES.filter(function(n){return n.door==='learn';}),WORK=NODES.filter(function(n){return n.door==='work';});
var MAPPED=LEARN.filter(function(n){return !n.listOnly;}).concat(WORK);
var adj={};NODES.forEach(function(n){adj[n.id]=[];});EDGES.forEach(function(e,i){e.i=i;adj[e.a].push(e);adj[e.b].push(e);});
var S={learn:true,work:true,off:{},node:null,thread:null,step:0,hover:null,all:false};
/* the map's type pills (rev 10): multi-select, all on by default; each node belongs to exactly one */
/* no Video pill (operator, 2026-11-03, wickedagile#70): a future video lands in Other */
var PILLS=[{id:'article',label:'Article',of:function(n){return n.type==='essay';}},{id:'bit',label:'Bit',of:function(n){return n.type==='bit';}},{id:'repository',label:'Repository',of:function(n){return n.type==='component';}},
 {id:'other',label:'Other',of:function(n){return !(n.type==='essay'||n.type==='bit'||n.type==='component');}}];
var GLYPH={article:'essay',video:'video',bit:'bit',repository:'component',other:'experiment'};
var MQ=window.matchMedia?window.matchMedia('(prefers-reduced-motion: reduce)'):null,reduced=!!(MQ&&MQ.matches);
var stillT=null,stillUntil=0,stillLeft=0,mapIn=false,mapLive=false,lightHeld=false,implicit=false,restoring=false,howOpen=false,M={},FR={from:{mx:null,my:null},to:{mx:null,my:null},e:1},anim=null,lightT=null,pulseRaf=null,tour={on:false,t:null,i:0,idle:null,prev:null};
function $(id){return document.getElementById(id);}
function esc(s){return String(s==null?'':s).replace(/[&<>"]/g,function(c){return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c];});}
function other(e,id){return e.a===id?e.b:e.a;}
function phone(){return window.innerWidth<=760;}
function accent(t){return 'var(--c-'+t.accent+')';}
function fmt(d){if(!d)return '';var m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];var p=d.split('-');return m[+p[1]-1]+' '+(+p[2])+', '+p[0];}
function shortDate(d){return d?fmt(d).replace(/, \d{4}$/,''):'';}
function num(n){return LEARN.indexOf(n)+1;}
function typeFull(n){return n.door==='learn'?G.types[n.type].label:(n.type==='experiment'?'Other, featured':(n.tier==='featured'?'Repository, featured':'Repository'));}
function pillOf(n){for(var i=0;i<PILLS.length;i++)if(PILLS[i].of(n))return PILLS[i].id;return 'other';}
function pillCount(id){return NODES.filter(function(n){return pillOf(n)===id;}).length;}
function offList(){return PILLS.filter(function(p){return S.off[p.id];}).map(function(p){return p.id;});}
function filtered(){return !S.learn||!S.work||offList().length>0;}
function resetFilters(){S.learn=true;S.work=true;S.off={};}
/* ---------------- filters ---------------- */
function learnMatch(n){return !S.off[pillOf(n)];}
function visible(n){return (n.door==='learn'?S.learn:S.work)&&!S.off[pillOf(n)];}
/* ---------------- geometry: grid units to pixels; framing is a focus+context lens on the Learn sky, so nothing leaves the map ---------------- */
function measure(){var g=$('gwrap'),W=g.clientWidth,H=g.clientHeight,ph=phone(),wide=W>=700;
 var rw=ph?92:(wide?212:170),r=ph?5:6.5,workX=W-rw-(ph?10:16)-12,water=ph?24:Math.min(110,W*.09),x0=18,x1=workX-water,padT=ph?30:30,padB=ph?16:26;
 M={W:W,H:H,ph:ph,r:r,workX:workX,x0:x0,x1:x1,padT:padT,padB:padB,ux:(x1-x0)/LAY.cols,uy:(H-padT-padB)/LAY.rows};
 $('shoreR').style.left=(workX-6)+'px';}
function spanMap(b0,b1,size,mag){b0=Math.max(0,b0);b1=Math.min(size,b1);var w=b1-b0;if(w<=0)return null;var w2=Math.min(w*mag,size*0.84,size-0.62*(size-w));if(w2<=w+1e-6)return null;return {b0:b0,b1:b1,w:w,w2:w2,c:(size-w2)/(size-w)};}
function mapv(m,x){if(!m)return x;if(x<m.b0)return x*m.c;if(x<=m.b1)return m.b0*m.c+(x-m.b0)*(m.w2/m.w);return m.b0*m.c+m.w2+(x-m.b1)*m.c;}
function frameFor(t){if(!t)return {mx:null,my:null};var xs=[],ys=[];t.stops.forEach(function(id){var p=LAY.learn[id];if(p){xs.push(p[0]);ys.push(p[1]);}});
 var mxm=M.ph?0.7:0.9,by0=Math.min.apply(null,ys)-0.75,by1=Math.max.apply(null,ys)+(M.ph?1.0:0.85);
 t.stops.forEach(function(id){var p=LAY.learn[id];if(p&&p[2]==='above')by0=Math.min(by0,p[1]-0.95);});
 var mg=M.ph?1.6:1.45;return {mx:spanMap(Math.min.apply(null,xs)-mxm,Math.max.apply(null,xs)+mxm,LAY.cols,mg),my:spanMap(by0,by1,LAY.rows,mg)};}
function fx(x){var a=mapv(FR.from.mx,x),b=mapv(FR.to.mx,x);return a+(b-a)*FR.e;}
function fy(y){var a=mapv(FR.from.my,y),b=mapv(FR.to.my,y);return a+(b-a)*FR.e;}
function gx(x){return M.x0+fx(x)*M.ux;}
function gy(y){return M.padT+fy(y)*M.uy;}
function magnification(){var m=FR.to.mx,n=FR.to.my;return Math.max(m?m.w2/m.w:1,n?n.w2/n.w:1);}
function pos(id){var n=byId[id];if(n.door==='learn'){var p=LAY.learn[id];return {x:gx(p[0]),y:gy(p[1]),side:p[2]};}return {x:M.workX,y:M.padT+LAY.work[id]*M.uy,side:'right'};}
function rd(n){return n.tier==='featured'?(M.ph?8:11):(n.door==='work'?(M.ph?5.5:7):M.r);}
/* ---------------- routes ---------------- */
function legPts(a,b,kind){var A=pos(a),B=pos(b);if(kind==='hv')return [[A.x,A.y],[B.x,A.y],[B.x,B.y]];if(kind==='vh')return [[A.x,A.y],[A.x,B.y],[B.x,B.y]];return [[A.x,A.y],[B.x,B.y]];}
function rounded(pts,rad){var d='M'+pts[0][0].toFixed(1)+' '+pts[0][1].toFixed(1);for(var i=1;i<pts.length;i++){var p=pts[i];if(i<pts.length-1){var a=pts[i-1],n=pts[i+1];
  var l1=Math.hypot(p[0]-a[0],p[1]-a[1])||1,l2=Math.hypot(n[0]-p[0],n[1]-p[1])||1,k=Math.min(rad,l1/2,l2/2);
  var p1=[p[0]+(a[0]-p[0])/l1*k,p[1]+(a[1]-p[1])/l1*k],p2=[p[0]+(n[0]-p[0])/l2*k,p[1]+(n[1]-p[1])/l2*k];
  d+=' L'+p1[0].toFixed(1)+' '+p1[1].toFixed(1)+' Q'+p[0].toFixed(1)+' '+p[1].toFixed(1)+' '+p2[0].toFixed(1)+' '+p2[1].toFixed(1);}else d+=' L'+p[0].toFixed(1)+' '+p[1].toFixed(1);}return d;}
function legD(a,b,kind){if(kind==='water'){var A=pos(a),B=pos(b),xw=M.x1+4,dx=B.x-xw;return 'M'+A.x.toFixed(1)+' '+A.y.toFixed(1)+' L'+xw.toFixed(1)+' '+A.y.toFixed(1)+' C'+(xw+dx*.55).toFixed(1)+' '+A.y.toFixed(1)+' '+(B.x-dx*.55).toFixed(1)+' '+B.y.toFixed(1)+' '+B.x.toFixed(1)+' '+B.y.toFixed(1);}
 return rounded(legPts(a,b,kind),12);}
function threadD(t,upto){var st=t.stops,n=upto==null?st.length:Math.min(upto,st.length),d='';for(var k=1;k<n;k++){d+=(d?' ':'')+legD(st[k-1],st[k],t.legs[k-1]);}return d;}
/* ---------------- render ---------------- */
function labelHTML(n){if(n.door==='learn')return '<span class="txt">'+esc(n.mapLabel)+'</span><span class="num">'+num(n)+'</span>';
 var tag=n.id==='studio'?esc(n.eyebrow)+'<br>'+esc(n.expansion||''):esc(n.type==='experiment'?n.eyebrow:n.tag);
 var name=M.ph?n.title.replace('wicked-','').replace('Wicked AI ',''):n.title;return '<b>'+esc(name)+'</b><small>'+tag+'</small>'+(n.badge?'<span class="badgex'+(n.type==='experiment'?' keep':'')+'">'+esc(n.badge)+'</span>':'');}
function plural(n,w){return n+' '+w+(n===1?'':'s');}
function tl(k){return G.types[k].label.toLowerCase();}
function counts(t){var c={essay:0,bit:0,video:0},mins=0,untimed=0;t.stops.forEach(function(id){var n=byId[id];if(n.door!=='learn')return;c[n.type]++;if(n.type==='essay'){if(n.mins)mins+=n.mins;else untimed++;}});
 var parts=[];if(c.essay)parts.push(plural(c.essay,tl('essay')));if(c.bit)parts.push(plural(c.bit,tl('bit')));if(c.video)parts.push(plural(c.video,tl('video')));
 var land=t.stops.filter(function(id){return byId[id].door==='work';}).map(function(id){return byId[id].title;});
 return {c:c,mins:mins,untimed:untimed,land:land,line:parts.join(', ')+' · '+mins+' min'+(untimed?' + '+untimed+' untimed':'')+' · '+(land.length?'lands in '+LB.work+': '+land.map(function(x){return x.replace('wicked-','');}).join(', '):'stays in '+LB.learn)};}
function aria(n){var s=typeFull(n)+': '+n.title;if(n.id==='studio')s+=', the ADE, agentic development environment';else if(n.eyebrow)s+=', '+n.eyebrow;if(n.badge)s+=', '+n.badge;return s+(/[.?!]$/.test(s)?' ':'. ')+(n.threads.length?'In '+n.threads.length+' thread'+(n.threads.length>1?'s':'')+'.':'No links.');}
function build(){
 var h='';MAPPED.forEach(function(n){h+='<button type="button" aria-controls="panel" aria-pressed="false" class="st '+n.door+(n.tier==='featured'?' featured':'')+(n.threads.length>1?' cross':'')+'" data-id="'+esc(n.id)+'" style="--rd:'+rd(n)+'px" aria-label="'+esc(aria(n))+'"><span class="dot '+n.type+'"></span><span class="lab">'+labelHTML(n)+'</span></button>';});
 $('stations').innerHTML=h+TH.map(function(t){var last=byId[t.stops[t.stops.length-1]];return last.door==='learn'&&last.threads.length<2?'<span class="endbar" data-end="'+t.id+'"></span>':'';}).join('');
 var s='<g id="hulls"></g>';TH.forEach(function(t){s+='<path class="route" data-t="'+t.id+'" stroke="'+accent(t)+'"/>';if(!reduced)s+='<path class="ambient" data-t="'+t.id+'" stroke="'+accent(t)+'" style="animation-delay:-'+(TH.indexOf(t)*1.7)+'s"/>';s+='<path class="lit-route" data-t="'+t.id+'" stroke="'+accent(t)+'"/>';});
 $('svg').innerHTML=s+'<g id="nedges"></g>';if(window.__hy)__hy($('stations'));
 $('tcards').innerHTML=TH.map(function(t){var c=counts(t);return '<button type="button" class="tcard" data-thread="'+t.id+'" aria-pressed="false" style="--tc:'+accent(t)+'"><b>'+esc(t.name)+'</b><span class="h">'+esc(t.hook)+'</span><span class="c">'+esc(c.line)+'</span></button>';}).join('');}
function partial(t){return t.stops.some(function(id){return !visible(byId[id]);});}
function rel(el){var g=$('gwrap').getBoundingClientRect(),r=el.getBoundingClientRect();return {l:r.left-g.left,t:r.top-g.top,r:r.right-g.left,b:r.bottom-g.top};}
function drawHulls(){var h='',st=$('stations');TH.forEach(function(t){var rs='';t.stops.forEach(function(id){var b=st.querySelector('.st[data-id="'+id+'"]');if(!b)return;var p=pos(id),k=rd(byId[id])+(M.ph?4:6);if(b.classList.contains('off'))return;
   rs+='<rect x="'+(p.x-k).toFixed(1)+'" y="'+(p.y-k).toFixed(1)+'" width="'+(2*k).toFixed(1)+'" height="'+(2*k).toFixed(1)+'" rx="'+k.toFixed(1)+'"/>';var lr=rel(b.querySelector('.lab'));
   var hp=M.ph?3:6;rs+='<rect x="'+(lr.l-hp).toFixed(1)+'" y="'+(lr.t-hp).toFixed(1)+'" width="'+(lr.r-lr.l+2*hp).toFixed(1)+'" height="'+(lr.b-lr.t+2*hp).toFixed(1)+'" rx="'+(M.ph?7:10)+'"/>';});
  h+='<g class="hullg'+(partial(t)?' part':'')+'" data-t="'+t.id+'" style="color:'+accent(t)+'">'+rs+'<path d="'+threadD(t)+'"/></g>';});
 $('hulls').innerHTML=h;}
function place(){
 var inst=!$('gwrap').classList.contains('moving'),sts=$('stations').querySelectorAll('.st');if(inst)[].forEach.call(sts,function(b){b.style.transition='none';});
 [].forEach.call(sts,function(b){var id=b.getAttribute('data-id'),p=pos(id),lab=b.querySelector('.lab'),off=M.ph?12:16;b.style.left=p.x+'px';b.style.top=p.y+'px';
  lab.style.left=lab.style.right=lab.style.top=lab.style.bottom=lab.style.transform='';var side=p.side;
  if(side==='below'){lab.style.top=(11+off-1)+'px';lab.style.left='11px';lab.style.transform='translateX(-50%)';lab.style.textAlign='center';}
  else if(side==='above'){lab.style.bottom=(11+off-1)+'px';lab.style.left='11px';lab.style.transform='translateX(-50%)';lab.style.textAlign='center';}
  else if(side==='left'){lab.style.right=(11+off)+'px';lab.style.top='11px';lab.style.transform='translateY(-50%)';lab.style.textAlign='right';}
  else {lab.style.left=(11+rd(byId[id])+10)+'px';lab.style.top='11px';lab.style.transform='translateY(-50%)';lab.style.textAlign='left';}});
 TH.forEach(function(t){var d=threadD(t);[].forEach.call($('svg').querySelectorAll('.route[data-t="'+t.id+'"],.ambient[data-t="'+t.id+'"]'),function(p){p.setAttribute('d',d);});
  var last=t.stops[t.stops.length-1];var eb=$('stations').querySelector('[data-end="'+t.id+'"]');if(eb){var p=pos(last);eb.style.left=(p.x+18)+'px';eb.style.top=p.y+'px';}});
 if(inst){void $('stations').offsetWidth;[].forEach.call(sts,function(b){b.style.transition='';});drawHulls();}
 syncTab();litRoute();}
function syncTab(){
 [].forEach.call($('stations').querySelectorAll('.st'),function(b){b.tabIndex=b.classList.contains('off')?-1:0;});}
/* ---------------- hover: draw the real neighbourhood edges, each on a curve that clears every label, badge and mark ---------------- */
function obstacles(skip){var out=[];[].forEach.call(document.querySelectorAll('#stations .st'),function(st){var id=st.getAttribute('data-id'),l=st.querySelector('.lab'),cs=getComputedStyle(l);
  if(cs.visibility!=='hidden'&&!st.classList.contains('off')){var r=rel(l);r.pad=6;out.push(r);}
  if(skip.indexOf(id)<0){var p=pos(id),k=rd(byId[id])+5;out.push({l:p.x-k,t:p.y-k,r:p.x+k,b:p.y+k,pad:2});}});
 [].forEach.call(document.querySelectorAll('#gwrap .shore'),function(b){if(getComputedStyle(b).opacity>0.05){var r=rel(b);r.pad=6;out.push(r);}});return out;}
function clearCurve(A,B,obs){var dx=B.x-A.x,dy=B.y-A.y,L=Math.hypot(dx,dy)||1,nx=-dy/L,ny=dx/L,offs=[0,.22,-.22,.42,-.42,.62,-.62];
 var N=Math.max(40,Math.ceil(L*1.6/3));
 for(var c=0;c<offs.length;c++){var cx=(A.x+B.x)/2+nx*offs[c]*L,cy=(A.y+B.y)/2+ny*offs[c]*L,ok=true;
  for(var i=1;i<N&&ok;i++){var u=i/N,x=(1-u)*(1-u)*A.x+2*(1-u)*u*cx+u*u*B.x,y=(1-u)*(1-u)*A.y+2*(1-u)*u*cy+u*u*B.y;
   if(x<2||y<2||x>M.W-2||y>M.H-2){ok=false;break;}
   if(Math.hypot(x-A.x,y-A.y)<A.r||Math.hypot(x-B.x,y-B.y)<B.r)continue;
   for(var k=0;k<obs.length;k++){var o=obs[k];if(x>o.l-o.pad&&x<o.r+o.pad&&y>o.t-o.pad&&y<o.b+o.pad){ok=false;break;}}}
  if(ok)return 'M'+A.x.toFixed(1)+' '+A.y.toFixed(1)+' Q'+cx.toFixed(1)+' '+cy.toFixed(1)+' '+B.x.toFixed(1)+' '+B.y.toFixed(1);}
 return null;}
function drawNeighbours(){var box=$('nedges');if(!box)return;var id=S.hover;if(!id||$('gwrap').classList.contains('moving')){box.innerHTML='';return;}
 var obs=obstacles([id]),A=pos(id),h='',shown=0;A.r=rd(byId[id])+3;
 adj[id].forEach(function(e){var o=other(e,id),on=byId[o];if(!visible(on)||on.listOnly)return;var B=pos(o);B.r=rd(on)+3;var ob=obs.filter(function(x){return true;});
  var obB=obstacles([id,o]);var d=clearCurve(A,B,obB);if(d){h+='<path class="nedge '+e.kind+'" data-a="'+id+'" data-b="'+o+'" d="'+d+'"/>';shown++;}});
 box.innerHTML=h;}
/* ---------------- state to classes ---------------- */
function apply(){
 var g=$('gwrap'),t=S.thread?thById[S.thread]:null,focus=S.hover||S.node;
 g.classList.toggle('framed',!!t);g.classList.toggle('hovering',!!S.hover&&!t);
 var near={},nearT={};if(focus){near[focus]=1;adj[focus].forEach(function(e){near[other(e,focus)]=1;});(byId[focus].threads||[]).forEach(function(x){nearT[x]=1;});}
 var mem={},lit={};if(t){t.stops.forEach(function(id){mem[id]=1;});t.stops.slice(0,S.step).forEach(function(id){lit[id]=1;});}
 [].forEach.call(g.querySelectorAll('.st'),function(b){var id=b.getAttribute('data-id'),v=visible(byId[id]);
  b.classList.toggle('off',!v);b.toggleAttribute('inert',!v);b.classList.toggle('hov',S.hover===id);b.classList.toggle('near',!!(S.hover&&near[id]&&S.hover!==id));b.setAttribute('aria-pressed',S.node===id?'true':'false');b.classList.toggle('sel',S.node===id);
  b.classList.toggle('dimmed',!!(t&&!mem[id]));b.classList.toggle('away',!!(t&&!mem[id]));
  b.classList.toggle('lit',!!lit[id]);b.classList.toggle('cur',!!(t&&t.stops[S.step-1]===id));
  if(t)b.style.setProperty('--pc',accent(t));else b.style.removeProperty('--pc');
  var nm=b.querySelector('.lab .num');if(nm){var si=t?t.stops.indexOf(id):-1;nm.textContent=si>=0?String(si+1):String(num(byId[id]));b.setAttribute('aria-label',(M.ph?nm.textContent+'. ':'')+aria(byId[id]));}});
 [].forEach.call(g.querySelectorAll('.route,.hullg'),function(p){var id=p.getAttribute('data-t');p.classList.toggle('on',!!(t&&t.id===id));p.classList.toggle('near',!!nearT[id]);});
 syncTab();
 [].forEach.call($('tcards').querySelectorAll('.tcard'),function(b){var on=S.thread===b.getAttribute('data-thread');b.setAttribute('aria-pressed',on);if(on&&phone()){var row=$('tcards'),x=b.offsetLeft-16;if(Math.abs(row.scrollLeft-x)>4){tcSelf=true;row.scrollTo({left:x,behavior:reduced?'auto':'smooth'});}}});
 if(t)$('pulse').style.setProperty('--pc',accent(t));
 /* the index lists follow the filters */
 var shownL=0;[].forEach.call(document.querySelectorAll('#learn [data-node],#work [data-node]'),function(li){var n=byId[li.getAttribute('data-node')];var v=n.door!=='learn'||learnMatch(n);li.hidden=!v;if(v&&n.door==='learn')shownL++;});
 var lf=PILLS.some(function(p){return S.off[p.id]&&LEARN.some(function(n){return p.of(n);});}),sa=$('showAll');$('ed').classList.toggle('all',!!S.all||lf);sa.hidden=lf;sa.setAttribute('aria-expanded',String(!!S.all));sa.textContent=S.all?'Show fewer':'Show all '+LEARN.length;var ln=$('learnNote');if(lf&&shownL){var nt='Filtered: '+shownL+' of '+LEARN.length+' shown.';if(ln.hidden||ln.getAttribute('data-t')!==nt){ln.setAttribute('data-t',nt);ln.innerHTML=nt+' <button type="button" id="resetF2">Clear filters</button>';}ln.hidden=false;}else{ln.hidden=true;ln.removeAttribute('data-t');}
 var em=$('learnEmpty');em.hidden=!(lf&&!shownL);$('ed').hidden=lf&&!shownL;if(!em.hidden)em.querySelector('p').textContent='Nothing in '+LB.learn+' matches these filters.';
 var anyMap=MAPPED.some(visible);$('mapEmpty').hidden=anyMap;
 if(!g.classList.contains('moving')&&$('hulls'))drawHulls();[].forEach.call($('svg').querySelectorAll('.route,.ambient'),function(p){p.classList.toggle('part',partial(thById[p.getAttribute('data-t')]));});syncTab();litRoute();drawNeighbours();panel();}
function litRoute(){[].forEach.call($('svg').querySelectorAll('.lit-route'),function(p){var t=thById[p.getAttribute('data-t')];var on=S.thread===t.id&&S.step>1;p.classList.toggle('on',on);p.setAttribute('d',on?threadD(t,S.step):'');});runPulse();}
function runPulse(){cancelAnimationFrame(pulseRaf);var pu=$('pulse'),p=S.thread&&$('svg').querySelector('.lit-route.on');if(!p||reduced||!mapLive){pu.classList.remove('on');pu.style.opacity='';return;}
 var len=p.getTotalLength();if(!len){pu.classList.remove('on');return;}pu.classList.add('on');var t0=performance.now();
 (function tick(now){if(now-t0>5000){pu.classList.remove('on');pu.style.opacity='';return;}var L=((now-t0)*0.16)%(len+60);var q=p.getPointAtLength(Math.min(L,len));pu.style.transform='translate('+q.x.toFixed(1)+'px,'+q.y.toFixed(1)+'px)';pu.style.opacity=L>len?Math.max(0,1-(L-len)/60):1;pulseRaf=requestAnimationFrame(tick);})(t0);}
/* ---------------- panel ---------------- */
function legend(){return '<div class="legend"><i class="gl glyph essay"></i><span>'+esc(G.types.essay.label)+' (Medium)</span><i class="gl glyph bit"></i><span>Bit (interactive)</span><i class="gl glyph component"></i><span>Lab, in '+esc(LB.work)+' (larger: featured)</span><i class="gl glyph experiment"></i><span>Experiment</span><i class="gl glyph cross"></i><span>Crossroads: in more than one thread</span></div>';}
function linkOut(n){if(!n||!n.url)return '';var l=n.type==='essay'?'Read on Medium ↗':n.type==='bit'?'Try it ↗':n.type==='video'?'Watch ↗':'Open in the lab ↗';return '<a class="btn small primary" target="_blank" rel="noopener" href="'+esc(n.url)+'">'+l+'<span class="sr"> (opens in a new tab)</span></a>';}
function moreBtn(){return '<button type="button" class="btn small mob" id="moreBtn" aria-expanded="'+($('panel').classList.contains('sheet')?'true':'false')+'" aria-controls="panel">'+($('panel').classList.contains('sheet')?'Close details':'Details')+'</button>';}
function threadCard(t){var c=counts(t),last=S.step===t.stops.length,cur=byId[t.stops[Math.max(0,S.step-1)]],door=null;
 var items=t.stops.map(function(id,k){var x=byId[id],head='';if(x.door!==door){door=x.door;head='<li class="dh">'+esc(door==='learn'?LB.learn:LB.work)+'</li>';}return head+'<li class="'+(k<S.step-1?'done':k===S.step-1?'now':'')+'"><span class="d">'+(k+1)+'</span>'+esc(x.title)+(x.door==='learn'?(x.date?'<span class="sd">'+shortDate(x.date)+'</span>':''):legLabel(id,t.stops[k-1]))+'</li>';}).join('');
 return '<button type="button" class="map-ib pclear mob" id="pClear" aria-label="Clear the thread"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg></button><div class="k" style="--tc:'+accent(t)+'"><i class="tc"></i>Thread · stop '+S.step+' of '+t.stops.length+(isDraft(t)?' <span class="draft" title="Draft for operator approval">Draft</span>':'')+'</div>'+
  '<h2 class="tname">'+esc(t.name)+'</h2><p class="hook">'+esc(t.hook)+'</p>'+
  '<p class="meta cnt">'+[c.c.essay?plural(c.c.essay,tl('essay')):'',c.c.bit?plural(c.c.bit,tl('bit')):'',c.c.video?plural(c.c.video,tl('video')):''].filter(Boolean).join(' · ')+' · '+c.mins+' min to read'+(c.untimed?' + '+c.untimed+' untimed':'')+'</p>'+
  '<p class="meta mob stopsl">'+t.stops.map(function(id,k){var x=byId[id];return (k+1)+' '+esc(x.door==='learn'?x.mapLabel:x.title.replace('wicked-',''));}).join(' · ')+'</p>'+(c.land.length?'<p class="meta mob land">Lands in '+esc(LB.work)+': '+esc(c.land.map(function(x){return x.replace('wicked-','');}).join(', '))+'</p>':'<p class="end">This thread stays in '+esc(LB.learn)+'.</p>')+
  '<ol class="stops more">'+items+'</ol>'+
  '<div class="acts"><button type="button" class="map-ib" id="tPrev" aria-label="Previous stop"'+(S.step<=1?' disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 6l-6 6 6 6"/></svg></button><button type="button" class="map-ib" id="tNext" aria-label="Next stop"'+(last?' disabled':'')+'><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 6l6 6-6 6"/></svg></button>'+linkOut(cur)+moreBtn()+'<button type="button" class="btn small more qdup" id="clearThread">All threads</button>'+(tour.on?'<button type="button" class="btn small" id="stopTour">Stop the tour</button>':'')+'</div>';}
function legLabel(id,prev){var e=prev?adj[id].filter(function(x){return other(x,id)===prev;})[0]:null;if(e&&e.kind==='lab')return ' (in the lab)';if(e&&e.kind==='related')return isDraft(e)?' (Related, draft)':' (Related)';return ' (Related)';}
var FULLCONS=null;   /* the node whose whole neighbour list the reader asked for ("and N more") */
function nodeCard(n){var ths=n.threads||[];var cons=adj[n.id].filter(function(e){return visible(byId[other(e,n.id)]);});
 if(n.type==='experiment')return '<div class="k"><i class="glyph experiment" aria-hidden="true"></i>'+esc(LB.work)+' · Featured</div><h2>'+esc(n.title)+'</h2><p class="meta">'+esc(n.eyebrow)+'</p><div class="counts"><span class="chip">'+esc(n.badge)+'</span></div><div class="acts"><button type="button" class="btn small" id="clearSel">Close</button></div>';
 var short=M.H<450,cap=FULLCONS===n.id?99:(ths.length>1?(short?1:2):(short?2:3)),list=function(k){return cons.slice(0,k).map(function(e){var o=byId[other(e,n.id)];var lab=e.kind==='lab'?'<span class="el">In the lab</span><span>'+esc(e.sentence)+'</span>':'<span class="el">'+esc(e.label)+(isDraft(e)?' (draft)':'')+'</span><span>'+esc(o.title)+'</span>';return '<li><button type="button" class="nb" data-pick="'+esc(o.id)+'">'+lab+'</button></li>';}).join('');};
 return '<div class="k"><i class="glyph '+n.type+'" aria-hidden="true"></i>'+esc(n.door==='learn'?LB.learn:LB.work)+' · '+esc(typeFull(n))+(n.id==='studio'?' · '+esc(n.eyebrow):'')+'</div><h2>'+esc(n.title)+'</h2>'+
  '<p class="more">'+esc(n.summary)+'</p>'+(n.door==='learn'?'<p class="meta pmeta">'+(n.date?esc(fmt(n.date))+(n.mins?' · '+esc(n.mins)+' min read':''):'bits.wickedagile.com')+'</p>':'<p class="meta pmeta">'+(n.id==='studio'?esc(n.eyebrow)+': '+esc(n.expansion)+' · ':esc(n.tag)+' · ')+'v'+esc(n.ver)+'</p>')+
  (ths.length>1?'<h3>This piece is in '+ths.length+' threads</h3><ul class="jumps">'+ths.map(function(x){var tt=thById[x];return '<li><button type="button" class="jump" data-jump="'+x+'" style="--tc:'+accent(tt)+'"><i></i>'+esc(tt.name)+'</button></li>';}).join('')+'</ul>':(ths.length===1?'<p class="meta">In the thread '+esc(thById[ths[0]].name)+'.</p>':''))+
  (cons.length?'<div class="more shr"><h3>Shares a topic or a link with</h3><ul>'+list(cap)+'</ul>'+(cons.length>cap?'<button type="button" class="linkbtn" id="allCons">and '+(cons.length-cap)+' more</button>':'')+'</div><div class="fl"><h3>All of them</h3><ul>'+list(99)+'</ul></div>':'')+
  '<div class="acts">'+linkOut(n)+moreBtn()+'<button type="button" class="btn small" id="clearSel">Close</button></div>';}
function filterCard(){var ms=MAPPED.filter(visible);   /* marks on the map (a list-only piece has none) */var what=[!S.learn?LB.learn+' off':'',!S.work?LB.work+' off':''].concat(offList().map(function(id){return PILLS.filter(function(p){return p.id===id;})[0].label+' off';})).filter(Boolean).join(' · ');
 var li=function(k){return ms.slice(0,k).map(function(x){return '<li><button type="button" class="nb" data-pick="'+esc(x.id)+'"><span class="el">'+esc(typeFull(x))+'</span><span>'+esc(x.title)+'</span></button></li>';}).join('');};
 return '<div class="k">Filtered · '+esc(what)+'</div><h2>'+ms.length+' of '+MAPPED.length+' marks shown</h2><ul class="more">'+li(5)+'</ul>'+(ms.length>5?'<p class="meta more">and '+(ms.length-5)+' more, in the lists below</p>':'')+'<div class="fl"><ul>'+li(99)+'</ul></div><div class="acts">'+moreBtn()+'<button type="button" class="btn small" id="resetF">Clear filters</button></div>';}
function focusKey(){var a=document.activeElement,p=$('panel');if(!a||!p.contains(a))return null;if(a===p)return 'panel';if(a.id)return '#'+a.id;if(a.tagName==='A'&&a.getAttribute('href'))return 'a[href="'+a.getAttribute('href').replace(/"/g,'\\"')+'"]';var ks=['data-jump','data-pick'];for(var i=0;i<ks.length;i++)if(a.hasAttribute(ks[i]))return '['+ks[i]+'="'+a.getAttribute(ks[i])+'"]';return 'panel';}
/* one short line for screen readers when the selection, the thread, its stop or the filters change; settled for 700 ms so a
   route lighting stop by stop, or the tour, says one thing, not ten */
var IDLE_SAY='Nothing selected on the map.',annT=null,annMsg=null,annLast=IDLE_SAY;
function announce(n,t){var vis=MAPPED.filter(visible).length,msg=n?n.title:t?t.name+', stop '+S.step+' of '+t.stops.length:filtered()?vis+' of '+MAPPED.length+' marks shown':IDLE_SAY;
 if(tour.on)return;clearTimeout(annT);annMsg=msg;annT=setTimeout(sayNow,700);}
/* the pending status line is said at once when the map is held, never later while the reader is elsewhere */
function sayNow(){clearTimeout(annT);annT=null;var msg=annMsg;annMsg=null;if(msg!==null&&msg!==annLast){annLast=msg;$('mapStatus').textContent=msg;}}
function panel(){var p=$('panel'),t=S.thread?thById[S.thread]:null,n=S.node?byId[S.node]:null,h='',fk=focusKey();
 if(n)h=nodeCard(n);
 else if(t)h=threadCard(t);
 else if(filtered())h=filterCard();
 else h='<div class="k">The map</div><h2>'+TH.length+' threads through '+LEARN.length+' pieces</h2><p class="more">'+esc(LB.learn)+' is on the left and '+esc(LB.work)+' is on the right. Pick a question above, or hover a piece to see what it shares.</p><p class="mob">Swipe the questions above; tap a number for its piece (the list below has the same numbers).</p><details class="howto more"'+(howOpen?' open':'')+'><summary>How to read the map</summary>'+legend()+'<p class="meta">A ringed mark is a crossroads, in more than one thread.</p></details>'+(TH.some(isDraft)?'<p class="meta more">Thread names and hooks are drafts for the operator.</p>':'')+'<div class="acts">'+moreBtn()+'</div>';
 p.classList.toggle('idle',!n&&!t&&!filtered());p.innerHTML=h;announce(n,t);if(fk){var el=fk==='panel'?null:p.querySelector(fk);(el&&!el.disabled?el:p).focus({preventScroll:true});}}
/* ---------------- frame animation (labels, badges and hulls hidden while the lens moves) ---------------- */
/* off screen the lens jumps (no glide, no transition): nothing moves where nobody can see it */
function jumpTo(to){var g=$('gwrap'),els=$('stations').querySelectorAll('.st,.endbar');cancelAnimationFrame(anim);[].forEach.call(els,function(b){b.style.transition='none';});
 FR={from:to,to:to,e:1};g.classList.remove('moving');place();void g.offsetWidth;[].forEach.call(els,function(b){b.style.transition='';});drawNeighbours();}
function frameTo(t,instant){var to=frameFor(t),g=$('gwrap');cancelAnimationFrame(anim);
 if(!mapLive&&!instant&&!reduced&&FR.to){jumpTo(to);return;}
 if(instant||reduced||!FR.to){FR={from:to,to:to,e:1};g.classList.remove('moving');place();return;}
 FR={from:FR.to,to:to,e:0};g.classList.add('moving');var t0=performance.now(),D=520,els=$('stations').querySelectorAll('.st,.endbar');
 [].forEach.call(els,function(b){b.style.transition='none';});
 (function step(now){var k=Math.min(1,(now-t0)/D);FR.e=1-Math.pow(1-k,3);place();
  if(k<1)anim=requestAnimationFrame(step);else{[].forEach.call(els,function(b){b.style.transition='';});FR={from:to,to:to,e:1};g.classList.remove('moving');place();drawNeighbours();}})(t0);}
/* ---------------- actions ---------------- */
function clearLight(){clearInterval(lightT);lightT=null;lightHeld=false;}
function lightTick(){if(!S.thread||S.step>=thById[S.thread].stops.length){clearLight();lightT=null;return;}S.step++;apply();if(!tour.on)sync();}
function lightUp(){clearLight();lightT=null;lightHeld=false;var t=thById[S.thread];if(!t)return;if(reduced){S.step=t.stops.length;apply();return;}
 S.step=1;apply();if(mapLive)lightT=setInterval(lightTick,420);else lightHeld=true;}
/* off screen (under a quarter of the map showing) or in a hidden tab, a thread lighting up holds on its stop and the
   pulse along it ends; back on screen the lighting carries on from that stop. Nothing here moves the page. */
/* one-shot animations (the routes drawing in) land on their end; the drift and the twinkle still (.still) */
function settleAnims(el){if(!el||!el.getAnimations)return;el.getAnimations({subtree:true}).forEach(function(a){var t=a.effect&&a.effect.getComputedTiming?a.effect.getComputedTiming():null;if(t&&t.endTime!==Infinity&&a.playState==='running'){try{a.finish();}catch(e){}}});}
var STEPS=[];for(var si=0;si<=100;si++)STEPS.push(si/100);
function mapHold(){var g=$('gwrap');if(g.classList.contains('moving'))jumpTo(FR.to);if(annT)sayNow();
 if(stillT){clearTimeout(stillT);stillT=null;stillLeft=Math.max(0,stillUntil-Date.now());}g.classList.add('still');if(lightT){clearLight();lightT=null;lightHeld=true;}cancelAnimationFrame(pulseRaf);var pu=$('pulse');if(pu.classList.contains('on')){pu.classList.remove('on');pu.style.opacity='';}settleAnims(g);requestAnimationFrame(function(){if(!mapLive)settleAnims(g);});}
function mapResume(){if(mapIn&&stillLeft>0){var g=$('gwrap');g.classList.remove('still');stillUntil=Date.now()+stillLeft;stillT=setTimeout(function(){stillT=null;g.classList.add('still');},stillLeft);stillLeft=0;}
 if(lightHeld){lightHeld=false;if(!lightT&&!reduced)lightT=setInterval(lightTick,420);}}
function chooseThread(id,opts){opts=opts||{};if(!opts.keepImplicit)implicit=false;S.thread=id||null;S.node=null;S.step=id?Math.min(S.step||1,thById[id].stops.length):0;if(id&&!opts.keepFilters)resetFilters();
 frameTo(id?thById[id]:null,opts.instant);if(id&&opts.step){clearLight();S.step=opts.step;apply();}else if(id)lightUp();else{clearLight();S.step=0;apply();}
 if(!tour.on)sync();controls();}
function select(id){S.node=id;var left=false;if(id&&S.thread&&thById[S.thread].stops.indexOf(id)<0){S.thread=null;S.step=0;frameTo(null);left=true;}apply();if(left)controls();sync();}
function filterChanged(){if(S.thread){S.thread=null;S.step=0;clearLight();frameTo(null);}if(S.node&&!visible(byId[S.node]))S.node=null;apply();controls();sync();}
var CHK='<svg viewBox="0 0 24 24" fill="none" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>';
/* each side's mark, from the hero's braid: Learn's strand, Work's route into a component */
var SIDEMARK={learn:'<svg class="mk" viewBox="0 0 40 16" aria-hidden="true" focusable="false"><path class="mkl" pathLength="1" d="M2 12C9 2 15 2 20 8S31 14 38 4"/></svg>',
 work:'<svg class="mk" viewBox="0 0 40 16" aria-hidden="true" focusable="false"><path class="mkl" pathLength="1" d="M2 8L25 8"/><rect class="mks" x="27" y="3" width="10" height="10" rx="2.5"/></svg>'};
function buildControls(){
 var nL=LEARN.length,nW=WORK.length;
 $('controls').innerHTML='<div class="cbxs">'+[['learn',LB.learn,nL],['work',LB.work,nW]].map(function(d){return '<label class="cbx" data-door="'+d[0]+'"><input type="checkbox" id="cb-'+d[0]+'" checked><span class="box" aria-hidden="true">'+CHK+'</span>'+SIDEMARK[d[0]]+'<span class="t">'+esc(d[1])+'</span><span class="n"><span class="sr">, </span>'+d[2]+'<span class="sr"> pieces</span></span></label>';}).join('')+'</div>'+
  '<div class="pills" role="group" aria-label="Type">'+PILLS.map(function(p){var c=pillCount(p.id);return c?'<button type="button" class="pill" data-pill="'+p.id+'" aria-pressed="true"><i class="glyph '+GLYPH[p.id]+'" aria-hidden="true"></i>'+esc(p.label)+'<span class="n" aria-hidden="true">'+c+'</span></button>':
   '<button type="button" class="pill" data-pill="'+p.id+'" disabled aria-pressed="false"><i class="glyph '+GLYPH[p.id]+'" aria-hidden="true"></i>'+esc(p.label)+'<span class="ny">none yet</span></button>';}).join('')+'</div>';
 $('qrow').innerHTML=TH.map(function(t){return '<button type="button" class="q" data-thread="'+t.id+'" aria-pressed="false" style="--tc:'+accent(t)+'"><i aria-hidden="true"></i>'+esc(t.name)+'</button>';}).join('')+'<button type="button" class="qclear" id="qClear" aria-label="Clear the thread" hidden>Clear<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18"/></svg></button>';}
function controls(){
 ['learn','work'].forEach(function(d){var cb=$('cb-'+d);cb.checked=!!S[d];cb.closest('.cbx').classList.toggle('on',!!S[d]);});
 [].forEach.call(document.querySelectorAll('.pill[data-pill]'),function(b){if(b.disabled)return;var on=!S.off[b.getAttribute('data-pill')];b.setAttribute('aria-pressed',String(on));});
 [].forEach.call(document.querySelectorAll('.q'),function(b){b.setAttribute('aria-pressed',String(S.thread===b.getAttribute('data-thread')));});
 $('qClear').hidden=!S.thread;}
function previewThread(id){var g=$('gwrap');g.classList.toggle('preview',!!id);[].forEach.call(g.querySelectorAll('.route,.hullg'),function(p){p.classList.toggle('pv',p.getAttribute('data-t')===id);});}
function sync(hash){if(restoring)return;var q=new URLSearchParams(location.search),keep=q.get('theme'),u=new URLSearchParams();q.forEach(function(v,k){if(['learn','work','off','node','thread','step','theme','door','type','topic','hero'].indexOf(k)<0)u.set(k,v);});
 if(!S.learn)u.set('learn','0');if(!S.work)u.set('work','0');if(offList().length)u.set('off',offList().join(','));if(S.node)u.set('node',S.node);if(S.thread&&!(implicit&&!mapIn)){u.set('thread',S.thread);u.set('step',S.step);}
 if(keep)u.set('theme',keep);
 var s=u.toString();try{history.replaceState(null,'',location.pathname+(s?'?'+s:'')+(hash!=null?hash:location.hash));}catch(x){}}
function readURL(){var q=new URLSearchParams(location.search);resetFilters();
 if(q.get('learn')==='0')S.learn=false;if(q.get('work')==='0')S.work=false;
 (q.get('off')||'').split(',').forEach(function(id){if(PILLS.some(function(p){return p.id===id;})&&pillCount(id))S.off[id]=true;});
 /* links from before rev 10: door=learn|work keeps one side; type=essay|bit keeps one type (topic is no longer a map filter) */
 var d=q.get('door');if(d==='learn')S.work=false;else if(d==='work')S.learn=false;
 var ty=q.get('type');if(ty&&G.types[ty]){var keep=pillOf({type:ty});PILLS.forEach(function(p){if(p.id!==keep&&pillCount(p.id))S.off[p.id]=true;});}
 var nd=q.get('node');if(nd&&byId[nd]&&visible(byId[nd]))S.node=nd;
 var th=q.get('thread');if(th&&thById[th]&&S.node&&thById[th].stops.indexOf(S.node)<0)th=null;if(th&&thById[th]&&!filtered()){var sp=Math.floor(+q.get('step'));return {thread:th,step:Math.max(1,Math.min(thById[th].stops.length,isFinite(sp)&&sp>0?sp:thById[th].stops.length))};}return null;}
/* ---------------- idle tour: off for reduced motion, a hidden tab, a phone or an active filter; any input stops it and restores the screen ---------------- */
function stopTour(){if(!tour.on)return;tour.on=false;clearTimeout(tour.t);var p=tour.prev||{};S.learn=p.learn!==false;S.work=p.work!==false;S.off=p.off||{};
 if(p.thread)chooseThread(p.thread,{step:p.step,keepFilters:true});else{chooseThread(null);}S.node=p.node||null;apply();sync();}
function tourStep(){if(!tour.on)return;if(phone()||reduced||document.hidden||!mapIn){stopTour();return;}chooseThread(TH[tour.i%TH.length].id);tour.i++;tour.t=setTimeout(tourStep,4800);}
function mapFocus(){var a=document.activeElement;return !!(a&&a!==document.body&&$('graph').contains(a));}
function startTour(){if(!mapIn||mapFocus()||reduced||document.hidden||tour.on||S.thread||S.node||S.hover||phone()||filtered())return false;tour.prev={thread:S.thread,step:S.step,learn:S.learn,work:S.work,off:JSON.parse(JSON.stringify(S.off)),node:S.node};tour.on=true;tour.i=0;tourStep();return true;}
function armIdle(){clearTimeout(tour.idle);if(!reduced)tour.idle=setTimeout(startTour,9000);}
/* any interaction stops the tour, except on its own Stop button, whose click stops it and puts focus on a question */
['pointerdown','keydown','wheel','touchstart'].forEach(function(ev){document.addEventListener(ev,function(e){if(e&&e.target&&e.target.closest&&e.target.closest('#stopTour'))return;stopTour();armIdle();},{passive:true,capture:true});});
document.addEventListener('pointermove',function(e){if(Math.abs(e.movementX)+Math.abs(e.movementY)>2){stopTour();armIdle();}},{passive:true});
window.addEventListener('scroll',function(){stopTour();armIdle();},{passive:true});
document.addEventListener('visibilitychange',function(){if(document.hidden)stopTour();else armIdle();motionClass();});
/* reduced motion can change while the page is open: settle everything at once */
function onMotionPref(){reduced=!!(MQ&&MQ.matches);motionClass();if(reduced){stopTour();clearTimeout(tour.idle);clearLight();cancelAnimationFrame(anim);$('gwrap').classList.remove('moving');if(S.thread)S.step=thById[S.thread].stops.length;FR={from:FR.to,to:FR.to,e:1};}
 var fk=markFocus();build();measure();place();apply();restoreFocus(fk);if(!tour.on)sync();if(!reduced)armIdle();}
/* a rebuild replaces the marks, badges and phone cards: keep the focused one by its id (a thread control maps to the badge or the phone card, whichever the layout shows) */
function markFocus(){var a=document.activeElement;if(!a||!a.closest)return null;var st=a.closest('#stations .st');if(st)return {id:st.getAttribute('data-id')};var tb=a.closest('.tcard,.q');if(tb)return {thread:tb.getAttribute('data-thread')};if(a.id==='qClear'&&S.thread)return {thread:S.thread};return null;}
function restoreFocus(k){if(!k)return;var ok=function(el){return el&&el.offsetParent!==null&&el.tabIndex>=0&&getComputedStyle(el).visibility!=='hidden';};
 var el=k.id?document.querySelector('.st[data-id="'+k.id+'"]'):document.querySelector((phone()?'.tcard':'.q')+'[data-thread="'+k.thread+'"]');
 if(!ok(el))el=phone()?document.querySelector('.tcard[aria-pressed="true"]')||document.querySelector('.tcard'):document.querySelector('.q[aria-pressed="true"]')||document.querySelector('.q');   /* the same control may not exist in this layout: fall back to the thread chooser */
 if(ok(el))el.focus({preventScroll:true});}
if(MQ){if(MQ.addEventListener)MQ.addEventListener('change',onMotionPref);else if(MQ.addListener)MQ.addListener(onMotionPref);}
/* ---------------- events ---------------- */
document.addEventListener('click',function(e){var t=e.target.closest('button,a');if(!t)return;
 if(t.id==='showAll'){S.all=!S.all;apply();fitFrames();t.focus();return;}
 if(t.id==='copyBtn'){copyCmd();return;}
 if(t.classList.contains('st')){if(t.classList.contains('off'))return;var id=t.getAttribute('data-id');select(S.node===id?null:id);var b=document.querySelector('.st[data-id="'+id+'"]');if(b)b.focus({preventScroll:true});return;}
 if(t.hasAttribute('data-thread')){var tid=t.getAttribute('data-thread'),kind=t.classList.contains('tcard')?'.tcard':'.q';chooseThread(S.thread===tid&&kind!=='.tcard'?null:tid);var f=document.querySelector(kind+'[data-thread="'+tid+'"]');if(f)f.focus({preventScroll:true});return;}
 if(t.id==='pClear'){var wtc=S.thread;chooseThread(null);var tc0=document.querySelector('.tcard[data-thread="'+wtc+'"]')||document.querySelector('.tcard');if(tc0)tc0.focus({preventScroll:true});return;}
 if(t.id==='qClear'){var wasT=S.thread;chooseThread(null);var qb=document.querySelector('.q[data-thread="'+wasT+'"]');if(qb)qb.focus({preventScroll:true});return;}
 if(t.hasAttribute('data-pill')){if(t.disabled)return;var pid=t.getAttribute('data-pill');S.off[pid]=!S.off[pid];if(!S.off[pid])delete S.off[pid];filterChanged();t.focus({preventScroll:true});return;}
 if(t.hasAttribute('data-jump')){chooseThread(t.getAttribute('data-jump'));var tb=document.querySelector((phone()?'.tcard':'.q')+'[data-thread="'+S.thread+'"]');if(tb)tb.focus({preventScroll:true});return;}
 if(t.hasAttribute('data-pick')){select(t.getAttribute('data-pick'));var pb=document.querySelector('.st[data-id="'+S.node+'"]');if(pb&&!$('panel').classList.contains('sheet'))pb.focus({preventScroll:true});return;}
 if(t.hasAttribute('data-show')){var sid=t.getAttribute('data-show');resetFilters();S.thread=null;S.step=0;clearLight();frameTo(null,true);S.node=sid;apply();controls();sync('#graph');$('graph').scrollIntoView({behavior:reduced?'auto':'smooth'});setTimeout(function(){var b=document.querySelector('.st[data-id="'+sid+'"]');if(b)b.focus({preventScroll:true});},reduced?0:450);return;}
 if(t.id==='tPrev'||t.id==='tNext'){clearLight();var th=thById[S.thread];S.step=Math.max(1,Math.min(th.stops.length,S.step+(t.id==='tNext'?1:-1)));apply();sync();var k=$(t.id);if(!k||k.disabled)k=$(t.id==='tNext'?'tPrev':'tNext');if(k)k.focus();return;}
 if(t.id==='moreBtn'){var p=$('panel'),open=!p.classList.contains('sheet');p.classList.toggle('sheet',open);panel();var mb=$('moreBtn');if(mb)mb.focus();return;}
 if(t.id==='clearThread'){var was=S.thread;chooseThread(null);var wb=document.querySelector((phone()?'.tcard':'.q')+'[data-thread="'+was+'"]');if(wb&&wb.offsetParent)wb.focus();return;}
 if(t.id==='resetF'||t.id==='resetF2'||t.id==='resetF3'||t.id==='resetF4'){var inL=!!t.closest('#learn');resetFilters();filterChanged();(inL?$('showAll'):$('cb-learn')).focus({preventScroll:true});return;}
 if(t.id==='stopTour'){stopTour();var qf=document.querySelector('.q[aria-pressed="true"]')||document.querySelector('.q');if(qf)qf.focus({preventScroll:true});return;}
 if(t.id==='allCons'){var c0=$('panel').querySelectorAll('.more .nb').length;FULLCONS=S.node;panel();var nb=$('panel').querySelectorAll('.more .nb');if(nb[c0])nb[c0].focus();return;}
 if(t.id==='clearSel'){var ws=S.node;S.node=null;$('panel').classList.remove('sheet');apply();sync();var w2=document.querySelector('.st[data-id="'+ws+'"]');if(w2)w2.focus();return;}});
document.addEventListener('change',function(e){var id=e.target.id;
 if(id==='cb-learn'||id==='cb-work'){S[id.slice(3)]=e.target.checked;filterChanged();return;}});
/* the question buttons light their route on hover or focus and choose it on click */
$('qrow').addEventListener('mouseover',function(e){var q=e.target.closest('.q');previewThread(q?q.getAttribute('data-thread'):null);});
$('qrow').addEventListener('mouseleave',function(){previewThread(null);});
$('qrow').addEventListener('focusin',function(e){var q=e.target.closest('.q');previewThread(q?q.getAttribute('data-thread'):null);});
$('qrow').addEventListener('focusout',function(){previewThread(null);});
document.addEventListener('toggle',function(e){if(e.target.classList&&e.target.classList.contains('howto'))howOpen=e.target.open;},true);
function hoverOn(id){if(S.hover===id)return;S.hover=id;apply();}
$('stations').addEventListener('mouseover',function(e){var b=e.target.closest('.st');if(b&&!b.classList.contains('off'))hoverOn(b.getAttribute('data-id'));});
$('stations').addEventListener('mouseleave',function(){hoverOn(null);});
$('stations').addEventListener('focusin',function(e){var b=e.target.closest('.st');hoverOn(b?b.getAttribute('data-id'):null);});
$('stations').addEventListener('focusout',function(e){if(!e.relatedTarget||!e.relatedTarget.closest||!e.relatedTarget.closest('#stations'))hoverOn(null);});
document.addEventListener('keydown',function(e){var b=e.target.closest&&e.target.closest('.st');
 if(b&&/^Arrow/.test(e.key)){var me=b.getBoundingClientRect(),best=null,bd=1e9,dx=e.key==='ArrowRight'?1:e.key==='ArrowLeft'?-1:0,dy=e.key==='ArrowDown'?1:e.key==='ArrowUp'?-1:0;
  [].forEach.call(document.querySelectorAll('.st'),function(o){if(o===b||o.tabIndex<0)return;var r=o.getBoundingClientRect(),vx=r.left-me.left,vy=r.top-me.top,along=vx*dx+vy*dy;if(along<=2)return;var d=along+2.2*Math.abs(vx*dy+vy*dx);if(d<bd){bd=d;best=o;}});
  if(best){e.preventDefault();best.focus();}return;}
 if((e.key==='ArrowLeft'||e.key==='ArrowRight')&&S.thread&&e.target&&e.target.closest&&e.target.closest('#panel')&&!e.target.closest('input,textarea,select')){var bt=$(e.key==='ArrowRight'?'tNext':'tPrev');if(bt&&!bt.disabled){e.preventDefault();bt.click();}return;}
 if(e.key==='Escape'&&e.target&&e.target.closest&&e.target.closest('header'))return;
 if(e.key==='Escape'&&!(e.target&&e.target.closest&&e.target.closest('#graph'))&&!$('panel').classList.contains('sheet'))return;
 if(e.key==='Escape'){var p=$('panel');if(p.classList.contains('sheet')){p.classList.remove('sheet');panel();var mb=$('moreBtn');if(mb)mb.focus();return;}
  if(S.node){var w=S.node;S.node=null;apply();sync();var wb=document.querySelector('.st[data-id="'+w+'"]');if(wb)wb.focus();}else if(S.thread){var wt=S.thread;chooseThread(null);var qb=document.querySelector((phone()?'.tcard':'.q')+'[data-thread="'+wt+'"]');if(qb)qb.focus({preventScroll:true});}}
 });
/* phone: the card snapped to the start of the swipe row is the chosen thread */
var tcT,tcSelf=false,tcFocusT=0;$('tcards').addEventListener('focusin',function(){tcFocusT=Date.now();});$('tcards').addEventListener('scroll',function(){clearTimeout(tcT);tcT=setTimeout(function(){if(!phone())return;if(tcSelf){tcSelf=false;return;}if(Date.now()-tcFocusT<600)return;var row=$('tcards'),rr=row.getBoundingClientRect(),best=null,bd=1e9;[].forEach.call(row.querySelectorAll('.tcard'),function(c){var d=Math.abs(c.getBoundingClientRect().left-rr.left-16);if(d<bd){bd=d;best=c;}});if(best&&best.getAttribute('data-thread')!==S.thread){chooseThread(best.getAttribute('data-thread'));}},160);},{passive:true});
/* when a layout change hides the focused control, focus moves to a visible stand-in (pi r11 C3-1): a header link to the
   Menu button (or the theme switch); a control with a visible twin (same tag, text and data) to the twin; otherwise the
   nearest visible focusable control in the same section, or the section's heading */
/* shown: laid out and not hidden (offsetParent is null for a fixed element too, the skip link: review r2) */
function isShown(el){if(!el||!el.getClientRects().length)return false;var cs=getComputedStyle(el);return cs.visibility!=='hidden'&&cs.display!=='none';}
function standIn(el){if(!el||!el.closest)return null;
 if(el.closest('header.topbar'))return null;   /* the header hands its own focus on (the Topbar's script) */
 var sig=el.tagName+'|'+el.textContent.trim()+'|'+[].map.call(el.attributes,function(a){return /^data-/.test(a.name)?a.name+'='+a.value:'';}).join(',');
 var twins=[].filter.call(document.querySelectorAll(el.tagName),function(x){return x!==el&&isShown(x)&&(x.tagName+'|'+x.textContent.trim()+'|'+[].map.call(x.attributes,function(a){return /^data-/.test(a.name)?a.name+'='+a.value:'';}).join(','))===sig;});
 if(twins.length)return twins[0];
 var box=el.closest('footer,section,aside,header,main')||document.body;
 var f=[].filter.call(box.querySelectorAll('a[href],button:not([disabled]),input,select,[tabindex="0"]'),isShown)[0];
 if(f)return f;var h=box.querySelector('h1,h2');if(h){h.setAttribute('tabindex','-1');return h;}return null;}
/* the theme is the Topbar's (wicked-web): when it changes and the URL names one (?theme=), the URL follows, so a reload
   or a shared link keeps the visitor's choice */
new MutationObserver(function(){var t=document.documentElement.getAttribute('data-theme');try{var u=new URLSearchParams(location.search);if(u.has('theme')&&u.get('theme')!==t){u.set('theme',t);history.replaceState(history.state,'',location.pathname+'?'+u.toString()+location.hash);}}catch(x){}}).observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
/* the last map control that had keyboard focus: a layout switch hides some controls, and the browser drops their focus
   before (or after) this code runs, so the switch restores it from here when focus has fallen to the page */
var lastFk=null;document.addEventListener('focusin',function(){lastFk=markFocus();});document.addEventListener('pointerdown',function(){lastFk=null;});
function relayout(fk0){if(phone()&&tour.on)stopTour();var was=M.ph,fk=null;measure();if(was!==M.ph){fk=fk0||markFocus()||((document.activeElement===document.body||!document.activeElement)?lastFk:null);build();}var f=frameFor(S.thread?thById[S.thread]:null);FR={from:f,to:f,e:1};place();apply();restoreFocus(fk);}
/* a frame grows when its content (not its decorative art) is taller than the frame; snapping is off while any does */
function fitFrames(){var any=false;[].forEach.call(document.querySelectorAll('.snap'),function(s){s.classList.remove('grow');var fr=s.getBoundingClientRect(),t=Infinity,b=-Infinity;
 [].forEach.call(s.querySelectorAll(':scope > *, :scope > .wrap > *'),function(c){if(c.classList.contains('wrap')||c.classList.contains('art')||c.getAttribute('aria-hidden')==='true'||!c.getClientRects().length)return;var cs=getComputedStyle(c);if(cs.position==='absolute'||cs.position==='fixed')return;var r=c.getBoundingClientRect();t=Math.min(t,r.top);
  /* a block's content that spills out of it counts (a scroller is its box): Learn's cards on a tablet (review r1) */
  b=Math.max(b,(cs.overflowY==='auto'||cs.overflowY==='scroll')?r.bottom:Math.max(r.bottom,r.top+c.scrollHeight));});
 if(b>t&&(b-t>s.clientHeight+1||t<fr.top-1||b>fr.bottom+1)){s.classList.add('grow');any=true;}});document.documentElement.classList.toggle('loose',any);}
/* the focused control is noted when the resize starts: by the time the debounced relayout runs, a control that the new
   layout hides has already lost focus */
var lastEl=null;document.addEventListener('focusin',function(e){lastEl=e.target;});
var rz,rzFk=null,rzInP=null,rzEl0=null;window.addEventListener('resize',function(){if(!rzEl0)rzEl0=document.activeElement;if(!rzFk)rzFk=markFocus();if(rzInP===null)rzInP=$('panel').contains(document.activeElement);clearTimeout(rz);rz=setTimeout(function(){var was0=(rzEl0&&rzEl0!==document.body)?rzEl0:lastEl;rzEl0=null;setTimeout(function(){var ae=document.activeElement;if(was0&&!isShown(was0)&&(!ae||ae===document.body||ae===was0||!isShown(ae))){var to=standIn(was0);if(to&&isShown(to))to.focus({preventScroll:true});}},0);var k=rzFk;rzFk=null;var p=$('panel'),inP=rzInP||p.contains(document.activeElement);rzInP=null;relayout(k);fitFrames();if(innerWidth>1023&&p.classList.contains('sheet')){p.classList.remove('sheet');panel();}if(inP&&(!document.activeElement||document.activeElement===document.body||document.activeElement.offsetParent===null||document.activeElement===p)){var fm=S.node&&document.querySelector('.st[data-id="'+S.node+'"]');(fm&&fm.offsetParent!==null?fm:(document.querySelector('.q[aria-pressed="true"]')||document.querySelector('.q'))).focus({preventScroll:true});}},90);});
window.addEventListener('load',fitFrames);setTimeout(fitFrames,0);
var qs=new URLSearchParams(location.search);
buildControls();var start=readURL();measure();build();measure();
if(!start&&phone()&&!filtered()&&!S.node){start={thread:'start',step:null};implicit=true;}
if(start){S.thread=start.thread;var f0=frameFor(thById[start.thread]);FR={from:f0,to:f0,e:1};place();S.step=start.step||thById[start.thread].stops.length;apply();}
else{var f1=frameFor(null);FR={from:f1,to:f1,e:1};place();apply();}
controls();sync();armIdle();
if(window.ResizeObserver){var lastWH='';new ResizeObserver(function(){var g=$('gwrap'),wh=g.clientWidth+'x'+g.clientHeight;if(wh===lastWH)return;lastWH=wh;relayout();}).observe($('gwrap'));}
/* ---------------- the hero: the braid settles for reduced motion and pauses in a hidden tab ---------------- */
var braidDone=false,braidIn=true,braidLeft=5000,braidAt=0,braidT=null;
/* the hero's braid: its dots travel for 5 s of time on screen, then rest on their strands (WCAG 2.2.2). Off screen
   (under a quarter of the hero showing), in a hidden tab or under reduced motion they hold where they are. */
function motionClass(){document.documentElement.classList.toggle('reduced',reduced);var b=document.querySelector('.braid');if(!b||!b.pauseAnimations)return;
 var run=!(reduced||document.hidden||braidDone||!braidIn);
 if(run&&!braidT){braidAt=Date.now();braidT=setTimeout(function(){braidT=null;braidDone=true;motionClass();},braidLeft);}
 else if(!run&&braidT){clearTimeout(braidT);braidT=null;braidLeft=Math.max(0,braidLeft-(Date.now()-braidAt));}
 if(run)b.unpauseAnimations();else{b.pauseAnimations();settleAnims(b);settleAnims(document.querySelector('svg.braid-run'));}}
motionClass();
/* ---------------- the map: routes draw in the first time it is in view; the idle tour runs only while it is in view ---------------- */
(function(){var bz=document.querySelector('svg.braid');if(!bz||!window.IntersectionObserver)return;
 new IntersectionObserver(function(es){var e=es[es.length-1];braidIn=e.isIntersecting&&Math.max(e.intersectionRatio,e.intersectionRect.height/Math.max(1,innerHeight))>=0.25;motionClass();},{threshold:STEPS}).observe(bz);})();
var drawn=false;function drawIn(){if(drawn||reduced)return;drawn=true;[].forEach.call($('svg').querySelectorAll('.route'),function(p,i){var len=p.getTotalLength();if(!len||!p.animate)return;p.animate([{strokeDasharray:len+' '+len,strokeDashoffset:len},{strokeDasharray:len+' '+len,strokeDashoffset:0}],{duration:1300,delay:120+i*140,easing:(getComputedStyle(document.documentElement).getPropertyValue('--ease-out').trim()||'ease-out'),fill:'backwards'});});}
if(window.IntersectionObserver){new IntersectionObserver(function(es){var e=es[es.length-1],live=e.isIntersecting&&!document.hidden&&Math.max(e.intersectionRatio,e.intersectionRect.height/Math.max(1,innerHeight))>=0.25;if(live!==mapLive){mapLive=live;if(live)mapResume();else mapHold();}},{threshold:STEPS}).observe($('graph'));
 document.addEventListener('visibilitychange',function(){var r=$('graph').getBoundingClientRect(),seen=Math.max(0,Math.min(r.bottom,innerHeight)-Math.max(r.top,0)),live=!document.hidden&&Math.max(seen/Math.max(1,r.height),seen/innerHeight)>=0.25;if(live!==mapLive){mapLive=live;if(live)mapResume();else mapHold();}});
 new IntersectionObserver(function(es){es.forEach(function(e){mapIn=e.isIntersecting&&e.intersectionRatio>=0.6;$('gwrap').classList.toggle('still',!mapIn);clearTimeout(stillT);stillT=null;stillLeft=0;if(mapIn){stillUntil=Date.now()+5000;stillT=setTimeout(function(){stillT=null;$('gwrap').classList.add('still');},5000);}if(mapIn){drawIn();armIdle();if(implicit){implicit=false;sync();}}else{stopTour();var pn=$('panel');if(pn.classList.contains('sheet')){pn.classList.remove('sheet');panel();}}});},{threshold:[0,0.6,1]}).observe($('graph'));}else{mapIn=true;mapLive=true;}
/* Back/Forward: restore the state the URL names */
window.addEventListener('popstate',function(){var href=location.href;restoring=true;tour.on=false;clearTimeout(tour.t);clearLight();
 S.node=null;S.hover=null;var st=readURL(),nd=S.node;
 if(st)chooseThread(st.thread,{instant:true,step:st.step,keepFilters:true});else chooseThread(null,{instant:true,keepFilters:true});
 if(nd){S.node=nd;apply();}controls();restoring=false;if(location.href!==href)history.replaceState(null,'',href);});
/* a shared link that carries map state opens on the map */
if(!location.hash&&['thread','node','door','type','topic','learn','work','off'].some(function(k){return qs.get(k);}))$('graph').scrollIntoView();
/* ---------------- Work: copy the install command ---------------- */
var copyT;function copyCmd(){var c=$('cmd').textContent,b=$('copyBtn'),m=$('copyMsg');
 function sel(){var r=document.createRange();r.selectNodeContents($('cmd'));var g=window.getSelection();g.removeAllRanges();g.addRange(r);return g;}
 function legacy(){try{var g=sel(),ok=document.execCommand('copy');g.removeAllRanges();return ok;}catch(x){return false;}}
 function done(ok){b.classList.toggle('ok',ok);b.querySelector('.t').textContent=ok?'Copied':'Copy';m.textContent=ok?'Copied '+c+' to the clipboard.':'Copying is blocked here. The command is selected: press Ctrl+C or Command+C.';if(!ok)sel();
  clearTimeout(copyT);copyT=setTimeout(function(){b.classList.remove('ok');b.querySelector('.t').textContent='Copy';m.textContent='';},2400);}
 if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(c).then(function(){done(true);},function(){done(legacy());});else done(legacy());}
/* ---------------- the audit oracle (tests): labels, badges, marks with their rings, hulls, routes, hover edges and the pulse ---------------- */
window.__audit=function(opts){opts=opts||{};var CORR=opts.corridor==null?(phone()?9:12):opts.corridor,RING=opts.ring==null?6:opts.ring,out=[],g=$('gwrap').getBoundingClientRect();
 function R(el){var r=el.getBoundingClientRect();return {l:r.left,t:r.top,r:r.right,b:r.bottom};}
 function hit(a,b,m){m=m||0;return a.l<b.r+m&&b.l<a.r+m&&a.t<b.b+m&&b.t<a.b+m;}
 function shown(el){for(var x=el;x&&x!==document.body;x=x.parentElement){var c=getComputedStyle(x);if(c.visibility==='hidden'||c.display==='none'||+c.opacity<0.05)return false;}return el.getClientRects().length>0;}
 var labs=[],badges=[],dots=[];
 [].forEach.call(document.querySelectorAll('#stations .st'),function(st){if(!shown(st))return;var id=st.getAttribute('data-id'),l=st.querySelector('.lab'),d=st.querySelector('.dot');if(shown(l)){var lr=R(l);lr.id=id;labs.push(lr);}
  var dr=R(d),rg=st.classList.contains('cross')?5:0;if(st.classList.contains('hov')||st.classList.contains('near')||st.classList.contains('sel')||st.classList.contains('cur'))rg=Math.max(rg,RING);dr.l-=rg;dr.t-=rg;dr.r+=rg;dr.b+=rg;dr.id=id;dots.push(dr);
  if(dr.l<g.left||dr.r>g.right||dr.t<g.top||dr.b>g.bottom)out.push('mark outside the map: '+id);});
 [].forEach.call(document.querySelectorAll('#gwrap .shore'),function(b){if(shown(b)){var r=R(b);r.id='shore:'+b.textContent;badges.push(r);}});
 var boxes=labs.concat(badges);
 for(var i=0;i<boxes.length;i++){var a=boxes[i];if(a.l<g.left+1||a.r>g.right-1||a.t<g.top+1||a.b>g.bottom-1)out.push('outside the map: '+a.id);
  for(var j=i+1;j<boxes.length;j++)if(hit(a,boxes[j],2))out.push('overlap: '+a.id+' / '+boxes[j].id);
  dots.forEach(function(d){if(d.id!==a.id&&hit(a,d,2))out.push('label on a mark: '+a.id+' / '+d.id);});}
 for(var i2=0;i2<dots.length;i2++)for(var j2=i2+1;j2<dots.length;j2++)if(hit(dots[i2],dots[j2],3))out.push('marks touch: '+dots[i2].id+' / '+dots[j2].id);
 function sample(p,corr,name,skip){var len=p.getTotalLength();for(var s=0;s<=len;s+=3){var q=p.getPointAtLength(s),x=g.left+q.x,y=g.top+q.y;if(x<g.left||x>g.right||y<g.top||y>g.bottom)continue;
   for(var k=0;k<boxes.length;k++){var b=boxes[k];if(skip&&skip(b))continue;if(x>b.l-corr&&x<b.r+corr&&y>b.t-corr&&y<b.b+corr){out.push(name+' runs at '+b.id);return;}}}}
 [].forEach.call(document.querySelectorAll('#svg .route'),function(p){if(shown(p))sample(p,CORR,'route '+p.getAttribute('data-t'));});
 [].forEach.call(document.querySelectorAll('#svg .nedge'),function(p){if(shown(p))sample(p,5,'hover edge '+p.getAttribute('data-a')+'-'+p.getAttribute('data-b'));});
 [].forEach.call(document.querySelectorAll('#hulls .hullg'),function(hg){if(!shown(hg))return;var tid=hg.getAttribute('data-t'),mem=thById[tid].stops;
  [].forEach.call(hg.querySelectorAll('rect'),function(rc){var r=R(rc);r.l-=4;r.t-=4;r.r+=4;r.b+=4;boxes.forEach(function(b){var own=mem.indexOf(b.id)>=0||b.id==='badge:'+tid;if(!own&&hit(r,b,0))out.push('hull '+tid+' over '+b.id);});});});
 [].forEach.call(document.querySelectorAll('#hulls .hullg'),function(hg){if(!shown(hg))return;var tid=hg.getAttribute('data-t'),mem=thById[tid].stops,own=dots.concat(labs).filter(function(b){return mem.indexOf(b.id)>=0;});
  [].forEach.call(hg.querySelectorAll('rect'),function(rc){var r=R(rc);if(!own.some(function(b){return hit(r,b,2);}))out.push('orphan hull rect in '+tid);});});
 var pu=$('pulse');if(pu.classList.contains('on')&&shown(pu)){var pr=R(pu);pr.l-=4;pr.t-=4;pr.r+=4;pr.b+=4;boxes.forEach(function(b){if(hit(pr,b,0))out.push('pulse over '+b.id);});}
 var sec=$('graph').getBoundingClientRect();if(g.bottom>sec.bottom+1)out.push('the map runs past its section');
 var seen={};return out.filter(function(x){if(seen[x])return false;seen[x]=1;return true;});};
window.__map={S:S,G:G,drafts:function(on){SHOW_DRAFTS=!!on;apply();controls();},FR:function(){return {z:magnification()};},choose:function(id,step){chooseThread(id,{instant:true,step:step});},chooseAnimated:function(id){chooseThread(id);},select:function(id){select(id);},hover:hoverOn,set:function(o){for(var k in o)S[k]=o[k];apply();controls();sync();},tour:function(){return startTour();},touring:function(){return tour.on;},stopTour:stopTour,reduced:function(){return reduced;}};
})();
