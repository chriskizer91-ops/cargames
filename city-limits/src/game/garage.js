/* =====================================================================================
   CITY LIMITS — THE GARAGE: Marisol's place on Central Avenue, where the car on the turntable is
   yours to change a part at a time. Dirt Sleeper HD's parts and ratings (hd/56-58) under a City Limits
   panel made for a phone held sideways:
   - the cars along the top (the dealer's, with their price or who you need to know, in a career)
   - the factory builds as quick picks, then the slots by group (engine, drivetrain, chassis, body),
     each opening to its choices: what it does, what it costs, whether it fits
   - the six ratings (dirt to asphalt, 0 to 50) and the figures, with what a change would do
   A part you own goes straight on. One you don't goes on for a look first, with a bar to buy it
   (everything you're trying adds up) or put it all back. Free play owns everything.
   ===================================================================================== */
import {DEALER} from './profile.js';
import {PEOPLE} from './quests.js';

const $m=n=>'$'+Math.round(n).toLocaleString('en-US');
const esc=s=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
const LOCK_WHO={quiet:['marisol','The Quiet One'],nightrunner:['vince','Night Runner'],twohundred:['hal','Two Hundred']};
const SWATCH={glow:{none:'transparent',cyan:'#19d9ff',magenta:'#ff27b3',green:'#33ff59',amber:'#ff9a1a',violet:'#9a4dff',white:'#e6ebff'}};

export class Garage{
  constructor(root,o){this.root=root;this.o=o;this.open_=false;this.group='engine';this.slot=null;this.prev=null;this.msg='';this.z60=new Map();
    root.addEventListener('click',e=>{const b=e.target.closest('[data-a]');if(!b||b.disabled)return;this.act(b.dataset.a,b.dataset.v,b);});}
  get P(){return this.o.profile();}
  get HD(){return this.o.HD;}
  open(){this.open_=true;this.root.hidden=false;this.car=this.P.current;this.prev=null;this.slot=null;this.msg='';this.show();this.render();}
  close(){clearTimeout(this.st);this.root.classList.remove('busy');if(this.prev||this.pending){this.prev=null;this.pending=false;this.o.spawnRig(this.car,this.rig());}this.open_=false;this.root.hidden=true;}
  rig(){return this.prev||(this.P.hasCar(this.car)?this.P.rig(this.car):this.HD.presetRig(DEALER[this.car].base));}
  /* put the car (as it would be) on the turntable */
  show(){clearTimeout(this.st);this.pending=true;this.root.classList.add('busy');
    /* a new model can take a moment to build: let the panel answer first */
    this.st=setTimeout(()=>{this.pending=false;this.o.spawnRig(this.car,this.rig());this.root.classList.remove('busy');},16);}
  act(a,v){
    const P=this.P,HD=this.HD;this.msg='';
    if(a==='back'){this.close();this.o.back();return;}
    if(a==='drive'){if(!P.hasCar(this.car))this.car=P.current;this.close();P.current=this.car;this.o.drive();return;}
    if(a==='car'){this.car=v;this.prev=null;this.slot=null;if(P.hasCar(v))P.current=v;this.show();}
    else if(a==='buycar'){if(P.buyCar(this.car)){this.msg='It\'s yours. The keys are on the dash.';this.o.sfx&&this.o.sfx('buy');this.show();}else this.msg='Not enough money yet.';}
    else if(a==='group'){this.group=v;this.slot=null;}
    else if(a==='slot'){this.slot=this.slot===v?null:v;}
    else if(a==='opt'){const r=Object.assign({},this.rig(),{[this.slot]:this.val(this.slot,v)});HD.fixRig(this.car,r);this.tryRig(r);}
    else if(a==='preset'){const r=HD.presetRig(v);r.paint=this.rig().paint;if(v===DEALER[this.car].base||HD.PRESET_PARTS[v].paint>=0)r.paint=HD.PRESET_PARTS[v].paint;this.tryRig(r);}
    else if(a==='buy'){if(P.buyRig(this.car,this.prev)){this.prev=null;this.msg='Bought and fitted.';this.o.sfx&&this.o.sfx('buy');}else this.msg=`You need ${$m(P.costOf(this.car,this.prev)-P.money)} more.`;}
    else if(a==='cancel'){this.prev=null;this.show();}
    else if(a==='level'){this.o.level(v);}
    else if(a==='quality'){this.o.quality(v);return;}
    this.render();
  }
  /* option values come back from the page as text: give them their type */
  val(slot,v){const o=this.HD.slotOptions(this.car,slot,this.rig()).find(q=>String(q[0])===v);return o?o[0]:v;}
  /* a new rig: straight on if it's all owned, else on for a look with the bill */
  tryRig(r){const P=this.P,cost=P.costOf(this.car,r);
    if(cost===0){P.setRig(this.car,r);this.prev=null;}else this.prev=r;
    this.show();}
  ratings(rig){try{return this.HD.rateRig(this.car,rig);}catch(e){console.warn(e);return null;}}
  /* the 0-60 measured on the game's physics, worked out a moment after you stop changing things */
  z60Of(rig){const i=this.HD.rigBuild(this.car,rig),id=this.HD.BUILDS[i].id;if(this.z60.has(id))return this.z60.get(id);
    clearTimeout(this.zt);this.zt=setTimeout(()=>{try{this.z60.set(id,this.HD.measure60(i));}catch(e){this.z60.set(id,null);}if(this.open_)this.render();},350);return undefined;}
  render(){
    const P=this.P,HD=this.HD,car=this.car,own=P.hasCar(car),rig=this.rig(),mph=this.o.settings.units!=='kmh';
    const cars=HD.CARS.filter(([id])=>DEALER[id]).map(([id,n])=>{const has=P.hasCar(id),open=P.carOpen(id);
      const tag=has?'':open?$m(DEALER[id].price):'Locked';return `<button class="gc${id===car?' on':''}${has?'':' shop'}" data-a="car" data-v="${id}"><b>${n}</b>${tag?`<i>${tag}</i>`:''}</button>`;}).join('');
    const mc=P.medalCount();
    let body='';
    if(!own){const D=DEALER[car],b=HD.BUILDS.find(q=>q.id===D.base),open=P.carOpen(car),lk=D.quest&&LOCK_WHO[D.quest];
      body=`<div class="gdeal"><div class="gk">The dealer</div><h3>${esc(HD.CARS.find(c=>c[0]===car)[1])}</h3><p>${esc(b.blurb)}</p>
        ${open?`<button class="gbig" data-a="buycar" ${P.money<D.price?'disabled':''}>Buy it · ${$m(D.price)}</button>${P.money<D.price?`<p class="gwarn">You have ${$m(P.money)}. Challenges and the town's people pay.</p>`:''}`
          :`<p class="gwarn">Not for sale to just anyone. ${lk?`${esc(PEOPLE[lk[0]].name)} might put in a word: finish "${esc(lk[1])}".`:''}</p>`}</div>`;}
    else{
      const presets=HD.presetsOf(car).map(id=>{const b=HD.BUILDS.find(q=>q.id===id),c=P.costOf(car,HD.presetRig(id)),same=HD.SLOTS.every(([s])=>s==='paint'||String(HD.PRESET_PARTS[id][s])===String(rig[s]));
        return `<button class="gp${same?' on':''}" data-a="preset" data-v="${id}"><b>${esc(b.name)}</b>${c&&!same?`<i>${$m(c)}</i>`:''}</button>`;}).join('');
      const groups=HD.SLOT_GROUPS.map(([g,n])=>`<button class="gg${g===this.group?' on':''}" data-a="group" data-v="${g}">${n}</button>`).join('');
      const rows=HD.SLOTS.filter(([s,g])=>g===this.group).map(([s,,name])=>{
        const opts=HD.slotOptions(car,s,rig);if(opts.length<2)return '';
        const cur=opts.find(q=>String(q[0])===String(rig[s])),open=this.slot===s;
        let h=`<button class="gs${open?' on':''}" data-a="slot" data-v="${s}"><span>${esc(name)}</span><b>${esc(cur?cur[1]:'')}</b><i>${open?'▴':'▾'}</i></button>`;
        if(open)h+=`<div class="gopts">`+opts.map(([v,lab,note,price])=>{const on=String(v)===String(rig[s]),fit=HD.fits(car,rig,s,v),owned=P.owns(car,s,v);
          const sw=s==='paint'?(v>=0?HD.PAINTS[v][1]:HD.BUILDS.find(q=>q.id===rig.kit).paint):s==='glow'?SWATCH.glow[v]:s==='wheels'&&v!=='kit'?(HD.WHEELS.find(w=>w[0]===v)||[])[2]:null;
          const tag=on?'<em class="on">fitted</em>':fit?`<em class="no">${esc(fit)}</em>`:owned?(P.free?'':'<em>owned</em>'):`<em>${$m(price)}</em>`;
          return `<button class="go${on?' on':''}${fit&&!on?' nofit':''}" data-a="opt" data-v="${esc(v)}" ${fit&&!on?'disabled':''}>${sw!=null?`<s style="--sw:${sw}"></s>`:''}<b>${esc(lab)}</b>${tag}${note&&!['paint','wheels','glow'].includes(s)?`<small>${esc(note)}</small>`:''}</button>`;}).join('')+`</div>`;
        return h;}).join('');
      body=`<div class="gpre"><span>Builds</span>${presets}</div><div class="ggs">${groups}</div><div class="gslots">${rows}</div>`;}
    /* the ratings and figures, and what the change in hand would do */
    const R=this.ratings(rig),R0=this.prev&&own?this.ratings(P.rig(car)):null,z=this.z60Of(rig);
    let stats='';if(R){const f=R.figs,d=k=>{if(!R0)return '';const x=R[k]-R0[k];return x?`<i class="${x>0?'up':'dn'}">${x>0?'+':''}${x}</i>`:'';};
      stats=`<div class="gfig"><b>${f.hp.toLocaleString('en-US')} hp</b> · ${(mph?Math.round(f.kg*2.20462).toLocaleString('en-US')+' lb':f.kg.toLocaleString('en-US')+' kg')} · ${f.drv} · 0-60 ${z==null?(z===null?'—':'…'):z.toFixed(1)+' s'} · ${mph?f.top+' mph':Math.round(f.top*1.609)+' km/h'}</div>`+
      HD.TERRAINS.map(([k,n,desc])=>`<div class="gr" title="${esc(desc)}"><span>${HD.TERRAIN_SHORT[k]}</span><div class="gbar"><u style="width:${R[k]*2}%"></u>${R0?`<o style="left:${R0[k]*2}%"></o>`:''}</div><b>${R[k]}</b>${d(k)}</div>`).join('');}
    const cost=this.prev?P.costOf(car,this.prev):0;
    const bar=this.prev?`<div class="gbuy"><span>Trying it on · <b>${$m(cost)}</b>${!P.free&&P.money<cost?` <em>(you have ${$m(P.money)})</em>`:''}</span><button data-a="cancel">Put it back</button><button class="gbig" data-a="buy" ${!P.free&&P.money<cost?'disabled':''}>Buy</button></div>`:'';
    const S=this.o.settings;
    this.root.innerHTML=`<div class="gtop"><button class="gback" data-a="back" aria-label="Back to the title">‹</button><b class="gmode">${P.free?'Free play':'Career'} · Garage</b>
      <span class="gmoney">${P.free?'Score ':''}${$m(P.money)}</span><span class="gload">building the car…</span><span class="gmed"><i class="m0">●</i>${mc[0]} <i class="m1">●</i>${mc[1]} <i class="m2">●</i>${mc[2]}</span>
      <button class="gdrive" data-a="drive">${own?'Drive':'Drive the '+esc(HD.CARS.find(c=>c[0]===P.current)[1])} ›</button></div>
      <div class="gcars">${cars}</div><div class="gmain"><div class="gpanel">${body}${this.msg?`<p class="gmsg">${esc(this.msg)}</p>`:''}</div>${bar}</div>
      <div class="gstats">${stats}<div class="gset">${this.o.LEVELS.map(([id,n])=>`<button class="${S.level===id?'on':''}" data-a="level" data-v="${id}">${n}</button>`).join('')}
        ${['mobile','low'].map(q=>`<button class="${S.quality===q?'on':''}" data-a="quality" data-v="${q}">${q==='mobile'?'Gfx: Mobile':'Gfx: Low'}</button>`).join('')}</div></div>`;
  }
}
