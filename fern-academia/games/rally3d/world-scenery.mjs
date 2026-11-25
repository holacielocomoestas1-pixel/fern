import { ChunkMesh, blend, tint, clamp, rgb } from "./world-geometry.mjs";
import { roadPoint, inBridge } from "./world-track.mjs";
import { markInstances, transformFace } from "./world-fixtures.mjs";

const banks = {
  moss:{props:["pine","pine","pine","crag"], spacing:11.3, size:1.08, uplift:9},
  lantern:{props:["blossom","pine","blossom","crag"],spacing:15,size:.98,uplift:10},
  river:{props:["palm","palm","crag","palm"],spacing:15.6,size:1.1,uplift:4},
  mangrove:{props:["palm","palm","blossom","palm"],spacing:11.8,size:.86,uplift:2.2},
  quarry:{props:["crag","crag","pine","crag"],spacing:14.5,size:1.13,uplift:14},
  orchard:{props:["blossom","blossom","blossom","pine"],spacing:12.2,size:1.03,uplift:7},
  glacier:{props:["crag","pine","crag","crag"],spacing:17.1,size:1.10,uplift:18},
  caldera:{props:["crag","crag","crag","crag"],spacing:15.8,size:1.23,uplift:18},
  citadel:{props:["pine","crag","blossom","pine"],spacing:16.3,size:1.02,uplift:10},
  aurora:{props:["pine","crag","crag","pine"],spacing:18,size:.89,uplift:15},
};
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

const bark=[.25,.21,.16], up=[0,1,0];
function wooded(course) { return banks[course.id]||banks.moss; }

// A small spatial survey avoids an exhaustive track scan per terrain vertex.
// Empty interior/outside cells expand until the remaining cells cannot be closer.
export function terrainSurvey(course) {
  const grid=new Map(), cell=55;
  const bounds=[Infinity,Infinity,-Infinity,-Infinity];
  for(let s=0;s<course.length;s+=6){
    const f={s,...course.frame(s)};
    const i=Math.floor(f.x/cell), j=Math.floor(f.z/cell), key=i+","+j;
    if(!grid.has(key))grid.set(key,[]);
    grid.get(key).push(f);
    bounds[0]=Math.min(bounds[0],f.x);bounds[1]=Math.min(bounds[1],f.z);
    bounds[2]=Math.max(bounds[2],f.x);bounds[3]=Math.max(bounds[3],f.z);
  }
  function nearest(x,z){
    const i=Math.floor(x/cell),j=Math.floor(z/cell);
    let best, d2=Infinity;
    for(let ring=0;ring<128;ring++){
      for(let u=-ring;u<=ring;u++)for(let v=-ring;v<=ring;v++){
        if(ring && Math.abs(u)!==ring && Math.abs(v)!==ring)continue;
        const records=grid.get((i+u)+","+(j+v));
        if(!records)continue;
        for(const f of records){
          const dx=x-f.x,dz=z-f.z,n=dx*dx+dz*dz;
          if(n<d2){best=f;d2=n;}
        }
      }
      if(best && d2<(ring*cell)**2)break;
    }
    return {f:best,d:Math.sqrt(d2)};
  }
  return {bounds,nearest};
}

function landNoise(x,z) {
  return .52*Math.sin(x*.040+1.2*Math.sin(z*.023))+.26*Math.cos(z*.076+x*.035)+.15*Math.sin(x*.12-z*.12)+.07*Math.cos(z*.25+x*.09);
}

function floorSample(course,survey,spec,x,z){
  const {f,d}=survey.nearest(x,z), near=ease((d-course.halfWidth-4)/33);
  const n=landNoise(x,z);
  const water=course.id==="river"||course.id==="mangrove";
  const edge=f.y-2.7-Math.min(d*.028,1.5);
  let natural=f.y-2.7+(n+.14)*spec.uplift-2.6*Math.cos(.013*(z+x));
  if(water)natural=mix(natural,-6.2+1.7*n,ease((d-15)/25));
  else if(course.id==="quarry")natural=f.y-4.0+Math.floor((n+.5)*4)*4.25;
  else if(course.id==="glacier"||course.id==="aurora") natural+=3.5*Math.sin(z*.023);
  const shape=mix(edge,natural,near);
  return {height:inBridge(course,f.s)?Math.min(shape,f.y-5.2):shape,noise:n,near,d};
}

export function buildScenery(course,p,random,marks){
  const terrain=new ChunkMesh({surface:"land",roughness:.93});
  const structures=new ChunkMesh({roughness:.59});
  const lights=new ChunkMesh({roughness:.41,emissive:.52});
  const water=new ChunkMesh({water:true,roughness:.20});
  const survey=terrainSurvey(course), spec=wooded(course);
  const [minX,minZ,maxX,maxZ]=survey.bounds;
  const spacing=16, pad=150;
  const cols=Math.ceil((maxX-minX+pad*2)/spacing),rows=Math.ceil((maxZ-minZ+pad*2)/spacing);
  let prev;
  for(let j=0;j<=rows;j++){
    const row=[];
    for(let i=0;i<=cols;i++){
      const x=minX-pad+i*spacing,z=minZ-pad+j*spacing;
      const sample=floorSample(course,survey,spec,x,z);
      const light=clamp(.40+.38*sample.noise+.12*Math.sin(x*.103-z*.042),0,.95);
      const base=blend(p.terrain,p.terrainLight,light);
      row.push({p:[x,sample.height,z],col:blend(p.verge,base,.3+.7*sample.near)});
      if(j&&i){
        const vertices=[prev[i-1],row[i-1],row[i],prev[i]];
        terrain.quad(...vertices.map(v=>v.p),base,undefined,vertices.map(v=>v.col));
      }
    }
    prev=row;
  }
  // The verge follows the bank at sub-grid resolution, sealing the tarmac to the countryside.
  const count=Math.ceil(course.length/5);
  for(let i=0;i<count;i++){
    const s=course.length*i/count, end=course.length*(i+1)/count;
    if(inBridge(course,s))continue;
    for(const side of [-1,1]){
      const a=side*(course.halfWidth+.62),b=side*(course.halfWidth+9.5);
      const c=side*(course.halfWidth+16.5);
      const q=(t,off,y)=>roadPoint(course,t,off,y);
      const h=-1.55+.32*Math.cos(i*.49+side);
      terrain.quad(q(s,a,-.16),q(end,a,-.16),q(end,b,h),q(s,b,h),p.verge,up);
      terrain.quad(q(s,b,h),q(end,b,h),q(end,c,-4.0),q(s,c,-4.0),tint(p.verge,.94),up);
    }
  }
  if(course.id==="river"||course.id==="mangrove"){
    const sy=course.id==="mangrove"?-.59:-1.5;
    const left=minX-pad*1.3,right=maxX+pad*1.3,base=minZ-pad*1.3,top=maxZ+pad*1.3;
    for(let z=base;z<top;z+=94)for(let x=left;x<right;x+=94)
      water.quad([x,sy,z],[x,sy,z+94],[x+94,sy,z+94],[x+94,sy,z],p.water,up);
  }else {
    for(const [begin,end] of course.bridges||[]){
      let f=course.frame((begin+end)*.5*course.length);
      const half=Math.min(18,(end-begin)*course.length*.5);
      const plane=(x,z)=>[f.x+f.rx*x+f.dx*z,f.y-6.15,f.z+f.rz*x+f.dz*z];
      water.quad(plane(-52,-half),plane(-52,half),plane(52,half),plane(52,-half),p.water,up);
    }
  }
  for(const mark of marks){
    for(const face of mark.faces){
      const color=rgb(face.paint);
      const emitter=face.paint==="ffe9a4"||face.paint==="f7b743";
      const mesh=emitter?lights:structures;
      const points=transformFace(face.points,mark.x,mark.y,mark.z,mark.yaw);
      for(let i=1;i<points.length-1;i++)mesh.triangle(points[0],points[i],points[i+1],color);
    }
  }
  return [...terrain.finish(),...water.finish(),...structures.finish(),...lights.finish()];
}

export function planting(course, random, marks=[]) {
  const props=[], spec=wooded(course);
  const survey=terrainSurvey(course);
  const plant=(s,side,range,back)=>{
    const f=course.frame(s);
    const x=f.x+f.rx*side*range,z=f.z+f.rz*side*range;
    if(marks.some(mark=>(mark.x-x)**2+(mark.z-z)**2<72))return;
    const sample=floorSample(course,survey,spec,x,z);
    if(sample.d<course.halfWidth+(back?5.2:3.3))return;
    const kind=spec.props[Math.floor(random()*spec.props.length)];
    const size=(kind==="crag"?5.4+random()*8.8:kind==="blossom"?6.3+random()*4.6:7.9+random()*7.3)*spec.size*(back?1.28:1);
    const ratio=kind==="pine"?.60:kind==="palm"?.82:kind==="crag"?.87:1.02;
    // Roadside ground is the profiled verge ribbon, not the coarser valley floor.
    const y=range<course.halfWidth+9?f.y+Math.tan(f.bank)*side*range-1.3:sample.height-.22;
    props.push({type:kind,x,y,z,center:[x,y,z],size,width:size*ratio,flip:random()>.5,wobble:random(),bright:random()>.5,back});
  };
  for(let s=18;s<course.length-14;s+=spec.spacing*(.78+random()*.43)){
    if(inBridge(course,s))continue;
    for(const side of [-1,1]){
      if(random()>.15)plant(s+random()*4,side,course.halfWidth+4.6+random()*11,false);
      if(random()>.37)plant(s+random()*8,side,course.halfWidth+19+random()*29,true);
    }
  }
  return props;
}
