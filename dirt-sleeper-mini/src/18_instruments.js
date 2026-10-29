/* ---------- the dot-matrix instruments: Shiftlight 2's shift lights, tach, gear and speed ---------- */
function engShiftLights(x,y,e,rpm,running,n=15){
  const sAt=e.shiftRpm,lo=sAt-Math.min(3500,sAt*.42),f=clamp((rpm-lo)/(sAt-lo),0,1),lit=Math.floor(f*n+.001),over=rpm>=sAt-40&&running,blink=(APP.t*14|0)%2;
  for(let i=0;i<n;i++){const cx=x+i*6,on=i<lit;
    let col=i<5?[60,255,90]:i<10?[255,210,40]:[255,50,60];if(over)col=[80,140,255];
    const c=(over?blink:on)?pack(col[0],col[1],col[2]):pack(col[0]*.12,col[1]*.12,col[2]*.12);
    hDisc(cx+2,y+2,2.3,c);if(over?blink:on)hPx(cx+1,y+1,PAL.white);}
}
function engTach(cx,cy,r,e,rpm){
  const lim=e.limiterRpm,n=34,a0=PI*1.12,a1=-PI*.12;
  for(let i=0;i<n;i++){const t=i/(n-1),a=a0+(a1-a0)*t,rv=t*lim*1.05,x=cx+Math.cos(a)*r,y=cy-Math.sin(a)*r;
    const on=rv<=rpm,red=rv>e.redline,c=red?(on?PAL.red:pack(70,10,16)):on?PAL.ink:pack(50,46,64);hDisc(x,y,1.3,c);}
  for(let k=0;k<=Math.floor(lim/1000);k++){const t=k*1000/(lim*1.05),a=a0+(a1-a0)*t;txt3(String(k),Math.round(cx+Math.cos(a)*(r-7))-1,Math.round(cy-Math.sin(a)*(r-7))-2,k*1000>e.redline?PAL.red:PAL.dim);}
}
