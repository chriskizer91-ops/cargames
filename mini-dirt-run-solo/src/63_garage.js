/* =====================================================================================
   THE GARAGE. The car turns in front of you while you change it a part at a time. Up top, its six ratings
   (0 to 50) and the figures behind them; pick one of them as what you're building for, and every part
   shows what it does to all six, with the best one for your pick marked. Parts that don't fit say why.
   In free play every part is yours; a change goes on the car at once. "Build it for me" tries every part
   in every slot, twice round, and keeps whatever scores best for what you're building for.
   ===================================================================================== */
const GAR={target:'all',open:null,busy:false,job:0};
const GUIDE={all:'An all-rounder gives a little everywhere: all-terrain tyres, a small lift, four-wheel drive with a low range.',
  dirt:'Dirt roads reward power you can put down: all-wheel drive, rally or all-terrain tyres and dampers that soak up the ruts. Too much lift and it rolls in the turns.',
  gravel:'Gravel is speed on loose stone: gravel or all-terrain tyres, gearing with legs and shocks for the washboard.',
  mountain:'Red Hill wants grip on a steep loose slope: every wheel driving, low range, lockers, and a centre of gravity low enough not to tip on the off-camber turns.',
  rocks:'Rocks want tall tyres to climb the ledges, lockers, a crawl box, lift for clearance and long travel. Speed hardly matters.',
  mud:'Mud wants mud-terrain tyres above everything, then lockers, torque and clearance. Slicks and drag radials just dig a hole.',
  asphalt:'Tarmac wants sticky tyres, a low stance, big brakes and power. Lift and mud tyres cost you here.'};
const score=(r,k)=>k==='all'?TERRAINS.reduce((s,[t])=>s+r[t],0)/TERRAINS.length:r[k];
function buildGarage(){
  segButtons($('gCars'),CARS.map(([c,n])=>[c,CARD_NAME[c]||n]),car=>{if(car!==APP.car){APP.car=car;GAR.open=null;saveGame();spawnRig();}syncGarage();});
  $('gSuggest').addEventListener('click',suggestBuild);
}
/* a change: on the car at once, the car rebuilt where it stands */
function setPart(slot,val){
  if(GAR.busy)return;const car=APP.car,rig=Object.assign({},rigOf(car),{[slot]:val});
  if(fits(car,rigOf(car),slot,val)||!Career.owns(car,slot,val))return;
  RIGS[car]=fixRig(car,rig);saveGame();spawnRig();syncGarage();syncMenu();
}
function rateTile(k,name,v,dv){
  const el=document.createElement('button');el.type='button';el.className='rate';el.dataset.k=k;el.setAttribute('aria-pressed',String(GAR.target===k));
  el.innerHTML='<span></span><b></b><div class="bar5"><i></i><u></u></div>';el.querySelector('span').textContent=name;
  const b=el.querySelector('b');b.textContent=Math.round(v);
  if(dv){const em=document.createElement('em');em.className=dv>0?'up':'dn';em.textContent=(dv>0?'+':'')+Math.round(dv);b.appendChild(em);}
  el.querySelector('i').style.width=(v/50*100).toFixed(1)+'%';
  if(dv){const u=el.querySelector('u'),a=Math.min(v,v+dv),w=Math.abs(dv);u.style.left=(a/50*100).toFixed(1)+'%';u.style.width=(w/50*100).toFixed(1)+'%';u.style.background=dv>0?'var(--go)':'var(--bad)';}
  el.addEventListener('click',()=>{GAR.target=GAR.target===k?'all':k;syncGarage();});
  return el;
}
function syncGarage(preview){
  const car=APP.car,rig=rigOf(car),r=rateRig(car,rig),p=preview?rateRig(car,preview):null;
  for(const el of $('gCars').children){el.setAttribute('aria-pressed',String(el.dataset.v===car));el.disabled=!Career.hasCar(el.dataset.v);el.hidden=Career.on()&&!Career.hasCar(el.dataset.v);}
  /* the presets */
  const pr=$('gPresets');pr.textContent='';const cur=rigName(car,rig);
  for(const id of presetsOf(car))pr.appendChild(presetButton(car,id,cur,()=>{syncGarage();syncMenu();}));
  /* the ratings: tap one to build for it */
  const R=$('gRatings');R.textContent='';
  R.appendChild(rateTile('all','All-round',score(r,'all'),p?score(p,'all')-score(r,'all'):0));
  for(const [k] of TERRAINS)R.appendChild(rateTile(k,TERRAIN_SHORT[k],r[k],p?p[k]-r[k]:0));
  /* 0-60: measured on the physics for the car as it is; a preview scales that by what the quick simulator says changes */
  const m60=measure60(rigBuild(car,rig)),F=Object.assign({},r.figs,{z60:m60}),f=p?Object.assign({},p.figs,{z60:m60&&r.figs.z60&&p.figs.z60?+(m60*p.figs.z60/r.figs.z60).toFixed(1):p.figs.z60}):F,d=(a,b,u,dp=0,lowGood)=>{if(!p||Math.abs(a-b)<(dp?.05:1))return '';const good=lowGood?a<b:a>b;return ` <span class="${good?'up':'dn'}">${a>b?'+':''}${(a-b).toFixed(dp)}${u}</span>`;};
  $('gFigs').innerHTML=`<span><b>${f.hp}</b> hp${d(f.hp,F.hp,'')}</span><span><b>${f.kg}</b> kg${d(f.kg,F.kg,'',0,true)}</span><span>0-60 <b>${f.z60??'-'}</b> s${f.z60&&F.z60?d(f.z60,F.z60,'',1,true):''}</span>`+
    `<span>top <b>${f.top}</b> mph${d(f.top,F.top,'')}</span><span>clearance <b>${f.clear}</b> cm${d(f.clear,F.clear,'')}</span><span>travel <b>${f.travel}</b> cm${d(f.travel,F.travel,'')}</span>`+
    `<span>tips at <b>${f.tip.toFixed(2)}</b> g${d(f.tip,F.tip,'',2)}</span><span><b>${f.drv}</b>${f.low?' · low '+f.low.toFixed(2):''}${f.lockers?' · '+(f.lockers>1?'two lockers':'rear locker'):''}</span>`;
  $('gGuide').textContent=GUIDE[GAR.target];
  $('gSuggest').textContent=GAR.busy?'Trying parts…':(Career.on()?'Build it from parts I own: ':'Build it for me: ')+(GAR.target==='all'?'all-round':TERRAINS.find(t=>t[0]===GAR.target)[1].toLowerCase());
  if(!preview)drawSlots();
}
function drawSlots(){
  const car=APP.car,rig=rigOf(car),host=$('gSlots');host.textContent='';
  for(const [g,gname] of SLOT_GROUPS){
    const grp=document.createElement('div');grp.className='sgroup';grp.innerHTML='<h2></h2>';grp.querySelector('h2').textContent=gname;let any=false;
    for(const [s,sg,sname] of SLOTS){if(sg!==g)continue;const opts=slotOptions(car,s,rig);if(opts.length<2)continue;any=true;
      const cur=opts.find(o=>o[0]===rig[s])||opts[0],box=document.createElement('div');box.className='slot';if(GAR.open===s)box.setAttribute('open','');
      const hd=document.createElement('button');hd.type='button';hd.setAttribute('aria-expanded',String(GAR.open===s));hd.innerHTML='<span></span><b></b><i></i>';
      hd.querySelector('span').textContent=sname;hd.querySelector('b').textContent=cur[1];hd.querySelector('i').textContent=GAR.open===s?'CLOSE':opts.length+' CHOICES';
      hd.addEventListener('click',()=>{GAR.open=GAR.open===s?null:s;drawSlots();});box.appendChild(hd);
      if(GAR.open===s)box.appendChild(optionList(car,rig,s,opts));
      grp.appendChild(box);}
    if(any)host.appendChild(grp);}
}
/* the open slot's choices: each one's effect on all six ratings, filled in a few at a time so the menu never stalls */
function optionList(car,rig,s,opts){
  const list=document.createElement('div');list.className='opts2';const job=++GAR.job,base=rateRig(car,rig),rows=[];
  for(const [v,name,note,price] of opts){
    const why=fits(car,rig,s,v),el=document.createElement('button');el.type='button';el.className='opt';el.disabled=!!why;if(v===rig[s])el.setAttribute('aria-current','true');
    el.innerHTML='<b></b><span class="tag"></span><small></small><div class="dl"></div>';el.querySelector('b').textContent=name;el.querySelector('small').textContent=why||note||'';
    const tag=el.querySelector('.tag'),owned=Career.owns(car,s,v),cr=Career.on();tag.textContent=!price?'Factory':cr&&owned?'Owned':Feats.fmtMoney(price);
    if(cr&&!owned&&!why&&price>Career.money())el.querySelector('small').textContent='Need '+Feats.fmtMoney(price-Career.money())+' more. '+(note||'');
    el.addEventListener('click',()=>{
      if(owned)return setPart(s,v);
      if(why)return;if(price>Career.money()){say('Need '+Feats.fmtMoney(price-Career.money())+' more',1.8);return;}
      /* the career: the first tap asks, the second buys it and puts it on */
      if(el.dataset.sure!=='1'){for(const o of list.querySelectorAll('.opt'))if(o.dataset.sure==='1'){o.dataset.sure='';o.querySelector('.tag').textContent=o.dataset.tag;}
        el.dataset.sure='1';el.dataset.tag=tag.textContent;tag.textContent='Tap to buy: '+Feats.fmtMoney(price);return;}
      if(Career.buyPart(car,s,v)){setPart(s,v);syncMenu();}});
    el.addEventListener('pointerenter',e=>{if(e.pointerType==='mouse'&&!why)syncGarage(fixRig(car,Object.assign({},rig,{[s]:v})));});
    el.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')syncGarage(null);});
    list.appendChild(el);rows.push({v,el,why});}
  let i=0,best=null;
  const next=()=>{if(job!==GAR.job||!list.isConnected)return;const t0=performance.now();
    while(i<rows.length&&performance.now()-t0<14){const q=rows[i++];if(q.why)continue;
      const r=rateRig(car,fixRig(car,Object.assign({},rig,{[s]:q.v}))),dl=q.el.querySelector('.dl');q.sc=score(r,GAR.target);
      for(const [k,n] of TERRAINS){const dv=r[k]-base[k];if(Math.abs(dv)<1)continue;const sp=document.createElement('span');sp.className=dv>0?'up':'dn';sp.textContent=TERRAIN_SHORT[k].toUpperCase()+' '+(dv>0?'+':'')+dv;dl.appendChild(sp);}
      if(!dl.children.length&&q.v!==rig[s]){const sp=document.createElement('span');sp.style.color='var(--ink-3)';sp.textContent=s==='paint'||s==='wheels'?'LOOKS ONLY':'NO CHANGE TO THE RATINGS';dl.appendChild(sp);}
      if(!best||q.sc>best.sc+.01)best=q;}
    if(i<rows.length)setTimeout(next,0);
    else if(best&&s!=='paint'&&s!=='wheels'){const t=best.el.querySelector('.tag'),pv=best.v;t.classList.add('rec');
      t.textContent='Best for '+(GAR.target==='all'?'all-round':TERRAINS.find(x=>x[0]===GAR.target)[1].toLowerCase())+(Career.on()&&!Career.owns(car,s,pv)?' · '+Feats.fmtMoney(Career.priceOf(car,s,pv)):'');}};
  setTimeout(next,0);
  return list;
}
/* "Build it for me": every slot that matters, every part that fits, twice round, keep the best score */
function suggestBuild(){
  if(GAR.busy)return;GAR.busy=true;const car=APP.car,k=GAR.target;let rig=Object.assign({},rigOf(car)),bestS=score(rateRig(car,rig),k);
  const slots=SLOTS.map(s=>s[0]).filter(s=>s!=='paint'&&s!=='wheels'),order=[];for(let pass=0;pass<2;pass++)for(const s of slots)order.push(s);
  let n=0;$('gSuggest').textContent='Trying parts…';
  const next=()=>{const t0=performance.now();
    while(n<order.length&&performance.now()-t0<20){const s=order[n++];
      for(const [v] of slotOptions(car,s,rig)){if(v===rig[s]||fits(car,rig,s,v)||!Career.owns(car,s,v))continue;const r2=fixRig(car,Object.assign({},rig,{[s]:v})),sc=score(rateRig(car,r2),k);if(sc>bestS+.2){bestS=sc;rig=r2;}}}
    $('gNote').textContent=n<order.length?`${Math.round(n/order.length*100)}%`:'';
    if(n<order.length){setTimeout(next,0);return;}
    GAR.busy=false;RIGS[car]=rig;saveGame();spawnRig();syncGarage();syncMenu();$('gNote').textContent='Done. Every part it chose is on the car.';};
  setTimeout(next,0);
}
