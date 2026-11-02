/* =====================================================================================
   NITROUS OUT IN THE WILD. The bottle (40_physics' pt.nos: eight seconds of shot, whatever the size) used to fill
   only when the car was built, so an empty one meant a trip to the Garage tab. Now: in free play the bottle is
   always full. In the career a bottle comes from Deke at the gas station on Highway 40 east: at his pumps it is
   the bottle's price and no wait; anywhere else it is called for from the Drive tab, paid for at once, and Deke
   brings it out at a delivery's pace, the clock on the HUD (DEKE 1:12). You can keep driving; it finds you. A
   rebuild in the Garage tab no longer fills the bottle for free in the career; a new kit comes full, as a bought
   part would. The physics is untouched: the bottle is a number the game sets.
   ===================================================================================== */
const NOS={pending:null,
  /* a bottle by the kit's shot (56_parts' NITROUS: none, 35, 75, 125, 250), the fee for the drive out, Deke's pace
     in m/s, the shortest wait, and how near the pumps counts as at them */
  BOTTLE:[0,120,180,250,320],FEE_PER_KM:80,PACE:24,MIN_WAIT:15,PUMPS_R:45};
/* the kit on this car: the shot's index in NITROUS (0: no kit, nothing to fill) */
const nosKit=()=>{const t=GAME.car;return t&&t.pt.e.nosKw?(t.pt.e.nos|0)||1:0;};
/* what a bottle costs from where the car is: at the pumps the bottle alone; out here the bottle, a fee by the
   distance, and the wait for the drive out (a delivery's pace, never under a quarter of a minute) */
function nosQuote(){const t=GAME.car,d=PEOPLE.deke,dist=Math.hypot(t.p[0]-d.x,t.p[2]-d.z),bottle=NOS.BOTTLE[nosKit()]||0,pumps=dist<NOS.PUMPS_R,
  fee=pumps?0:Math.round(dist/1000*NOS.FEE_PER_KM/10)*10,secs=pumps?0:Math.max(NOS.MIN_WAIT,Math.round(dist/NOS.PACE));return {price:bottle+fee,bottle,fee,secs,pumps,dist};}
const nosClock=s=>{s=Math.max(0,Math.ceil(s));return Math.floor(s/60)+':'+String(s%60).padStart(2,'0');};
/* the order (in the career the buy bar has asked first): paid for now; filled now at the pumps, or when Deke gets here */
function nosOrder(){const t=GAME.car;if(!t||!nosKit()||NOS.pending)return false;const q=nosQuote();if(!spend(q.price))return false;
  if(q.pumps){t.pt.nos=1;say('A FRESH BOTTLE FROM DEKE',2.5,PAL.cyan);buzz(20);}
  else{NOS.pending={t:q.secs};say("DEKE'S ON HIS WAY OUT WITH A BOTTLE",3,PAL.cyan);}
  return true;}
/* each frame of driving: free play's bottle kept full; the delivery's clock (it waits with the physics under the menu) */
function nosStep(dt){const t=GAME.car;if(!t)return;
  if(!CAREER.on){if(t.pt.e.nosKw)t.pt.nos=1;NOS.pending=null;return;}
  const p=NOS.pending;if(!p)return;p.t-=dt;
  if(p.t<=0){NOS.pending=null;if(t.pt.e.nosKw)t.pt.nos=1;say("DEKE: HERE'S YOUR BOTTLE",3,PAL.cyan);buzz(30);}}
/* the HUD's chip while Deke is on his way */
function nosHud(C){if(NOS.pending)C.push(['DEKE '+nosClock(NOS.pending.t),true,PAL.gold]);}
/* the bottle carried over a rebuild of the same car in the career (the Garage tab used to fill it for free);
   another car, or a new kit, comes with its own full bottle */
function nosCarry(before,beforeKit,beforeCar){const t=GAME.car;if(!CAREER.on||!t||!t.pt.e.nosKw||before===undefined)return;
  if(t.build.car===beforeCar&&nosKit()===beforeKit)t.pt.nos=before;}
/* the Drive tab's row: what a bottle would cost from here, or why there is nothing to buy */
function syncNos(){const el=$('mNos'),tx=$('mNosTxt');if(!el||!tx)return;const t=GAME.car,kit=t?nosKit():0;el.hidden=true;
  if(!kit){tx.textContent='No nitrous kit on this car. The Garage tab fits one.';return;}
  if(!CAREER.on){tx.textContent='Unlimited in free play: the bottle is always full.';return;}
  const p=NOS.pending;if(p){tx.textContent="Deke's on his way out with a bottle: "+nosClock(p.t)+' to go.';return;}
  const q=nosQuote(),left=Math.round(clamp(t.pt.nos,0,1)*100);
  if(left>=99){tx.textContent='The bottle is full.';return;}
  el.hidden=false;
  if(q.pumps){el.textContent='Fill up';tx.textContent=`At Deke's pumps: a bottle for ${Feats.fmtMoney(q.bottle)}, no wait. ${left}% left now.`;}
  else{el.textContent='Call Deke';tx.textContent=`A bottle brought out here: ${Feats.fmtMoney(q.bottle)} plus ${Feats.fmtMoney(q.fee)} for the drive, about ${nosClock(q.secs)}. Or fill up at his pumps on Highway 40 east for the bottle alone. ${left}% left now.`;}}
function buildNos(){const el=$('mNos');if(!el)return;el.addEventListener('click',()=>{if(!GAME.car||!nosKit()||NOS.pending)return;const q=nosQuote();
  askBuy(q.pumps?'A bottle from Deke':'A bottle from Deke, brought out here',q.price,()=>{nosOrder();syncNos();});});}
