/* =====================================================================================
   THE TUNER BAY: the game's Tune sheet (Road Not Found's dyno lab, 63_dyno_lab), its rows that change how the truck
   goes (the ones that only change its sound wait for the sound), over a dyno chart of the engine as it stands.
   Every change goes through the game's own path (16_engines engineSpec with the sheet's keys, the same rules:
   a bigger engine keeps its torque per litre, a lower redline pulls the launch revs and the idle down with it),
   plus the game's Plus tune, the final drive and the driving level. Kept in this page's own save (sm-mini).
   ===================================================================================== */
const ETA=.88;
export function makeTuner({DR,box,chart,stats,state,onChange}){
  const SIM=DR.SIM,E0=DR.baseEngine(),BASE=Object.assign({},SIM.DEFAULTS,E0.src0),FD0=E0.fd;
  const turboOf=o=>o.fi==='turbo'||o.fi==='twin';
  const fmtN=n=>Math.round(n).toLocaleString('en-US');
  const ROWS=[
    {h:'Engine'},
    {k:'layout',l:'Layout',t:'select',opts:()=>SIM.LAYOUT_IDS.filter(id=>!SIM.LAYOUTS[id].kind).map(id=>[id,SIM.LAYOUTS[id].name])},
    {k:'disp',l:'Displacement',t:'range',rng:()=>[.5,Math.max(9,Math.ceil(BASE.disp*1.8)),.05],fmt:v=>v.toFixed(2)+' L',why:'The torque goes with it, litre for litre.'},
    {k:'redline',l:'Redline',t:'range',rng:()=>{const r0=BASE.redline,st=100;return [Math.min(4000,Math.floor(r0*.6/st)*st),Math.min(20000,Math.max(9000,Math.ceil(r0*1.8/st)*st)),st];},fmt:v=>fmtN(v)+' rpm'},
    {k:'cam',l:'Camshaft',t:'seg',opts:()=>SIM.CAMS.map((n,i)=>[i,n])},
    {h:'Induction'},
    {k:'fi',l:'Type',t:'select',opts:()=>Object.entries(SIM.INDUCTION)},
    {k:'boost',l:'Boost',t:'range',rng:()=>[.2,3.5,.05],fmt:v=>v.toFixed(2)+' bar · '+Math.round(v*14.5)+' psi',show:o=>o.fi!=='none'},
    {k:'tsize',l:'Turbo size',t:'seg',opts:()=>SIM.TURBO_SIZE.map((s,i)=>[i,s.n]),show:turboOf},
    {k:'antilag',l:'Anti-lag',t:'toggle',show:turboOf},
    {k:'intake',l:'Intake',t:'select',opts:()=>SIM.INTAKES.map((n,i)=>[i,n])},
    {h:'Exhaust'},
    {k:'ex',l:'System',t:'select',opts:()=>SIM.EXHAUSTS.map((n,i)=>[i,n])},
    {h:'Nitrous'},
    {k:'nos',l:'Shot',t:'seg',opts:()=>SIM.NOS_SHOTS.map((n,i)=>[i,n?n+' hp':'None']),why:'Hold NOS (N or Shift) with the gas floored. Eight seconds a bottle; it refills while you are off it.'},
    {h:'Plus'},
    {k:'plus',l:'Plus power',t:'range',rng:()=>[1,2,.01],fmt:v=>v<1.005?'Off':'× '+v.toFixed(2),why:"The game's Plus tune: the same engine with this many times the torque at every rev. Where the 300s live."},
    {h:'Gearing'},
    {k:'fd',l:'Final drive',t:'range',rng:()=>[1.5,5,.01],fmt:v=>v.toFixed(2)+(Math.abs(v-FD0)<.005?' (stock)':''),why:'Lower is taller: more top speed, slower off the line.'},
    {h:'Driving'},
    {k:'level',l:'Help',t:'seg',opts:()=>Object.entries(DR.ASSISTS).map(([id,a])=>[id,a.name])},
  ];
  const params=()=>Object.assign({},BASE,state.T);
  const val=r=>r.k==='fd'?state.fd||FD0:r.k==='plus'?state.plus||1:r.k==='level'?state.level:params()[r.k];
  function set(r,v,final){
    if(r.k==='fd'){state.fd=Math.abs(v-FD0)<.005?0:v;}
    else if(r.k==='plus'){state.plus=v<1.005?0:v;}
    else if(r.k==='level'){state.level=v;}
    else{const o={[r.k]:v},cur=params();
      if(r.k==='disp')o.tq=BASE.tq/BASE.disp*v;
      if(r.k==='redline'){if((cur.launchRpm||0)>v*.9)o.launchRpm=Math.round(v*.65/100)*100;if((cur.idle||0)>v*.6)o.idle=Math.round(v*.3);}
      const T=Object.assign({},state.T,o);
      for(const q in T)if(BASE[q]!==undefined&&(T[q]===BASE[q]||Math.abs(+T[q]-+BASE[q])<1e-9))delete T[q];
      state.T=T;}
    refresh(final);
  }
  /* the rows */
  const rows=[];let sec=null;
  for(const r of ROWS){
    if(r.h){sec=document.createElement('div');sec.className='sec';const h=document.createElement('h3');h.textContent=r.h;sec.appendChild(h);box.appendChild(sec);r.el=sec;rows.push(r);continue;}
    const row=document.createElement('div');row.className='row';const head=document.createElement('div');head.className='head';
    const lab=document.createElement('label');lab.textContent=r.l;head.appendChild(lab);row.appendChild(head);let el;
    if(r.t==='select'){el=document.createElement('select');for(const [v,n] of r.opts()){const o=document.createElement('option');o.value=String(v);o.textContent=n;el.appendChild(o);}
      el.addEventListener('change',()=>set(r,/^\d+$/.test(el.value)?+el.value:el.value,true));}
    else if(r.t==='seg'){el=document.createElement('div');el.className='seg';for(const [v,n] of r.opts()){const b=document.createElement('button');b.type='button';b.dataset.v=String(v);b.textContent=n;
        b.addEventListener('click',()=>set(r,typeof v==='number'?v:String(v),true));el.appendChild(b);}}
    else if(r.t==='range'){el=document.createElement('input');el.type='range';const [mn,mx,sp]=r.rng();el.min=mn;el.max=mx;el.step=sp;const out=document.createElement('output');head.appendChild(out);r.out=out;
      el.addEventListener('input',()=>{out.textContent=r.fmt(+el.value);set(r,+el.value,false);});el.addEventListener('change',()=>set(r,+el.value,true));}
    else{el=document.createElement('button');el.type='button';el.className='switch';el.addEventListener('click',()=>set(r,params()[r.k]?0:1,true));}
    row.appendChild(el);if(r.why){const w=document.createElement('p');w.className='why';w.textContent=r.why;row.appendChild(w);}
    r.el=el;r.row=row;r.sec=sec;rows.push(r);sec.appendChild(row);
  }
  function sync(){const o=params();
    for(const r of rows){if(r.h)continue;const show=!r.show||!!r.show(o);r.row.hidden=!show;if(!show)continue;const v=val(r);
      if(r.t==='select'){if(document.activeElement!==r.el)r.el.value=String(v);}
      else if(r.t==='seg'){for(const b of r.el.children)b.classList.toggle('on',b.dataset.v===String(v));}
      else if(r.t==='range'){if(document.activeElement!==r.el)r.el.value=v;r.out.textContent=r.fmt(+r.el.value);}
      else{r.el.classList.toggle('on',!!v);r.el.textContent=v?'On':'Off';}}}
  /* the engine as it stands: the game's spec, its curve and its peaks, and about how fast it would go */
  let E=null;
  function engine(){E=DR.tunedEngine(state.T,state.fd||0,state.plus||0);return E;}
  /* about how fast: gear by gear, the speed where the power at the wheels meets the air and the rolling drag, the box
     shifting up only when it reaches its shift point (as the automatic does: a car that can't reach the shift point
     in a gear stays in it, below its peak), and never more push than the tyres can put down (past about 300 mph that,
     not the engine, is the limit). Checked against full-throttle runs on this road: within a few miles an hour */
  function topSpeed(e,nos,eta=ETA){const cd=.5*1.2*(e.cdA||1.25),rr=.013*(e.mass||2180)*9.81,tr=.95*(e.mass||2180)*9.81*(e.drv==='AWD'?1:.55),lim=e.limiterRpm,sh=e.shiftRpm||e.redline*.99;
    const P=rpm=>Math.max(0,SIM.engTq(e,rpm,1,SIM.steadyBoost(e,rpm))*rpm*Math.PI*2/60+(nos?(e.nosKw||0)*1000:0));
    /* each gear from the speed the last one handed over at, in small steps, until the drag catches up or the
       shift point comes */
    let v=1;for(let g=0;g<e.nG;g++){const k=e.gears[g]*e.fd/e.R*60/(Math.PI*2),f=u=>Math.min(P(Math.max(e.idle,u*k))*eta,tr*u)-(cd*u*u*u+rr*u),
        end=(g===e.nG-1?lim:sh)/k,du=Math.max((end-v)/300,.02);
      if(end<=v)continue;let u=v;for(;u<end;u+=du)if(f(u)<=0)return u;v=end;}
    return v;}
  function drawChart(e){const c=chart.getContext('2d'),dpr=Math.min(devicePixelRatio||1,2),r=chart.getBoundingClientRect();if(!r.width)return;
    const W=chart.width=Math.round(r.width*dpr),H=chart.height=Math.round(r.height*dpr);c.clearRect(0,0,W,H);
    const C=SIM.curve(e,90),pad=W*.06,x0=pad,x1=W-pad*.6,y0=H-pad*.9,y1=pad*.4,maxR=e.limiterRpm,maxHp=Math.max(...C.map(p=>p.hp))*1.12,maxTq=Math.max(...C.map(p=>p.tq*.7376))*1.12,sc=Math.max(maxHp,maxTq);
    const X=r=>x0+(x1-x0)*r/maxR,Y=v=>y0-(y0-y1)*v/sc;
    c.strokeStyle='rgba(255,255,255,.08)';c.lineWidth=dpr;for(let k=1000;k<maxR;k+=1000){c.beginPath();c.moveTo(X(k),y0);c.lineTo(X(k),y1);c.stroke();}
    c.fillStyle='rgba(255,255,255,.45)';c.font=`${Math.round(10*dpr)}px system-ui,sans-serif`;c.textAlign='center';
    for(let k=2000;k<maxR;k+=2000)c.fillText((k/1000)+'k',X(k),H-dpr*2);
    c.fillStyle='rgba(255,60,80,.12)';c.fillRect(X(e.redline),y1,X(maxR)-X(e.redline),y0-y1);
    const line=(f,col)=>{c.beginPath();C.forEach((p,i)=>{const x=X(p.rpm),y=Y(f(p));i?c.lineTo(x,y):c.moveTo(x,y);});c.strokeStyle=col;c.lineWidth=2.2*dpr;c.stroke();};
    line(p=>p.tq*.7376,'#ffb43c');line(p=>p.hp,'#3fd8ff');
    c.textAlign='left';c.font=`600 ${Math.round(11*dpr)}px system-ui,sans-serif`;c.fillStyle='#3fd8ff';c.fillText('hp',x0+4*dpr,y1+12*dpr);c.fillStyle='#ffb43c';c.fillText('lb-ft',x0+28*dpr,y1+12*dpr);}
  function refresh(final){const e=engine();sync();drawChart(e);
    const mph=v=>Math.round(v*2.237),ts=topSpeed(e,false),tn=e.nosKw?topSpeed(e,true):0;
    stats.innerHTML=`<b>${fmtN(e.peak.hp)} hp</b> at ${fmtN(e.peak.rpm)} · <b>${fmtN(e.peak.tq*.7376)} lb-ft</b> at ${fmtN(e.peak.tqRpm)}`+
      `<br>Top speed about <b>${mph(ts)} mph</b>${tn?` · with NOS about <b>${mph(tn)}</b>`:''}<span class=dim> (an estimate: the road tells you)</span>`;
    onChange(e,!!final);}
  function reset(){state.T={nos:3};state.fd=0;state.plus=0;refresh(true);}
  return {refresh,reset,engine,topSpeed,get E(){return E;},drawChart};
}
