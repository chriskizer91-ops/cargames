// Loads the game's non-GL modules into one function scope for node tests.
const fs=require('fs'),S=__dirname+'/../src/';
const rd=f=>fs.readFileSync(S+f,'utf8');
const r=rd('10_sl3_render.js').split('\n'), c=rd('11_sl3_car.js').split('\n');
let code='var FRAME="",NOISE="",PACK="",LIGHTING="",SHADE="",CAR_VS="";\n'+r.slice(218,445).join('\n')+'\n'+c.slice(0,231).join('\n')+'\n'+
 ['13_math3.js','14_dsp.js','15_sim.js','20_tyre.js','21_powertrain_vehicle.js','31_audio.js','33_uisynth.js','34_mix.js','50_suvmesh.js','51_suvrender.js','60_build.js','61_truck.js'].map(rd).join('\n')+
 (process.env.EXTRA? '\n'+process.env.EXTRA.split(',').map(rd).join('\n'):'')+
 '\nreturn {get:(n)=>eval(n),SIM,Vehicle,makeTruck,quickPass,buildNumbers,buildSpec,buildChassis,STOCK_BUILD,SLOTS,SLOT,TYRES,FlatWorld,setLow,setLockers,qmat,mcol,len};';
module.exports=new Function(code)();
