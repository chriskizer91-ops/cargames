/* Loads the game's modules in Node, without a page, for the tools: the cars, the parts, the physics, the
   ratings and the feats, and (with {ranch:true}) the ranch and the country round it.
   usage: const X=require('./load')({ranch:true}); */
const fs=require('fs'),path=require('path');
const SRC=path.resolve(__dirname,'..','src')+'/';
const CARS=['10_core','12_gl_mesh','13_lit','14_loft','15_digital_engine','16_engines','21_suv','22_faces','23_parts','24_4x4','25_coupe','26_wagon',
  '27_pickup','28_muscle','29_hatch','30_wheels','31_engine_bay','32_builds','40_physics','41_ground','42_chassis'];
/* the modules need a page only to draw; these stand in for it */
const STUB=`const document={getElementById:()=>null,createElement:()=>({getContext:()=>null,style:{}})},matchMedia=()=>({matches:false}),localStorage={getItem:()=>null,setItem:()=>{}},window={};\n`;
module.exports=function load(o={}){
  const mods=[...CARS,...(o.ranch?['50_country','51_ranch']:[]),'55_rigs','56_ratings','57_feats'];
  const names=['BUILDS','CARS','specOf','buildChassis','makeCar','cgOf','GroundWorld','setLow','setLockers','RUNNING','ENGINE_OF','SUSP','TREAD_MU','SURF_RR','TREAD_RR_MUD',
    'CAR_PARTS','PRESET_PARTS','SLOTS','slotOptions','fits','fixRig','rigBuild','presetRig','presetsOf','suvDesign','SIM','HCG','BODIES',
    'rateRig','rateBuild','TERRAINS','COURSES_T','Feats','FEAT_DEFS'].concat(o.ranch?['Ranch']:[]);
  const src=STUB+mods.map(m=>fs.existsSync(SRC+m+'.js')?fs.readFileSync(SRC+m+'.js','utf8'):'').join('\n')+
    '\nreturn {'+names.map(n=>`${n}:typeof ${n}==='undefined'?undefined:${n}`).join(',')+'};';
  return new Function(src)();
};
