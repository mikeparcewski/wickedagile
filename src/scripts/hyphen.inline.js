/* R17: Wicked Sans A sets the hyphen with about 0.16em of side bearing on each side (Arial:
   about 0.03em), so "wicked-studio" reads as "wicked - studio". Each hyphen between two letters or digits is wrapped in
   a span pulled in by 0.11em on each side. Code, inputs, options and SVG are left alone. The font-level fix (narrower
   side bearings in the fonts-v3 generator) is DES R17's follow-up; when it lands, this script and .hy go. */
(function(){var SKIP=/^(SCRIPT|STYLE|CODE|PRE|TEXTAREA|INPUT|SELECT|OPTION|TITLE)$/,RX=/([A-Za-z0-9])-(?=[A-Za-z0-9])/g;
function one(t){var p=t.parentNode;if(!p||p.nodeType!==1||SKIP.test(p.nodeName)||(p.closest&&p.closest('svg,.hy,code,pre,.cmd,[aria-live],[role=status]')))return;var v=t.nodeValue;RX.lastIndex=0;if(!RX.test(v))return;
 var f=document.createDocumentFragment(),last=0,m;RX.lastIndex=0;while((m=RX.exec(v))){var at=m.index+1;f.appendChild(document.createTextNode(v.slice(last,at)));var s=document.createElement('span');s.className='hy';s.textContent='-';f.appendChild(s);last=at+1;}
 f.appendChild(document.createTextNode(v.slice(last)));
 /* in a flex or grid box each text run is its own item, so keep the word in one inline wrapper */
 var d=getComputedStyle(p).display;if(/flex|grid/.test(d)){var w=document.createElement('span');w.className='hyw';w.appendChild(f);p.replaceChild(w,t);}else p.replaceChild(f,t);}
function fix(root){if(!root)return;if(root.nodeType===3){one(root);return;}if(root.nodeType!==1)return;var w=document.createTreeWalker(root,NodeFilter.SHOW_TEXT,null),list=[],n;while((n=w.nextNode()))list.push(n);list.forEach(one);}
window.__hy=fix;
function start(){fix(document.body);new MutationObserver(function(ms){ms.forEach(function(m){if(m.type==='characterData')one(m.target);else [].forEach.call(m.addedNodes,fix);});}).observe(document.body,{childList:true,subtree:true,characterData:true});}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start);else start();})();
