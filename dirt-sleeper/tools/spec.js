// spectral centroid and crest factor of a rendered buffer: is it a dense hiss (rain) or sparse sharp ticks (hail)?
module.exports=function(L,SR){const N=4096;let cen=0,frames=0;const re=new Float64Array(N),im=new Float64Array(N);
for(let o=SR;o+N<L.length;o+=N){for(let i=0;i<N;i++){re[i]=L[o+i]*(0.5-0.5*Math.cos(2*Math.PI*i/N));im[i]=0;}
 for(let i=1,j=0;i<N;i++){let bit=N>>1;for(;j&bit;bit>>=1)j^=bit;j^=bit;if(i<j){[re[i],re[j]]=[re[j],re[i]];}}
 for(let len=2;len<=N;len<<=1){const a=-2*Math.PI/len;for(let i=0;i<N;i+=len)for(let j=0;j<len/2;j++){const wr=Math.cos(a*j),wi=Math.sin(a*j),xr=re[i+j+len/2]*wr-im[i+j+len/2]*wi,xi=re[i+j+len/2]*wi+im[i+j+len/2]*wr;re[i+j+len/2]=re[i+j]-xr;im[i+j+len/2]=im[i+j]-xi;re[i+j]+=xr;im[i+j]+=xi;}}
 let s=0,w=0;for(let k=1;k<N/2;k++){const m=Math.hypot(re[k],im[k]);s+=m*k*SR/N;w+=m;}cen+=s/w;frames++;}
let pk=0,r=0;for(let i=SR;i<L.length;i++){pk=Math.max(pk,Math.abs(L[i]));r+=L[i]*L[i];}r=Math.sqrt(r/(L.length-SR));
return {centroid:Math.round(cen/frames),crest:+(pk/r).toFixed(1),rms:+r.toFixed(4)};};
