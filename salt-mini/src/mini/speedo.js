/* =====================================================================================
   THE SPEEDOMETER: a round dial in miles an hour, its scale stepping up as the truck outruns it (160, then 240, 320,
   400, 480, 560), the speed in figures under the needle, the gear, a rev arc inside with the redline, the nitrous
   bottle as a cyan arc, and the run's top speed. Drawn on its own small canvas, about twenty times a second.
   ===================================================================================== */
const STEPS=[160,240,320,400,480,560,640];
const A0=Math.PI*.75,SW=Math.PI*1.5;   // the sweep: from lower left, round over the top, to lower right
export function makeSpeedo(cv){
  const g=cv.getContext('2d');let S=160,top=0,last=0,shown=0,W=0,H=0,dpr=1;
  function fit(){dpr=Math.min(devicePixelRatio||1,2);const r=cv.getBoundingClientRect();if(!r.width)return;
    if(Math.round(r.width*dpr)!==W){W=cv.width=Math.round(r.width*dpr);H=cv.height=Math.round(r.height*dpr);}}
  function reset(){S=160;top=0;}
  function draw(o){
    const now=performance.now();if(now-last<45&&!o.force)return;last=now;fit();if(!W)return;
    const mph=Math.max(0,o.mph);top=Math.max(top,mph);while(mph>S*.93&&STEPS.indexOf(S)<STEPS.length-1)S=STEPS[STEPS.indexOf(S)+1];
    shown+=(mph-shown)*.6;
    const c=g,R=W*.46,cx=W/2,cy=H*.5,ang=v=>A0+SW*Math.min(v/S,1.04);
    c.clearRect(0,0,W,H);
    /* the face */
    c.beginPath();c.arc(cx,cy,R,0,Math.PI*2);c.fillStyle='rgba(10,12,16,.92)';c.fill();
    c.lineWidth=W*.006;c.strokeStyle='rgba(255,255,255,.22)';c.stroke();
    /* the ticks and the numbers */
    const maj=S<=160?20:S<=320?40:80,minr=maj/4;
    c.lineCap='round';
    for(let v=0;v<=S+.01;v+=minr){const a=ang(v),big=Math.abs(v/maj-Math.round(v/maj))<1e-6,r0=R*(big?.80:.86),r1=R*.93;
      c.beginPath();c.moveTo(cx+Math.cos(a)*r0,cy+Math.sin(a)*r0);c.lineTo(cx+Math.cos(a)*r1,cy+Math.sin(a)*r1);
      c.lineWidth=W*(big?.011:.005);c.strokeStyle=big?'rgba(255,255,255,.9)':'rgba(255,255,255,.45)';c.stroke();
      if(big){const rt=R*.66;c.font=`600 ${Math.round(W*.068)}px "Saira Condensed","Arial Narrow",system-ui,sans-serif`;c.textAlign='center';c.textBaseline='middle';
        c.fillStyle='rgba(255,255,255,.85)';c.fillText(String(v),cx+Math.cos(a)*rt,cy+Math.sin(a)*rt);}}
    /* the rev arc inside, its last stretch red past the redline */
    if(o.redline){const lim=o.limit||o.redline*1.02,rA=R*.47,f=Math.min(Math.max(o.rpm/lim,0),1),aR=A0+SW*(o.redline/lim);
      c.lineWidth=W*.022;c.lineCap='butt';
      c.beginPath();c.arc(cx,cy,rA,A0,A0+SW);c.strokeStyle='rgba(255,255,255,.08)';c.stroke();
      c.beginPath();c.arc(cx,cy,rA,aR,A0+SW);c.strokeStyle='rgba(255,60,80,.35)';c.stroke();
      c.beginPath();c.arc(cx,cy,rA,A0,A0+SW*f);c.strokeStyle=o.rpm>o.redline?'#ff4a5c':'rgba(255,190,90,.95)';c.stroke();}
    /* the nitrous bottle: an arc in the gap at the bottom of the dial, cyan, flashing white while it fires */
    if(o.nosKit){const rN=R*.9,a0=Math.PI*.69,a1=Math.PI*.31,k=Math.min(Math.max(o.nos,0),1);
      c.lineWidth=W*.022;c.lineCap='butt';c.beginPath();c.arc(cx,cy,rN,a0,a1,true);c.strokeStyle='rgba(60,220,255,.16)';c.stroke();
      if(k>0){c.beginPath();c.arc(cx,cy,rN,a0,a0-(a0-a1)*k,true);c.strokeStyle=o.nosOn&&(now/90|0)%2?'#ffffff':'#3cdcff';c.stroke();}}
    /* the figures, the gear, the top speed */
    c.textAlign='center';c.textBaseline='alphabetic';c.fillStyle='#fff';
    c.font=`700 ${Math.round(W*.15)}px "Saira Condensed","Arial Narrow",system-ui,sans-serif`;c.fillText(String(Math.round(mph)),cx,cy+W*.075);
    c.font=`600 ${Math.round(W*.048)}px system-ui,sans-serif`;c.fillStyle='rgba(255,255,255,.6)';c.fillText('MPH',cx,cy+W*.13);
    if(o.gear!=null){c.font=`700 ${Math.round(W*.07)}px system-ui,sans-serif`;c.fillStyle='rgba(255,200,110,.95)';c.fillText(o.gear,cx,cy-W*.1);}
    c.font=`600 ${Math.round(W*.042)}px system-ui,sans-serif`;c.fillStyle='rgba(255,255,255,.55)';c.fillText('TOP '+Math.round(top),cx,cy+R*.6);
    if(o.nosKit){c.fillStyle=o.nosOn?'#ffffff':'rgba(60,220,255,.8)';c.fillText('NOS',cx,cy+R*.78);}
    /* the needle */
    const a=ang(shown);c.lineCap='round';c.lineWidth=W*.016;c.strokeStyle='#ff3d5a';
    c.beginPath();c.moveTo(cx+Math.cos(a)*R*.52,cy+Math.sin(a)*R*.52);c.lineTo(cx+Math.cos(a)*R*.94,cy+Math.sin(a)*R*.94);c.stroke();
  }
  return {draw,reset,fit,get top(){return top;}};
}
