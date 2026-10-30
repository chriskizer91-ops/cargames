/* =====================================================================================
   CITY LIMITS — THE LIGHTS THAT SHOW WHERE TO GO: neon the renderer draws as world geometry
   (Renderer.setDynamic), rebuilt only when what they show changes.
   - a challenge's start: a ring on the ground and a tall thin column of light, seen across the desert
     (cyan; gold once you hold its gold medal)
   - a person with a job: amber; where the job wants you next: green
   - during a run: the next gates as lit arches across the road (the very next one pulses), the
     finish chequered white
   Neon is world material 7: colour from the vertex, brightness its first parameter, the pulse its
   second (the frame's flicker table, slot 5 a slow breathe).
   ===================================================================================== */
import {MeshBuilder} from '../render/mesh.js';

const hex=c=>[parseInt(c.slice(1,3),16),parseInt(c.slice(3,5),16),parseInt(c.slice(5,7),16)];
const COL={start:[60,220,255],gold:[255,210,63],offer:[255,176,64],target:[93,255,122],gate:[255,79,160],finish:[244,242,255],dim:[120,90,200]};

export class Markers{
  constructor(R,W){this.R=R;this.W=W;this.key='';this.o={y:0,surf:''};}
  h(x,y){return this.W.heightAt(x,y,this.o).y;}
  /* a column of light and a ring round its foot */
  beacon(B,x,y,col,{tall=46,ring=6,bright=90,pulse=0,r=.85}={}){
    /* the column floats from five metres up, so a car can stop under it in the ring */
    const h=this.h(x,y);B.mat(7,Math.round(bright*.42),pulse,0).col(...col);
    B.tube([x,h+5,-y],[x,h+tall,-y],r,8,true,r*.55);B.mat(7,bright,pulse,0);B.tube([x,h+.1,-y],[x,h+3.6,-y],.07,4,false);
    const n=20;for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2,p=a=>{const px=x+Math.cos(a)*ring,py=y+Math.sin(a)*ring;return [px,this.h(px,py)+.12,-py];};B.tube(p(a0),p(a1),.16,4,false);}
  }
  /* an arch across the road: two posts and a bar, chequered when it's the finish */
  gate(B,g,col,{bright=70,pulse=0,finish=false,w}={}){
    const half=w||Math.max(5,g.r-2),nx=g.dy,ny=-g.dx,L=[g.x+nx*half,g.y+ny*half],Rt=[g.x-nx*half,g.y-ny*half],hl=this.h(...L),hr=this.h(...Rt),top=Math.max(hl,hr)+5.2;
    B.mat(7,bright,pulse,0).col(...col);
    B.tube([L[0],hl,-L[1]],[L[0],top,-L[1]],.32,6,true);B.tube([Rt[0],hr,-Rt[1]],[Rt[0],top,-Rt[1]],.32,6,true);
    if(!finish)B.tube([L[0],top,-L[1]],[Rt[0],top,-Rt[1]],.26,6,false);
    else{const n=Math.max(4,Math.round(half*2/1.2));for(let i=0;i<n;i++){const t0=i/n,t1=(i+1)/n,p=t=>[L[0]+(Rt[0]-L[0])*t,top,-(L[1]+(Rt[1]-L[1])*t)];
      B.mat(7,i%2?bright:Math.round(bright*.15),0,0).col(...(i%2?COL.finish:[255,79,160]));B.tube(p(t0),p(t1),.34,6,false);}}
  }
  /* what to show: {starts:[{x,y,gold}], people:[{x,y,kind}], run:{c,gi}} */
  update(S){
    const key=JSON.stringify([S.starts.map(s=>[s.x|0,s.y|0,s.gold?1:0,s.dim?1:0]),S.people.map(p=>[p.x|0,p.y|0,p.kind]),S.run?[S.run.c.id,S.run.gi,S.run.lap]:0]);
    if(key===this.key)return;this.key=key;
    const B=new MeshBuilder(8192);
    if(S.run){const c=S.run.c,G=c.gates||[];
      if(c.zone){const z=c.zone,n=48;B.mat(7,60,5,0).col(...COL.gate);for(let i=0;i<n;i++){const a0=i/n*Math.PI*2,a1=(i+1)/n*Math.PI*2,p=a=>{const px=z.x+Math.cos(a)*z.r,py=z.y+Math.sin(a)*z.r;return [px,this.h(px,py)+.3,-py];};B.tube(p(a0),p(a1),.3,4,false);}}
      for(let k=0;k<3&&S.run.gi+k<G.length;k++){const g=G[S.run.gi+k],last=S.run.gi+k===G.length-1,fin=last&&(c.kind!=='lap'||S.run.lap>=c.laps);
        this.gate(B,g,fin?COL.finish:g.trap?COL.gold:COL.gate,{bright:k===0?90:40,pulse:k===0?5:0,finish:fin,w:c.kind==='crawl'?3.2:undefined});}
      if(c.kind==='mile')for(const g of G)if(Math.abs(g.s-c.mile[0])<1||Math.abs(g.s-c.mile[1])<1)this.gate(B,g,COL.gold,{bright:80,w:22});
      if(c.kicker)this.beacon(B,c.kicker.x,c.kicker.y,COL.gold,{tall:16,ring:3,bright:60,r:.4});}
    else for(const s of S.starts)this.beacon(B,s.x,s.y,s.gold?COL.gold:s.dim?COL.dim:COL.start,{bright:s.dim?40:90});
    for(const p of S.people)this.beacon(B,p.x,p.y,p.kind==='target'?COL.target:p.col?hex(p.col):COL.offer,{tall:p.kind==='target'?64:36,ring:p.kind==='target'?8:4.5,bright:p.kind==='target'?110:80,pulse:p.kind==='target'?5:0,r:p.kind==='target'?1:.7});
    this.R.setDynamic('marks',B);
  }
}
