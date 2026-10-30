/* Loads the car/physics modules (hd/) into Node with no page, in the build's order. */
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','hd')+'/';
const MODS=['10_core','12_gl_mesh','13_lit','14_loft','15_digital_engine','16_engines','21_suv','22_faces','23_parts','25_coupe','29_hatch','34_ev','35_wedge','36_hyper',
  '30_wheels','31_engine_bay','32_builds','33_car_mesh','40_physics','41_ground','42_chassis','43_sim','37_newbuilds','45_ev','56_parts','57_ratings','58_clparts'];
const STUB=`const document={getElementById:()=>null,createElement:()=>({getContext:()=>null,style:{}})},matchMedia=()=>({matches:false}),localStorage={getItem:()=>null,setItem:()=>{}},window={};\n`;
let src=MODS.map(m=>fs.readFileSync(SRC+m+'.js','utf8')).join('\n');
src=src.replace('function makeMesh(d){','function makeMesh(d){return {cpu:true,pos:d.pos,nrm:d.nrm,col:d.col,mat:d.mat,n:d.pos.length/3};');
const X=new Function(STUB+src+'\nreturn {BUILDS,CARS,specOf,buildChassis,makeCar:(...a)=>makeCar(...a),cgOf,GroundWorld,setLow,setLockers,ASSISTS,Vehicle,truck,ENGINE_OF,SLOTS,SLOT_GROUPS,slotOptions:(...a)=>slotOptions(...a),fits,fixRig,rigBuild:(...a)=>rigBuild(...a),presetRig,presetsOf,PRESET_PARTS,CAR_PARTS,rateBuild,TERRAINS,measure60,PAINTS,GLOWS};')();
module.exports=X;
