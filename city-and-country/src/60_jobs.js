/* =====================================================================================
   THE COUNTY'S PEOPLE AND WHAT THEY ASK (City Limits' quests, moved onto this map, and one more person out at
   the off-road park). Marisol at the garage on Neon Row, Deke at the gas station east on Highway 40, Rosa at
   the Starlite west on it, Vince and the Neon Row crew, Bo at the park's paddock, and Old Hal out on the salt.
   A column of light in someone's colour means they have work for you: stop beside them and listen. One job at
   a time; where the job wants you next has a green column, and an arrow points there. A job's steps:
     talk     stop by someone             deliver  get somewhere before the clock runs out
     goto     find a place                chal     a medal (or better) in a challenge
     part     put a new part on           medals   so many medals in all
     speed    so fast, on the salt
   Finishing pays; three of them open a car at the dealer (60_career's DEALER). The career keeps its jobs in
   its own save; free play keeps its own beside its challenges (cc-fchal) and pays into the score.
   ===================================================================================== */
const PEOPLE={
  marisol:{name:'Marisol Vega',short:'Marisol',role:'runs the garage on Neon Row',x:58,z:114,col:'#ff8a3d'},
  deke:{name:'Deke',short:'Deke',role:'works nights at the gas station',x:466,z:-20,col:'#ffd23f'},
  rosa:{name:'Rosa',short:'Rosa',role:'owns the Starlite Diner',x:-470,z:22,col:'#ff5c8a'},
  vince:{name:'Vince',short:'Vince',role:'runs with the Neon Row crew',x:-205,z:120,col:'#4fe3ff'},
  bo:{name:'Bo Tanner',short:'Bo',role:'runs the off-road park',x:WG.PKW.LOT.x1-28,z:WG.PKW.LOT.z0+30,col:'#8dff5a'},
  hal:{name:'Old Hal',short:'Hal',role:'has lived out on the salt since 1971',x:WG.HAL.x,z:WG.HAL.z+6,col:'#b9a7ff'}};
const JOB_NAMES={};
/* (once: the list to walk each frame, each person's colour packed for the HUD and as floats for the lights) */
const PEOPLE_LIST=Object.entries(PEOPLE);
for(const [,p] of PEOPLE_LIST){p.pc=hx(p.col);const v=parseInt(p.col.slice(1),16);p.rgb=[(v>>16&255)/255,(v>>8&255)/255,(v&255)/255];}
function buildJobs(){
  const O=WG.OL,A={};
  /* the crate: on the Outer Loop up in the hills north-east of town; the camp: where the Loop crosses Ridge Road */
  O.at(4700,A);const crate={x:A.x,z:A.z};
  let cs=0,cd=1e18;for(let s=2600;s<3600;s+=4){O.at(s,A);const d=Math.abs(A.x-WG.offNS(0,A.z));if(d<cd){cd=d;cs=s;}}O.at(cs,A);const camp={x:A.x,z:A.z};
  const Q=(id,who,title,needs,intro,steps,outro,reward,tip)=>{JOB_NAMES[id]=`${PEOPLE[who].short}'s job, ${title}`;return {id,who,title,needs,intro,steps,outro,reward,tip};};
  return [
  Q('firstnight','marisol','First Night',[],
    ['So you\'re the one who bought the old SUV. It runs. I checked.','Go and say hi to Deke at the gas station, east out of town on Highway 40. He always has work going.'],
    [{t:'talk',who:'deke',text:'Meet Deke at the gas station, east on Highway 40'}],
    {who:'deke',text:'Marisol sent you? Good. Here, gas money for the drive over.'},{money:800},
    'The cyan columns of light are challenges: stop in one to start it. A column in someone\'s colour is a person with work for you. Esc (or the menu button) pauses, with the garage and every challenge.'),
  Q('grease','marisol','Grease Monkey',['firstnight'],
    ['A car isn\'t yours until you\'ve put something on it.','Put one new part on in the garage, anything at all, then come and show me.'],
    [{t:'part',text:'Put a new part on in the garage (menu, Garage)'},{t:'talk',who:'marisol',text:'Show Marisol at the garage on Neon Row'}],
    {text:'Not bad. Keep the receipt, that one\'s on me.'},{money:1500}),
  Q('quiet','marisol','The Quiet One',['grease'],
    ['I have an electric sedan on order for a customer who changed his mind.','Win five medals anywhere and I\'ll let it go at cost.'],
    [{t:'medals',n:5,text:'Win five medals in the challenges'},{t:'talk',who:'marisol',text:'Tell Marisol'}],
    {text:'It\'s at the dealer. You won\'t hear it coming, but you\'ll feel it.'},{money:3000,car:'ev'}),
  Q('jerrycan','deke','Jerry Can',['firstnight'],
    ['Rosa\'s generator at the diner ran dry, and her pies are in the cooler.','Take her this can. West on the highway, right through town, eighty seconds. Don\'t spill it.'],
    [{t:'deliver',who:'rosa',limit:80,text:'Get the fuel to Rosa at the Starlite'}],
    {who:'rosa',text:'Oh, you\'re a lifesaver. Lights on, pies saved. Come by any time, hon.'},{money:1200}),
  Q('saltfever','deke','Salt Fever',['jerrycan'],
    ['Every kid in town runs it once: from my pumps, flat out down the highway to the salt.','Any medal, and I\'ll know you\'re serious.'],
    [{t:'chal',id:'salt',medal:2,text:'Win a medal on Out to the Salt'},{t:'talk',who:'deke',text:'Back to Deke'}],
    {text:'Ha! Felt that one from here.'},{money:1500}),
  Q('lostload','deke','Lost Load',['saltfever'],
    ['A truck dropped a crate of parts somewhere on the Outer Loop, up in the hills north-east of town.','Find it and bring it back. Keep whatever\'s on top.'],
    [{t:'goto',x:crate.x,z:crate.z,r:10,name:'the crate',text:'Find the crate on the Outer Loop, north-east'},{t:'talk',who:'deke',text:'Bring the crate to Deke'}],
    {text:'That\'s the one. Told you the Loop eats crates.'},{money:3000}),
  Q('pies','rosa','Pies Before Midnight',['jerrycan'],
    ['There\'s a couple camped down in the hollow where Ridge Road crosses the Outer Loop. It\'s their anniversary, and they ordered a pie.','North on Ridge Road, all the way down. It\'s warm now. Keep it that way: three minutes.'],
    [{t:'deliver',x:camp.x,z:camp.z,r:16,limit:180,name:'the camp',text:'Take the pie to the camp where Ridge Road meets the Loop'}],
    {who:'',text:'Two people on a blanket cheer and wave you off. Rosa will hear about this.'},{money:2000}),
  Q('bog','rosa','The Bog Ate My Truck',['pies'],
    ['My cook drove into the bog south of town to "save time". The truck is still in there.','Show him it can be done. Get through the bog. And maybe think about tyres.'],
    [{t:'chal',id:'bog',medal:2,text:'Win a medal at The Bog'},{t:'talk',who:'rosa',text:'Back to Rosa'}],
    {text:'He says it was the truck\'s fault. Here, for your trouble.'},{money:2500}),
  Q('breakfast','rosa','Breakfast for Hal',['bog'],
    ['Old Hal lives out on the salt. One meal a day, and it\'s my breakfast plate.','East, all the way down the highway to where the asphalt stops. Two and a half minutes, or it\'s cold and he\'ll tell everyone.'],
    [{t:'deliver',who:'hal',limit:150,text:'Take the plate to Old Hal on the salt'}],
    {who:'hal',text:'Still warm. Huh. You can drive. Come and see me when you want to really go fast.'},{money:2000}),
  Q('prove','vince','Prove It',['firstnight'],
    ['New car in town. The crew wants to know if you can drive or just park.','Two laps of the boulevard. Silver, at least.'],
    [{t:'chal',id:'loop',medal:1,text:'Silver or better on the Limits Loop'},{t:'talk',who:'vince',text:'Find Vince on Neon Row'}],
    {text:'Okay. Okay. You can drive.'},{money:2000}),
  Q('sideways','vince','Sideways',['prove'],
    ['Fast is fine. Sideways is better. Neon Row is ours after midnight.','Silver in the drift zone and you\'re in the crew.'],
    [{t:'chal',id:'drift',medal:1,text:'Silver or better in Neon Row Drift'},{t:'talk',who:'vince',text:'Back to Vince'}],
    {text:'Welcome to the crew. Don\'t scratch the paint.'},{money:2500}),
  Q('nightrunner','vince','Night Runner',['sideways'],
    ['There\'s a wedge in a lock-up on the edge of town. Pop-up lamps, a V12, the whole poster.','Gold on the Downtown Dash and gold on the Downtown Quarter, and I make the call.'],
    [{t:'chal',id:'dash',medal:0,text:'Gold on the Downtown Dash'},{t:'chal',id:'quarter',medal:0,text:'Gold on the Downtown Quarter'},{t:'talk',who:'vince',text:'Back to Vince'}],
    {text:'The wedge is at the dealer. Don\'t make me regret it.'},{money:5000,car:'wedge'}),
  Q('dirtday','bo','Dirt Day',['firstnight'],
    ['Marisol says you drive. Out here we find out on the clay.','Three laps of Speedway 25. Any medal and you can call yourself a racer.'],
    [{t:'chal',id:'oval',medal:2,text:'Win a medal on Speedway 25'},{t:'talk',who:'bo',text:'Back to Bo at the paddock'}],
    {text:'Sliding it in, I saw. You\'ll do.'},{money:2000}),
  Q('mudseason','bo','Mud Season',['dirtday'],
    ['It rained for a week and the mud track ate half my field.','Bronze on the mud track. Bring a shovel. Or a winch.'],
    [{t:'chal',id:'mudtrack',medal:2,text:'Win a medal on the Mud Track'},{t:'talk',who:'bo',text:'Back to Bo'}],
    {text:'Look at the state of that. Beautiful.'},{money:2500}),
  Q('shortcourse','bo','Short Course Season',['mudseason'],
    ['The short course is where the trucks fly. Tabletops, whoops, the big sweeper.','Silver there, and I\'ll put your name on the board.'],
    [{t:'chal',id:'short',medal:1,text:'Silver or better on the Short Course'},{t:'talk',who:'bo',text:'Back to Bo'}],
    {text:'Your name\'s on the board. Spelled it right and everything.'},{money:3500}),
  Q('roundthecity','bo','Round the City',['shortcourse'],
    ['Nobody\'s run the whole Outer Loop in one go since the fords washed out. Fourteen kilometres of it.','Any medal. And don\'t drown it in the creek.'],
    [{t:'chal',id:'loopLap',medal:2,text:'Win a medal on The Outer Loop'},{t:'talk',who:'bo',text:'Back to Bo'}],
    {text:'All the way round. Ha! Drinks are on me.'},{money:6000}),
  Q('mile','hal','The Mile',['breakfast'],
    ['I ran the mile out here in \'71. Hundred and forty-one. Nobody\'s believed me since.','Win a medal in the Flying Mile and we\'ll talk.'],
    [{t:'chal',id:'mile',medal:2,text:'Win a medal in the Flying Mile'},{t:'talk',who:'hal',text:'Back to Hal'}],
    {text:'Now you know why I never left.'},{money:3000}),
  Q('twohundred','hal','Two Hundred',['mile'],
    ['Two hundred miles an hour. On the salt. Under the moon. That\'s the dream.','Do it, and I know a man selling a hypercar who owes me a favour.'],
    [{t:'speed',v:89.41,text:'Hit 200 mph on the salt flats'},{t:'talk',who:'hal',text:'Back to Hal'}],
    {text:'Two hundred! I\'ll call him tonight. It\'ll be at the dealer.'},{money:6000,car:'hyper'})
  ];
}
const JOBS=buildJobs();
const JOB={near:null,msgs:[],memo:null,tmemo:null,wrap:null,partT:0};
/* the game you're in: the career's jobs, or free play's */
const jRec=()=>{const d=chRec();if(!d.quests)d.quests={};if(d.active===undefined)d.active=null;return d;};
const jDone=id=>{const q=jRec().quests[id];return !!(q&&q.done);};
/* the job you're on and where it wants you: worked out once per step of it, not on every call */
const jActive=()=>{const a=jRec().active;if(!a)return null;const M=JOB.memo;if(M&&M.a===a&&M.step===a.step)return M.r;
  const q=JOBS.find(j=>j.id===a.id),r=q?{q,a,s:q.steps[a.step]}:null;JOB.memo={a,step:a.step,r};JOB.tmemo=null;return r;};
/* the job someone has for you now */
const jOffer=who=>JOBS.find(q=>q.who===who&&!jDone(q.id)&&q.needs.every(jDone))||null;
const jRigKey=()=>JSON.stringify(rigOf(APP.car));
function jAccept(q){const d=jRec();d.active={id:q.id,step:0,t0:null,bought:d.bought||0,rig:jRigKey()};jStartStep();chSave();say(q.title.toUpperCase(),2.4,hx(PEOPLE[q.who].col));}
function jDrop(){const d=jRec();d.active=null;chSave();}
function jStartStep(){const A=jActive();if(A)A.a.t0=A.s&&A.s.limit?0:null;}
/* where the current step wants you */
function jTarget(){const A=jActive();if(!A)return null;if(JOB.tmemo&&JOB.tmemo.A===A)return JOB.tmemo.tg;const tg=jTargetOf(A);JOB.tmemo={A,tg};return tg;}
function jTargetOf(A){const s=A.s;
  if(s.who){const p=PEOPLE[s.who];return {x:p.x,z:p.z,name:p.short,r:11,col:p.col};}
  if(s.t==='goto'||s.t==='deliver')return {x:s.x,z:s.z,name:s.name,r:s.r||10};
  if(s.t==='chal'){const c=CHALS.find(c=>c.id===s.id);return c?{x:c.start.x,z:c.start.z,name:c.name,r:13,chal:c}:null;}
  if(s.t==='speed')return {x:WG.HAL.x+600,z:0,name:'the salt flats',r:0};
  return null;}
/* each frame while driving (not during a challenge's run): is the step done? is someone near with work? */
function jobStep(dt,car){
  const x=car.p[0],z=car.p[2],slow=car.speed<3.5,A=jActive();
  if(A){const s=A.s,a=A.a;
    if(s.limit){a.t0+=dt;if(a.t0>s.limit){jRec().active=null;chSave();say('TOO LATE · '+A.q.title.toUpperCase(),3.5,PAL.red);say('ASK '+PEOPLE[A.q.who].short.toUpperCase()+' AGAIN',3.5,PAL.amber);return;}}
    let ok=false;const tg=jTarget();
    if(s.t==='talk'||s.t==='deliver'||s.t==='goto'){ok=tg&&Math.hypot(x-tg.x,z-tg.z)<tg.r&&(s.t==='goto'||slow);}
    else if(s.t==='chal')ok=chMedal(s.id)>=0&&chMedal(s.id)<=s.medal;
    else if(s.t==='part'){if(CAREER.on)ok=(jRec().bought||0)>a.bought;else if((JOB.partT-=dt)<=0){JOB.partT=.5;ok=jRigKey()!==a.rig;}}
    else if(s.t==='medals')ok=chMedalCount().reduce((p,q)=>p+q,0)>=s.n;
    else if(s.t==='speed')ok=car.speed>=s.v&&WG.saltD(x,z)>WG.LAND+260;
    if(ok)jAdvance();}
  JOB.near=null;if(slow)for(const [who,p] of PEOPLE_LIST){if(Math.hypot(x-p.x,z-p.z)>11)continue;const o=jOffer(who);
    if(o&&!(jRec().active&&jRec().active.id===o.id)){JOB.near={who,q:o};break;}}
}
function jAdvance(){const A=jActive(),a=A.a,q=A.q;a.step++;
  if(a.step>=q.steps.length){const d=jRec();d.quests[q.id]={done:true,at:Date.now()};d.active=null;chSave();
    const r=q.reward||{};if(r.money)earn(r.money);jobNote(q,'done');}
  else{jStartStep();chSave();const s=q.steps[a.step];say(s.text.toUpperCase(),3,PAL.green);if(s.t==='talk'||s.t==='deliver')buzz(20);}}
/* a new career opens with Marisol's first job (once) */
function jobIntro(){if(!CAREER.on||!CAREER.d||CAREER.d.seen.intro)return;CAREER.d.seen.intro=1;careerSave();
  const q=jOffer('marisol');if(q&&q.id==='firstnight'&&!jRec().active)setTimeout(()=>{if(GAME.state==='drive')jobListen('marisol');},500);}
/* ---------- the dialog: what someone asks, and what they say when it's done ---------- */
function jobListen(who){const q=jOffer(who);if(!q)return;const p=PEOPLE[who];
  jobDialog({who:p,eyebrow:p.role,title:q.title,lines:q.intro,steps:q.steps.map(s=>s.text),reward:q.reward,tip:q.tip,
    yes:['Take the job',()=>{if(jRec().active)jDrop();jAccept(q);}],no:'Not now',swap:!!jRec().active});}
function jobNote(q,how){const r=q.reward||{},w=q.outro&&q.outro.who!==undefined?q.outro.who:q.who,p=w?PEOPLE[w]:null;
  jobDialog({who:p,eyebrow:'Job done',title:q.title,lines:[q.outro.text],reward:r,done:true,no:'Drive on'});}
function jobDialog(o){
  GAME.state='jdlg';syncTouch();syncObj();const p=o.who;
  $('jdEyebrow').textContent=(p?p.name+' · ':'')+o.eyebrow;$('jdEyebrow').style.color=p?p.col:'';$('jdTitle').textContent=o.title;
  const L=$('jdLines');L.textContent='';for(const t of o.lines){const e=document.createElement('p');e.textContent=t;L.appendChild(e);}
  const S=$('jdSteps');S.textContent='';for(const t of o.steps||[]){const e=document.createElement('li');e.textContent=t;S.appendChild(e);}S.hidden=!(o.steps&&o.steps.length);
  const r=o.reward||{};$('jdPay').textContent=(r.money?(o.done?'+':'Pays ')+Feats.fmtMoney(r.money)+(CAREER.on?'':' score'):'')+(r.car?(r.money?' · ':'')+(o.done?'':'and opens ')+'the '+CARS.find(c=>c[0]===r.car)[1].toLowerCase()+' at the dealer':'');
  $('jdTip').textContent=o.tip||(o.swap?'Taking this drops the job you\'re on.':'');$('jdTip').hidden=!$('jdTip').textContent;
  const y=$('jdYes');y.hidden=!o.yes;if(o.yes){y.textContent=o.yes[0];JOB.yes=o.yes[1];}else JOB.yes=null;
  $('jdNo').textContent=o.no||'Not now';$('jdlg').hidden=false;setTimeout(()=>(o.yes?y:$('jdNo')).focus({preventScroll:true}),0);
}
function closeJobDialog(){if($('jdlg').hidden)return;$('jdlg').hidden=true;JOB.yes=null;if(GAME.state==='jdlg')GAME.state='drive';syncTouch();OBJ_KEY='~';}
function buildJobsUi(){
  $('jdYes').addEventListener('click',()=>{const f=JOB.yes;closeJobDialog();if(f)f();});
  $('jdNo').addEventListener('click',()=>closeJobDialog());
  addEventListener('keydown',e=>{if((e.code==='Enter'||e.code==='NumpadEnter')&&GAME.state==='drive'&&JOB.near&&!CHAL.ask&&!(CHAL.run&&CHAL.run.phase!=='done')){e.preventDefault();jobListen(JOB.near.who);}});
}
/* the HUD's line (60_chal's syncObj and drawJobHud): whose job, what now, the clock */
function jobHud(){const A=jActive();if(!A)return null;const s=A.s,p=PEOPLE[A.q.who];
  return {title:A.q.title,who:p.short,col:p.col,pc:p.pc,text:s.text||'',left:s.limit?Math.max(0,s.limit-A.a.t0):null,target:jTarget()};}
function drawJobHud(lx,sc){
  const j=jobHud();if(!j)return;const t=GAME.car,tch=GAME.touch;let y=7+7*sc+(tch?40:30);
  if(PARKT.on||PARKT.dr.st==='run'||PARKT.dr.st==='tree')y+=30;
  /* (the heading and the step's words wrapped to the HUD's width once, when the step or the screen changes) */
  const wk=j.title+'|'+j.text+'|'+W;if(!JOB.wrap||JOB.wrap.k!==wk){const lines=[];let line='';
    for(const w of j.text.toUpperCase().split(' ')){if(line&&tw3(line+' '+w)>Math.min(W*.42,190)){lines.push(line);line=w;}else line=line?line+' '+w:w;}if(line)lines.push(line);
    JOB.wrap={k:wk,head:(j.who+' · '+j.title).toUpperCase(),lines};}
  otxt3(JOB.wrap.head,lx,y,j.pc);let yy=y+8;for(const l of JOB.wrap.lines){otxt3(l,lx,yy,PAL.ink);yy+=8;}
  if(j.left!=null)otxt5(Math.floor(j.left/60)+':'+String(Math.floor(j.left%60)).padStart(2,'0'),lx,yy+1,j.left<15?GR.red:GR.volt,1);
  const g=j.target;if(!g||!g.r||CHAL.ask||JOB.near)return;
  const d=Math.hypot(g.x-t.p[0],g.z-t.p[2]),F=mcol(t.M,0),hy=Math.atan2(-F[2],F[0]),ty=Math.atan2(-(g.z-t.p[2]),g.x-t.p[0]);let a=ty-hy;while(a>PI)a-=TAU;while(a<-PI)a+=TAU;
  const ax=W/2+(tch?-48:0),ay=tch?50:30,dx=-Math.sin(a),dy=-Math.cos(a);hLine(ax,ay,ax+dx*7,ay+dy*7,PAL.green);hDisc(ax+dx*7,ay+dy*7,1.4,PAL.green);
  otxt3(fmtDist(d)+' · '+(g.NAME||(g.NAME=g.name.toUpperCase())),ax,ay+10,PAL.green,1,'c');
}
/* the lights: someone with work for you (their colour), where the job wants you (green) */
function jobMarks(out){
  const tg=jTarget(),A=jActive();let onP=false;
  for(const [who,p] of PEOPLE_LIST){const isT=tg&&tg.name===p.short&&!tg.chal,o=jOffer(who),off=o&&!(A&&A.q.id===o.id);if(isT)onP=true;
    if(isT)out.push({kind:'person',x:p.x,z:p.z,y:markY(p),r:2.6,col:COL_JOB,em:2.2});else if(off)out.push({kind:'person',x:p.x,z:p.z,y:markY(p),r:2.6,col:p.rgb,em:1.8});}
  if(tg&&tg.r&&!tg.chal&&!onP)out.push({kind:'person',x:tg.x,z:tg.z,y:markY(tg),r:3.2,col:COL_JOB,em:2.2});
}
/* the Jobs list in the Challenges tab */
function syncJobs(){
  const L=$('jbList');L.textContent='';const A=jActive(),n=JOBS.filter(q=>jDone(q.id)).length;$('jbCount').textContent=`${n} of ${JOBS.length} done`;
  for(const [who,p] of Object.entries(PEOPLE)){
    const mine=JOBS.filter(q=>q.who===who),el=document.createElement('div');el.className='race person';el.style.setProperty('--c',p.col);
    const o=jOffer(who),cur=A&&A.q.who===who?A.q:null;
    el.innerHTML='<b></b><small></small><i></i>';el.querySelector('b').textContent=p.name;
    el.querySelector('small').textContent=p.role[0].toUpperCase()+p.role.slice(1)+'. '+(cur?'On it: '+cur.title+'. '+A.s.text+'.':o?'Has work for you: '+o.title+'.':mine.every(q=>jDone(q.id))?'Nothing more for now.':'Nothing yet: '+mine.find(q=>!jDone(q.id)).needs.filter(x=>!jDone(x)).map(x=>JOBS.find(j=>j.id===x).title).join(', ')+' first.');
    el.querySelector('i').textContent=mine.map(q=>(jDone(q.id)?'✓ ':cur&&cur.id===q.id?'▸ ':'· ')+q.title).join('   ');
    if(cur){const b=document.createElement('button');b.type='button';b.className='btn sm';b.textContent='Drop this job';b.style.marginTop='4px';b.addEventListener('click',()=>{jDrop();syncJobs();});el.appendChild(b);}
    L.appendChild(el);}
}
