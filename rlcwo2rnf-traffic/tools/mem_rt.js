/* What holds the memory: the JavaScript heap in a drive (downtown, the traffic out, 600 frames), a heap snapshot
   summed by kind, then every big internal array traced to the object and property that keeps it, and every mesh
   builder (MB) to what holds it. This is how the 300 MB leak was found (each car's builders kept by two closures on its
   D: 21_suv.js). GPU memory isn't in the heap: the world's meshes are on the F overlay (GPU n MB).
   usage: node tools/mem_rt.js [quality]   (mobile)    env: FILE */
const {chromium}=require('playwright');const path=require('path');
const file=process.env.FILE?path.resolve(process.env.FILE):path.resolve(__dirname,'..','rlcwo2rnf-traffic.html');
(async()=>{
  const b=await chromium.launch({args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--ignore-gpu-blocklist','--js-flags=--expose-gc','--enable-precise-memory-info']});
  const p=await b.newPage({viewport:{width:480,height:270},deviceScaleFactor:1});
  await p.addInitScript(()=>{try{localStorage.clear();}catch(e){}const iv=setInterval(()=>{if(window.__game&&window.__game.GAME){window.__game.GAME.hold=true;clearInterval(iv);}},20);});
  await p.goto('file://'+file+'?quality='+(process.argv[2]||'mobile')+'&display=clear&gputime=off');
  await p.waitForFunction(()=>window.__game&&!(document.getElementById('loading')&&!document.getElementById('loading').hidden),null,{timeout:600000,polling:500});
  const heap=await p.evaluate(async()=>{const g=__game,G=g.GAME,dt=1/60,wait=ms=>new Promise(r=>setTimeout(r,ms));const boot=performance.memory.usedJSHeapSize;g.closeMenu();G.state='drive';g.goTo('downtown');g.APP.cam=1;
    for(let f=0;f<600;f++){g.APP.t+=dt;g.step(dt);if(f%6===5){g.render(dt);await wait(1);}}return {bootMB:+(boot/1048576).toFixed(1),driveMB:+(performance.memory.usedJSHeapSize/1048576).toFixed(1)};});
  console.log('JS heap: after the boot',heap.bootMB,'MB; in the drive',heap.driveMB,'MB (before the snapshot\'s collection)');
  const cdp=await p.context().newCDPSession(p);const chunks=[];cdp.on('HeapProfiler.addHeapSnapshotChunk',e=>chunks.push(e.chunk));
  await cdp.send('HeapProfiler.collectGarbage');await cdp.send('HeapProfiler.takeHeapSnapshot',{reportProgress:false});
  const S=JSON.parse(chunks.join(''));const M=S.snapshot.meta,nf=M.node_fields,NF=nf.length,ef=M.edge_fields,EF=ef.length,nt=M.node_types[0],et=M.edge_types[0],str=S.strings,N=S.nodes,E=S.edges;
  const iT=nf.indexOf('type'),iN=nf.indexOf('name'),iS=nf.indexOf('self_size'),iE=nf.indexOf('edge_count'),eT=ef.indexOf('type'),eN=ef.indexOf('name_or_index'),eTo=ef.indexOf('to_node');
  const nN=N.length/NF,first=new Uint32Array(nN+1);for(let i=0,e=0;i<nN;i++){first[i]=e;e+=N[i*NF+iE]*EF;}first[nN]=E.length;
  /* the holder of each node: the first object that refers to it by a property or an element (internal arrays are held by their JS array or object) */
  const holder=new Int32Array(nN).fill(-1),hname=new Array(nN);
  for(let i=0;i<nN;i++){for(let e=first[i];e<first[i+1];e+=EF){const to=E[e+eTo]/NF,t=et[E[e+eT]];if(holder[to]<0&&(t==='property'||t==='element'||t==='internal')){holder[to]=i;hname[to]=t==='element'?'['+E[e+eN]+']':(t==='property'||t==='internal')?str[E[e+eN]]:'';}}}
  const nameOf=i=>{const t=nt[N[i*NF+iT]];return t==='object'||t==='native'?str[N[i*NF+iN]]:t;};
  /* the MB objects: who holds them, three steps up, with the size of their arrays */
  const mbAgg=new Map();
  for(let i=0;i<nN;i++){if(nt[N[i*NF+iT]]!=='object'||str[N[i*NF+iN]]!=='MB')continue;
    /* its arrays' size: p n c m elements */
    let sz=0;for(let e=first[i];e<first[i+1];e+=EF){const to=E[e+eTo]/NF;if(nameOf(to)==='Array'){for(let e2=first[to];e2<first[to+1];e2+=EF){const t2=E[e2+eTo]/NF;if(nt[N[t2*NF+iT]]==='array')sz+=N[t2*NF+iS];}}}
    const path=[];let cur=i,h=holder[i];for(let k=0;k<5&&h>=0;k++){path.push(hname[cur]+'<'+nameOf(h));cur=h;h=holder[h];}
    const key=path.join(' ');mbAgg.set(key,(mbAgg.get(key)||[0,0]).map((v,j)=>v+(j?1:sz)));}
  console.log('MB holders:');console.log([...mbAgg.entries()].sort((a,b)=>b[1][0]-a[1][0]).slice(0,15).map(([k,v])=>(v[0]/1048576).toFixed(1).padStart(7)+' MB '+String(v[1]).padStart(4)+' x  '+k).join('\n'));
  /* for each internal array: climb to the first named object (array -> its JS Array -> the object holding that), summing by "Holder.prop" */
  const agg=new Map();let total=0;
  for(let i=0;i<nN;i++){if(nt[N[i*NF+iT]]!=='array')continue;const sz=N[i*NF+iS];if(sz<512)continue;total+=sz;
    let h=holder[i],path=[];let cur=i;for(let k=0;k<4&&h>=0;k++){path.push(hname[cur]);const nm=nameOf(h);if(nm!=='Array'&&nm!=='array'&&nm!=='(object elements)'&&nm!=='system / Context'){path.push(nm);break;}cur=h;h=holder[h];}
    const key=path.reverse().filter(Boolean).slice(0,3).join(' . ');agg.set(key,(agg.get(key)||0)+sz);}
  const top=[...agg.entries()].sort((a,b)=>b[1]-a[1]).slice(0,25).map(([k,v])=>(v/1048576).toFixed(1).padStart(7)+' MB  '+k);
  console.log('internal arrays over 512 B:',(total/1048576).toFixed(1),'MB');console.log(top.join('\n'));
  await b.close();})();
