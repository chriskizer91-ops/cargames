/* =====================================================================================
   CAREER: the slow grind. You start with your own truck (the stock Mountaineer) and $1,500. Every feat pays
   the same as in free play, and the money is yours to spend: parts at their garage prices, a car or a quad
   at its price. The odd ones can't be bought at all: each is a joke reward for something silly, and none of
   them helps (a golf cart for getting the stock truck through the mud pit, a kids' quad for rolling it five
   times...). Free play keeps its own money, rigs and bests; the career has its own, saved on this device,
   and as a code you can copy out and paste back in.
   ===================================================================================== */
const CAR_PRICE={trail:9500,wagon:14000,pickup:16000,hatch:38000,muscle:45000,coupe:72000,quad450:6500,quadUtil:7800,sxs:17500};
/* the joke rewards: what earns each one, how much of it, and the line it comes with */
const JOKES={
  golf:{goal:'Get the stock Mountaineer through the mud pit, no parts changed.',need:1,line:'Fine on the cart path. It will not go through the mud pit.'},
  quad90:{goal:'Roll something over five times.',need:5,line:'Something a little closer to the ground. Mind the limiter screw.'},
  kart:{goal:'Lap the race track in under 0:50.',need:1,line:'Fast on the track. Useless anywhere else on the ranch.'},
  tractor:{goal:'Get stuck in the mud and dig yourself out, three times.',need:3,line:'You clearly need a tow. Top speed: about 12 mph.'},
  semi:{goal:'Drive 30 miles of county road.',need:30,unit:'mi',line:'No trailer, no load, and it tips over on Red Hill.'}};
const CAREER_START=1500;
const Career=(()=>{
  const C={S:null,free:null,stuck:null,upright:true,mi:0};
  const fresh=()=>({v:1,started:Date.now(),cars:{suv:1},parts:{},rigs:{},car:'suv',prog:{golf:0,quad90:0,kart:0,tractor:0,semi:0}});
  const on=()=>APP.mode==='career'&&!!C.S;
  /* ---------- saving ---------- */
  function load(){try{const d=JSON.parse(store.get('mdrs-career-own','null'));if(d&&d.v===1&&d.cars){d.prog=Object.assign(fresh().prog,d.prog||{});d.parts=d.parts||{};d.rigs=d.rigs||{};return d;}}catch(e){}return null;}
  function save(){if(!C.S)return;C.S.car=APP.mode==='career'?APP.car:C.S.car;if(APP.mode==='career')C.S.rigs=Object.assign({},RIGS);store.set('mdrs-career-own',JSON.stringify(C.S));}
  /* ---------- what you own ---------- */
  const priceOf=(car,slot,val)=>{const o=slotOptions(car,slot,Object.assign({},rigOf(car),{[slot]:val})).find(q=>q[0]===val);return o?o[3]||0:0;};
  function owns(car,slot,val){if(!on())return true;if(!priceOf(car,slot,val))return true;const p=C.S.parts[car];return !!(p&&p[slot]&&p[slot].includes(String(val)));}
  function own(car,slot,val){const p=C.S.parts[car]||(C.S.parts[car]={}),l=p[slot]||(p[slot]=[]);if(!l.includes(String(val)))l.push(String(val));}
  const hasCar=car=>!on()||!!C.S.cars[car];
  /* a car comes with its factory parts */
  function giveCar(car){C.S.cars[car]=1;const st=presetRig(CAR_STOCK[car]);for(const [k] of SLOTS)if(st[k]!==undefined)own(car,k,st[k]);}
  const money=()=>Feats.S.money;
  function spend(n){Feats.S.money-=n;Feats.save();}
  /* buy one part and put it on; false if it can't be afforded */
  function buyPart(car,slot,val){const pr=priceOf(car,slot,val);if(pr>money())return false;spend(pr);own(car,slot,val);save();say('BOUGHT  -'+Feats.fmtMoney(pr),2,'#ffd84a');return true;}
  /* a preset: what its parts you don't own yet would cost */
  function missing(car,id){const P=presetRig(id),out=[];let cost=0;
    for(const [k] of SLOTS){if(P[k]===undefined||owns(car,k,P[k]))continue;const pr=priceOf(car,k,P[k]);out.push([k,P[k]]);cost+=pr;}
    return {cost,parts:out};}
  function buyPreset(car,id){const m=missing(car,id);if(m.cost>money())return false;spend(m.cost);for(const [k,v] of m.parts)own(car,k,v);save();if(m.cost)say('BOUGHT THE PARTS  -'+Feats.fmtMoney(m.cost),2.2,'#ffd84a');return true;}
  function buyCar(car){const pr=CAR_PRICE[car];if(!pr||pr>money())return false;spend(pr);giveCar(car);save();say('BOUGHT: '+carName({car}).toUpperCase(),2.6,'#ffd84a');return true;}
  /* a saved rig that has parts you don't own goes back to the factory part in each such slot */
  function ownedRig(car,r){const st=presetRig(CAR_STOCK[car]),out=Object.assign({},r);for(const [k] of SLOTS)if(!owns(car,k,out[k]))out[k]=st[k];return fixRig(car,out);}
  /* ---------- in and out of the career ---------- */
  function enter(F){
    if(C.S&&APP.mode==='career')return;
    C.free=F||{car:APP.car,rigs:Object.assign({},RIGS)};
    let S=load();const isNew=!S;if(!S)S=fresh();C.S=S;APP.mode='career';
    Feats.load('mdrs-career');Feats.S.session=0;if(isNew){Feats.S.money=CAREER_START;Feats.S.log=[];Feats.S.best={};Feats.save();giveCar('suv');}
    for(const k of Object.keys(RIGS))delete RIGS[k];
    for(const car in S.rigs)if(CAR_PARTS[car]&&S.cars[car])RIGS[car]=ownedRig(car,cleanRig(car,S.rigs[car]));
    APP.car=S.cars[S.car]?S.car:'suv';save();saveGame();
    if(isNew)say('CAREER STARTED: $1,500 AND YOUR TRUCK',3.2,'#ffd84a');
  }
  function leave(){
    if(APP.mode!=='career')return;save();
    APP.mode='free';for(const k of Object.keys(RIGS))delete RIGS[k];
    const F=C.free||{car:'suv',rigs:{}};Object.assign(RIGS,F.rigs);APP.car=F.car;C.S=null;
    Feats.load('mdrs-free');Feats.S.session=0;saveGame();
  }
  /* the free-play rigs while the career is on, for saveGame */
  const freeState=()=>C.free||{car:APP.car,rigs:RIGS};
  function restart(){store.set('mdrs-career-own','null');store.set('mdrs-career','{}');if(APP.mode==='career'){const F=C.free;C.S=null;APP.mode='free';enter(F);}}
  /* the save code: everything in the career as one line of text */
  function code(){save();const d={own:C.S||load(),feats:JSON.parse(store.get('mdrs-career','{}')||'{}')};return 'MDRS1.'+btoa(unescape(encodeURIComponent(JSON.stringify(d))));}
  function loadCode(txt){
    try{const s=String(txt).trim();if(!s.startsWith('MDRS1.'))return 'That is not a Mini Dirt Run Solo save code.';
      const d=JSON.parse(decodeURIComponent(escape(atob(s.slice(6)))));if(!d.own||d.own.v!==1||!d.own.cars)return 'That save code is damaged.';
      store.set('mdrs-career-own',JSON.stringify(d.own));store.set('mdrs-career',JSON.stringify(d.feats||{}));
      if(APP.mode==='career'){const F=C.free;C.S=null;APP.mode='free';enter(F);}
      return '';}catch(e){return 'That save code could not be read.';}
  }
  /* ---------- the joke rewards ---------- */
  function progress(id,v,abs){if(!on()||C.S.cars[id])return;const J=JOKES[id],p=C.S.prog;const before=p[id];p[id]=abs?Math.max(p[id],v):p[id]+v;
    if(p[id]>=J.need){giveCar(id);save();say('UNLOCKED: '+MACH[id].name.toUpperCase(),3.4,'#ffd84a');say(J.line,4);buzz([40,40,40,40,120]);}
    else if(!J.unit&&Math.floor(p[id])!==Math.floor(before)){save();say(`${MACH[id].name.toUpperCase()} ${Math.floor(p[id])}/${J.need}`,1.8,'#ffd84a');}}
  Feats.onFeat=(kind,detail)=>{
    if(!on())return;
    if(kind==='mudpit'&&APP.car==='suv'&&rigName('suv',rigOf('suv'))==='Stock')progress('golf',1);
    if(kind==='lap'&&detail&&detail.s<50)progress('kart',1);
  };
  function step(dt,t){
    if(!on()||GAME.state!=='drive')return;
    /* rolled over (counted once each time, until it's back on its wheels) */
    const up=t.M[4];if(C.upright&&up<.25){C.upright=false;progress('quad90',1);}else if(!C.upright&&up>.8)C.upright=true;
    /* stuck in the mud: on the gas, going nowhere, for a few seconds; then out and moving again */
    let mud=0;for(const w of t.wheels)if(w.contact&&(w.surf==='mud'||w.surf==='ruts'))mud++;
    if(!C.stuck){if(mud>=2&&t.speed<.5&&t.thrIn>.5){C.stuckT=(C.stuckT||0)+dt;if(C.stuckT>3){C.stuck={t:0};say('STUCK',1.6,'#c8a070');}}else C.stuckT=0;}
    else{if(t.speed>3){C.stuck.t+=dt;if(C.stuck.t>1){C.stuck=null;C.stuckT=0;progress('tractor',1);}}else C.stuck.t=0;}
    /* county road miles */
    if(GAME.place==='County road'&&!C.S.cars.semi){C.mi+=t.speed*dt/1609.34;if(C.mi>.05){progress('semi',C.mi);C.mi=0;}}
  }
  return {on,enter,leave,save,owns,hasCar,priceOf,buyPart,missing,buyPreset,buyCar,ownedRig,freeState,restart,code,loadCode,step,money,get S(){return C.S;}};
})();
