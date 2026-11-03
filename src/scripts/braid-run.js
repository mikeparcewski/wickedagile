/* The hero's Work line runs on (operator, 2026-11-03, wickedagile#69): the tube turns left in the empty band at the bottom of the hero,
   runs down the left gutter and ends beside "Follow a thread". The hero's own tube is cut at the turn so the two join.
   Redrawn on resize, font load and layout change. */
(function(){
  var NS='http://www.w3.org/2000/svg', hero=document.getElementById('home'), braid=document.querySelector('svg.braid'),
      head=document.getElementById('gh');
  if(!hero||!braid||!head||!braid.getScreenCTM)return;
  var TUBE='M404 250 L500 250 A80 80 0 0 1 580 330 L580 ';
  var own=[].filter.call(braid.querySelectorAll('path.tube,path.tube-o'),function(p){return (p.getAttribute('d')||'').indexOf(TUBE)===0;});
  if(!own.length)return;
  var svg=document.createElementNS(NS,'svg'); svg.setAttribute('class','braid-run'); svg.setAttribute('aria-hidden','true'); svg.setAttribute('focusable','false');
  /* square starts so the join with the hero's tube shows no seam; the far end is rounded by two caps */
  var po=document.createElementNS(NS,'path'), pi=document.createElementNS(NS,'path'), co=document.createElementNS(NS,'circle'), ci=document.createElementNS(NS,'circle');
  po.setAttribute('class','tube-o'); pi.setAttribute('class','tube'); co.setAttribute('class','cap-o'); ci.setAttribute('class','cap');
  svg.appendChild(po); svg.appendChild(co); svg.appendChild(pi); svg.appendChild(ci); document.body.appendChild(svg);
  function setOwn(vy){own.forEach(function(p){p.setAttribute('d',TUBE+vy);});}
  function bottomOf(els,sy){var y=-1e9;els.forEach(function(e){var r=e.getBoundingClientRect();if(r.width>0&&r.height>0)y=Math.max(y,r.bottom+sy);});return y;}
  var raf=0;
  function draw(){
    raf=0; setOwn(2400);
    var m=braid.getScreenCTM(); if(!m){return;}
    var sx=window.scrollX||0, sy=window.scrollY||0, k=m.a, w=20*k;
    var x=580*m.a+m.e+sx;
    var hb=hero.getBoundingClientRect().bottom+sy, hr=head.getBoundingClientRect();
    /* the hero's content: everything in it but the tube itself */
    var parts=[].filter.call(hero.querySelectorAll('*'),function(e){return !e.closest('svg.braid')&&e.children.length===0;});
    parts=parts.concat([].slice.call(braid.querySelectorAll('.s,.bl,.mk,.xchg')));
    var cb=bottomOf(parts,sy);
    if(!(hb-cb>w+24)){po.setAttribute('d','');pi.setAttribute('d','');co.setAttribute('r',0);ci.setAttribute('r',0);return;}
    var yH=cb+(hb-cb)/2;
    var xEnd=hr.left+sx-(w/2+14), yEnd=hr.top+sy+hr.height/2;
    if(xEnd<w/2+6){xEnd=hr.left+sx+w/2;yEnd=hr.top+sy-(w/2+10);}
    var r=Math.max(8,Math.min(32,(x-xEnd)/4,(yEnd-yH)/2));
    if(!(yEnd>yH+r)||!(x>xEnd+2*r)){po.setAttribute('d','');pi.setAttribute('d','');co.setAttribute('r',0);ci.setAttribute('r',0);return;}
    var y0=yH-r, vy=(y0-sy-m.f)/m.d;
    setOwn(vy.toFixed(1));
    var d='M'+x+' '+y0+' Q'+x+' '+yH+' '+(x-r)+' '+yH+' H'+(xEnd+r)+' Q'+xEnd+' '+yH+' '+xEnd+' '+(yH+r)+' V'+yEnd;
    svg.setAttribute('width',document.documentElement.scrollWidth); svg.setAttribute('height',Math.ceil(yEnd+w));
    po.setAttribute('d',d); pi.setAttribute('d',d); po.setAttribute('stroke-width',w); pi.setAttribute('stroke-width',7*k);
    [[co,w/2],[ci,3.5*k]].forEach(function(c){c[0].setAttribute('cx',xEnd);c[0].setAttribute('cy',yEnd);c[0].setAttribute('r',c[1]);});
  }
  function later(){if(!raf)raf=requestAnimationFrame(draw);}
  window.addEventListener('resize',later); window.addEventListener('load',later);
  if(document.fonts&&document.fonts.ready)document.fonts.ready.then(later);
  if(window.ResizeObserver)new ResizeObserver(later).observe(document.body);
  later();
})();
