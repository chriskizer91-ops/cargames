/* the maps: what you've seen (each chunk's map tile, kept as you drive), the roads round you whether you've
   been down them or not, the towns and the garage */
const MAPOFF=pack(10,10,14,235),MINI_SPAN=480,BIG_SPAN=WG.L*4;
function mapFill(X0,Y0,n,cx0,cz0,mpp,dark){
  for(let j=0;j<n;j++){const Y=Y0+j;if(Y<0||Y>=BH)continue;const o=Y*BW+X0,z=cz0+(j+.5-n/2)*mpp,cz=Math.floor(z/CHK),fz=(z-cz*CHK)/CHK;let lk=-1,lt=null;
    for(let i=0;i<n;i++){const X=X0+i;if(X<0||X>=BW)continue;const x=cx0+(i+.5-n/2)*mpp,cx=Math.floor(x/CHK),k=ckey(cx,cz);if(k!==lk){lk=k;lt=WORLD.tiles.get(k)||null;}
      if(!lt){HB[o+i]=dark;continue;}const tn=lt.tn;HB[o+i]=lt.px[Math.min(tn-1,(fz*tn)|0)*tn+Math.min(tn-1,(((x-cx*CHK)/CHK)*tn)|0)];}}
}
/* the car: a blinking arrow pointing where it faces */
function mapArrow(mx,my,k=1){const t=GAME.car,F=mcol(t.M,0),fl=Math.hypot(F[0],F[2])||1,fx=F[0]/fl,fz=F[2]/fl,col=(APP.t*4|0)%2?PAL.white:PAL.gold;
  hLine(mx-fx*2.5*k-fz*1.8*k,my-fz*2.5*k+fx*1.8*k,mx+fx*3*k,my+fz*3*k,col);hLine(mx-fx*2.5*k+fz*1.8*k,my-fz*2.5*k-fx*1.8*k,mx+fx*3*k,my+fz*3*k,col);hDisc(mx,my,1.1,col);}
/* the corner map: about 480 m round the car, north up */
function drawMap(x0,y0,size){
  const t=GAME.car,n=size*HS;
  hRect(x0-1,y0-1,size+2,size+2,pack(0,0,0,200));
  mapFill(x0*HS,y0*HS,n,t.p[0],t.p[2],MINI_SPAN/n,MAPOFF);
  mapArrow(x0+size/2,y0+size/2);
  hFrame(x0-1,y0-1,size+2,size+2,pack(255,255,255,60));
  txt3('N',x0+size/2-1,y0+1,pack(255,255,255,150));
}
/* the big map (M, or tap the corner map): four miles across round the car */
const BIGM={x:1e9,z:1e9,roads:[],towns:[]};
function drawBigMap(){
  const t=GAME.car,size=Math.min(H-14,W-14)|0,x0=Math.round((W-size)/2),y0=Math.round((H-size)/2),n=size*HS,span=BIG_SPAN,cxw=t.p[0],czw=t.p[2];
  hRect(0,0,W,H,pack(0,0,0,110));hRect(x0-2,y0-2,size+4,size+4,pack(0,0,0,225));
  mapFill(x0*HS,y0*HS,n,cxw,czw,span/n,pack(22,24,26,235));
  if(Math.hypot(cxw-BIGM.x,czw-BIGM.z)>250){BIGM.x=cxw;BIGM.z=czw;BIGM.roads=WG.roadLines(cxw-span*.6,czw-span*.6,cxw+span*.6,czw+span*.6,40);BIGM.towns=WG.townsNear(cxw,czw,span*.75);}
  const toM=(x,z)=>[x0+size/2+(x-cxw)/span*size,y0+size/2+(z-czw)/span*size],inR=(a,b)=>a>=x0&&a<=x0+size&&b>=y0&&b<=y0+size;
  const RC=[0,pack(150,108,66),pack(196,180,150),pack(214,214,222),PAL.gold,PAL.amber];
  for(const r of BIGM.roads){const col=RC[r.cls];for(let k=2;k<r.pts.length;k+=2){const [a,b]=toM(r.pts[k-2],r.pts[k-1]),[c,d]=toM(r.pts[k],r.pts[k+1]);if(inR(a,b)&&inR(c,d))hLine(a,b,c,d,col);}}
  for(const tw of BIGM.towns){const [a,b]=toM(tw.x,tw.z);if(!inR(a,b))continue;hDisc(a,b,1.6,PAL.white);otxt3(tw.name.toUpperCase(),a+3,b-6,PAL.ink);}
  {const [a,b]=toM(37,-50);if(inR(a,b)){hDisc(a,b,1.6,PAL.gold);otxt3('GARAGE',a+3,b-6,PAL.gold);}}
  mapArrow(x0+size/2,y0+size/2,1.3);
  hFrame(x0-2,y0-2,size+4,size+4,pack(255,255,255,70));
  const ew=t.p[0]/1609.34,ns=-t.p[2]/1609.34;otxt3(`${Math.abs(ew).toFixed(1)} MI ${ew>=0?'EAST':'WEST'}, ${Math.abs(ns).toFixed(1)} MI ${ns>=0?'NORTH':'SOUTH'} OF THE GARAGE`,x0+3,y0+3,PAL.ink);
  otxt3(GAME.touch?'TAP TO CLOSE':'M TO CLOSE',x0+3,y0+size-8,PAL.dim);otxt3('4 MILES ACROSS',x0+size-3,y0+size-8,PAL.dim,1,'r');
}
