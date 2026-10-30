/* =====================================================================================
   DAY AND NIGHT, in the renderer's own units (a clear noon sky near 1.5, the sun near 6; the auto exposure
   brings each to the screen). High noon is the ranch as it always was. Golden hour: the sun ten degrees up in
   the west, warm and long, the sky going orange low down and the haze catching the light. Night: a moon low in
   the east, a sky full of stars, fog that closes in to a few hundred metres (so the world past it isn't drawn at
   all), your headlights with their low-beam cut-off and shadow map, and the lamps the ranch and the country have:
   the shop's yard lights, the drag strip's poles, the canopy at Feed & Fuel, the porch at home, the paddock's
   floodlights, the speedway's light poles and the red light on the mast up the mountain. Every lamp is a real
   light in the renderer's clustered grid (thousands fit), so the land under each one is lit, not just the car.
   ===================================================================================== */
const TOD={
  /* (the country's ambient is warmer than a city's: the sky, and the sun bounced off ochre dirt and grass) */
  day:{name:'High noon',sun:V3.norm([-.52,.5,.4]),sunCol:[6.2,5.8,5.2],sunSize:.0095,ambUp:[.42,.47,.56],ambDn:[.22,.15,.09],skyZen:[.18,.36,.95],skyHor:[.75,.88,1.1],
    fogCol:[.6,.7,.88],fogDen:.0011,fogFall:.02,fogAmb:[.44,.5,.58],cloud:.25,stars:0,night:0,key:.19,expoRange:[.02,3],bloom:.035,grade:[1.35,1.06],lightsOn:0,draw:0},
  golden:{name:'Golden hour',sun:V3.norm([-.86,.19,.46]),sunCol:[3.4,1.75,.75],sunSize:.02,ambUp:[.3,.3,.4],ambDn:[.18,.12,.08],skyZen:[.12,.2,.42],skyHor:[1.25,.75,.45],
    fogCol:[.55,.38,.3],fogDen:.0026,fogFall:.03,fogAmb:[.5,.34,.24],cloud:.35,stars:0,night:0,key:.22,expoRange:[.05,8],bloom:.05,grade:[1.22,1.06],lightsOn:.7,draw:0},
  night:{name:'Night',sun:V3.norm([.55,.32,-.35]),sunCol:[.04,.05,.075],sunSize:.014,ambUp:[.008,.011,.02],ambDn:[.005,.005,.006],skyZen:[.002,.004,.012],skyHor:[.012,.014,.024],
    fogCol:[.02,.018,.022],fogDen:.004,fogFall:.04,fogAmb:[.006,.006,.009],cloud:.25,stars:1,night:1,key:.1,expoRange:[.8,40],bloom:.065,grade:[1.05,1.04],lightsOn:1,draw:300}
};
/* the time of day: the light the frame is lit with (55_gfx's envNow adds the weather); the probe starts over */
function applyTod(id){const T=TOD[id]||TOD.day;Object.assign(SKY,T);if(typeof R!=='undefined'&&R)R.probeFilled=0;}
/* how far the land is drawn: the fog closes in at night */
const drawFar=()=>SKY.night&&SKY.draw?Math.min(GFX.far,SKY.draw):GFX.far;
/* ---------- the lamps of the land, as the renderer's light records ---------- */
/* {type: 0 point, 1 spot; pos; r: reach; col; dir, cosO, cosI: a spot's aim and cone; flick: a flicker slot; src: the bulb's size} */
function landLights(){
  const W=RANCH.W,out=[];
  /* the ranch's own (the shop's yard lights, the strip's poles) are already in these units */
  for(const L of W.lights||[])out.push(L);
  /* Dirt Sleeper's fixtures were in the old shader's units, the renderer's divided by about 160 */
  const at=(x,dy,z)=>[x,W.heightAt(x,z)+dy,z],down=[0,-1,0],K=160;
  const spot=(p,r,c,d,ang,flick=0)=>({type:1,pos:p,r,col:c.map(v=>v*K),dir:d,cosO:Math.cos(ang),cosI:Math.cos(ang*.55),axis:[0,0,0],flick,src:.12});
  const point=(p,r,c,flick=0)=>({type:0,pos:p,r,col:c.map(v=>v*K),dir:down,cosO:-1,cosI:-1,axis:[0,0,0],flick,src:.08});
  /* Feed & Fuel: four downlights in the canopy, the sign */
  for(const [x,z] of [[503,366],[513,366],[503,376],[513,376]])out.push(spot(at(x,4.9,z),20,[4.2,4,3.6],down,1.2));
  out.push(point(at(494,8.4,388),12,[2.2,1.6,.8]));
  /* home: the porch light and one on the barn */
  out.push(point(at(-492,2.7,644.6),16,[2.6,2,1.3]));out.push(spot(at(-462,5.2,630),24,[3.2,2.7,1.9],V3.norm([0,-.8,.6]),1.1));
  /* the paddock's floodlights */
  for(const x of [380,455,530])out.push(spot(at(x,10,458),42,[5.5,5.3,4.8],V3.norm([0,-1,.5]),1.05));
  /* the far country's: the speedway's light poles, and the mast's red light, which blinks (flicker slot 1) */
  for(const f of W.country.far.fix){const mast=!f.d&&f.c[0]>f.c[1]*5;out.push(f.d?spot(f.p,f.r,f.c,f.d,Math.acos(Math.max(-1,Math.min(1,f.cs)))):point(f.p,f.r,f.c,mast?1:0));}
  return out;
}
/* the flicker slots the lamps can follow: 1 the mast's slow blink */
const FLICK=[1,1];
function flickerNow(t){FLICK[1]=Math.sin(t*2.2)>.75?1:.02;return FLICK;}
/* ---------- the cars' lamps for the frame ---------- */
/* the player's: the headlights (with their shadow map and the low-beam cut-off) when they're on, the tail lights
   with them and brighter under braking */
function carLights(t,L){
  const M=t.M,D=carD(t),F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],Rt=[M[2],M[5],M[8]],lift=liftOf(t);
  const at=(x,y,z)=>[t.p[0]+F[0]*x+U[0]*y+Rt[0]*z,t.p[1]+F[1]*x+U[1]*y+Rt[1]*z,t.p[2]+F[2]*x+U[2]*y+Rt[2]*z];
  const xf=D.L/2-.15-t.cg[0],y=.78+lift-t.cg[1],xr=-(D.L/2-.1)-t.cg[0];
  if(APP.lights){const dir=V3.norm([F[0]-U[0]*.06,F[1]-U[1]*.06,F[2]-U[2]*.06]);
    L.headlights={on:1,high:0,posL:at(xf,y,-.62),posR:at(xf,y,.62),dir,right:Rt,up:U,col:[1050,1090,1140],range:85};}
  const brake=t.brkIn>.05;
  if(APP.lights||brake){const back=V3.norm([-F[0]-U[0]*.35,-F[1]-U[1]*.35,-F[2]-U[2]*.35]);
    for(const z of [-.66,.66])L.dyn.push({pos:at(xr,y,z),r:brake?11:6,col:brake?[5,.12,.06]:[.9,.02,.01],type:1,dir:back,cosO:Math.cos(1.3)});}
}
/* the rivals' headlights at night: spot lights for the nearest few (the clustered grid is for the lamps that stay put) */
function rivalLights(L,cars,eye){
  const n={mobile:2,low:2,medium:3,high:4,ultra:6}[GFX.level]||3;
  const near=cars.map(t=>({t,d:Math.hypot(t.p[0]-eye[0],t.p[2]-eye[2])})).sort((a,b)=>a.d-b.d).slice(0,n);
  for(const {t} of near){const M=t.M,D=carD(t),F=[M[0],M[3],M[6]],U=[M[1],M[4],M[7]],lift=liftOf(t),x=D.L/2-.1-t.cg[0],y=.78+lift-t.cg[1];
    if(L.dyn.length>=16)break;
    L.dyn.push({pos:[t.p[0]+F[0]*x+U[0]*y,t.p[1]+F[1]*x+U[1]*y,t.p[2]+F[2]*x+U[2]*y],r:32,col:[150,145,130],type:1,dir:V3.norm([F[0]-U[0]*.08,F[1]-U[1]*.08-.04,F[2]-U[2]*.08]),cosO:Math.cos(.6)});}
}
