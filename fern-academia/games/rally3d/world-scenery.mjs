import { ChunkMesh, blend, tint, clamp, rgb, unit } from "./world-geometry.mjs";
import { roadPoint, inBridge } from "./world-track.mjs";
import { transformFace } from "./world-fixtures.mjs";
import { buildFlora } from "./world-flora.mjs";

const banks = {
  moss:{props:["pine","pine","pine","pine","crag"], spacing:10.3, size:1.17, uplift:12},
  lantern:{props:["blossom","pine","blossom","crag"],spacing:15,size:.98,uplift:10},
  river:{props:["palm","crag","palm","palm"],spacing:14.8,size:1.16,uplift:7},
  mangrove:{props:["palm","palm","blossom","palm"],spacing:11.8,size:.86,uplift:2.2},
  quarry:{props:["crag","crag","pine","crag"],spacing:14.5,size:1.25,uplift:20},
  orchard:{props:["blossom","blossom","blossom","pine"],spacing:12.2,size:1.03,uplift:7},
  glacier:{props:["crag","pine","crag","crag"],spacing:16.3,size:1.19,uplift:20},
  caldera:{props:["crag","crag","crag","crag"],spacing:15.1,size:1.32,uplift:21},
  citadel:{props:["pine","crag","blossom","pine"],spacing:16.3,size:1.02,uplift:10},
  aurora:{props:["pine","crag","crag","pine"],spacing:17.3,size:.99,uplift:19},
};
// Groups appear beside authored landmarks rather than uniformly following the
// road. One formation uses a low-detail silhouette for the distant pieces.
const formations = {
  lantern: [1, "pine", 10, 1.44],
  river: [2, "crag", 9, 2.24],
  mangrove: [1, "palm", 11, 1.31],
  quarry: [2, "crag", 12, 2.83],
  orchard: [0, "blossom", 11, 1.21],
  glacier: [2, "crag", 12, 2.58],
  caldera: [1, "crag", 9, 2.71],
  citadel: [3, "crag", 8, 1.78],
  aurora: [1, "crag", 11, 2.32],
};
const mix=(a,b,t)=>a+(b-a)*t;
const ease=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};

const up=[0,1,0];
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
  return .48*Math.sin(x*.028+1.28*Math.sin(z*.021))+.27*Math.cos(z*.051+x*.038)
    +.15*Math.sin(x*.085-z*.069)+.069*Math.cos(z*.137+x*.108)+.031*Math.sin(z*.29-x*.13);
}

function floorSample(course,survey,spec,x,z){
  const {f,d}=survey.nearest(x,z), near=ease((d-course.halfWidth-4)/33);
  const n=landNoise(x,z);
  const water=course.id==="river"||course.id==="mangrove";
  const edge=f.y-2.9-Math.min(d*.028,1.5);
  const far=ease((d-course.halfWidth-27)/128);
  const ridge=(1-Math.abs(Math.sin(.011*x+.024*z+2.2*Math.sin(.008*z))))*.62+Math.abs(n)*.41;
  let natural=f.y-3.1+(n+.14)*spec.uplift+ridge*spec.uplift*far;
  if(water){
    natural=mix(natural,-6.2+2.5*n,ease((d-14)/29));
    if(course.id==="river") natural+=far*Math.max(0,ridge-.56)*32;
  }else if(course.id==="quarry"){
    const seam=(n+.54)*4.3;
    const terrace=Math.floor(seam)+ease((seam-Math.floor(seam)-.49)/.45);
    natural=f.y-6.3+terrace*5.1+ridge*far*9.0;
  }else if(course.id==="glacier"||course.id==="aurora"){
    natural+=Math.sin(z*.023+x*.008)*3.1+far*ridge*13;
  }else if(course.id==="caldera"){
    natural+=Math.sin(z*.015+x*.037)*3.5+far*ridge*16;
  }
  const shape=mix(edge,natural,near);
  return {height:inBridge(course,f.s)?Math.min(shape,f.y-5.2):shape,noise:n,near,d};
}

// Irregular ground transitions from weathered aggregate near the curb to soil
// or alpine scree. The same ramp gives props the height of the visible verge.
const vergeLevels = [[.62, -.13], [2.5, -.30], [6.4, -.94], [11.2, -2], [17.2, -3.8]];
function vergeHeight(s, distance, side) {
  const index=vergeLevels.findIndex(([offset]) => offset >= distance);
  if(index<=0)return vergeLevels[index===0?0:vergeLevels.length-1][1];
  const [from,a]=vergeLevels[index-1], [to,b]=vergeLevels[index];
  const gain=(distance-from)/(to-from);
  return mix(a,b,gain)+Math.min(distance/7,1)*(.27*Math.sin(s*.132+side*1.73)+.15*Math.sin(s*.319-side*.65));
}

export function buildScenery(course,p,marks,props,survey=terrainSurvey(course)){
  const terrain=new ChunkMesh({surface:"land",roughness:.93});
  const structures=new ChunkMesh({roughness:.59});
  const lights=new ChunkMesh({roughness:.41,emissive:.52});
  const water=new ChunkMesh({water:true,roughness:.20});
  const foliage=new ChunkMesh({surface:"foliage",roughness:.86},91);
  const timber=new ChunkMesh({surface:"stone",roughness:.86},117);
  const stone=new ChunkMesh({surface:"stone",roughness:.81},112);
  const spec=wooded(course);
  const [minX,minZ,maxX,maxZ]=survey.bounds;
  const spacing=13.6, pad=138;
  const cols=Math.ceil((maxX-minX+pad*2)/spacing),rows=Math.ceil((maxZ-minZ+pad*2)/spacing);
  const heights = Array.from({length:rows+1},(_,j) => Array.from({length:cols+1},(_,i) => {
    const x=minX-pad+i*spacing,z=minZ-pad+j*spacing;
    const sample=floorSample(course,survey,spec,x,z);
    const light=clamp(.42+.42*sample.noise+.09*Math.sin(x*.103-z*.042),.07,.94);
    let base=blend(p.terrain,p.terrainLight,light);
    if(course.id==="glacier"||course.id==="aurora"){
      const cold=ease((sample.noise+.31)*1.7)+(course.id==="glacier"?.12:0);
      base=blend(base,course.id==="glacier"?[.75,.825,.846]:[.49,.63,.69],Math.min(.74,cold*.70));
    }else if(course.id==="quarry"||course.id==="caldera"){
      base=blend(base,p.rock,clamp(.34+sample.noise*.32,0,.72));
    }
    return {p:[x,sample.height,z],color:blend(p.verge,base,.3+.7*sample.near)};
  }));
  const normal = (j,i) => {
    const left = heights[j][Math.max(i-1,0)].p, right = heights[j][Math.min(i+1,cols)].p;
    const north = heights[Math.max(j-1,0)][i].p, south = heights[Math.min(j+1,rows)][i].p;
    return unit([(left[1]-right[1])/(right[0]-left[0]),1,(north[1]-south[1])/(south[2]-north[2])]);
  };
  for(let j=0;j<rows;j++){
    for(let i=0;i<cols;i++){
      const coords=[[j,i],[j+1,i],[j+1,i+1],[j,i+1]];
      const points=coords.map(([z,x])=>heights[z][x]);
      terrain.quad(...points.map(v=>v.p),p.terrain,undefined,
        points.map(v=>v.color),coords.map(args=>normal(...args)));
    }
  }
  // The verge follows the bank at sub-grid resolution, sealing the tarmac to the countryside.
  const count=Math.ceil(course.length/5);
  for(let i=0;i<count;i++){
    const s=course.length*i/count, end=course.length*(i+1)/count;
    if(inBridge(course,s))continue;
    for(const side of [-1,1]){
      const q=(t,off)=>roadPoint(course,t,side*(course.halfWidth+off),vergeHeight(t,off,side));
      const hue=(t,off)=>{
        const l=.5+.25*Math.sin(t*.37+side)+.21*Math.cos(t*.083);
        const pavement=blend(p.verge,p.shoulder,.52);
        return tint(blend(pavement,blend(p.verge,p.terrain,.24),ease((off-.8)/4.4)),.76+.34*l+off*.012);
      };
      for(let j=1;j<vergeLevels.length;j++){
        const a=vergeLevels[j-1][0],b=vergeLevels[j][0];
        const coordinates=side>0?[[s,a],[end,a],[end,b],[s,b]]:[[s,b],[end,b],[end,a],[s,a]];
        terrain.quad(...coordinates.map(uv=>q(...uv)),p.verge,undefined,coordinates.map(uv=>hue(...uv)));
      }
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
  buildFlora(course,props,p,{foliage,timber,stone});
  return [...terrain.finish(),...water.finish(),...stone.finish(),...timber.finish(),...foliage.finish(),...structures.finish(),...lights.finish()];
}

export function planting(course, random, marks=[], survey=terrainSurvey(course)) {
  const props=[], spec=wooded(course);
  const plant=(s,side,range,back,kindBias,scale=1)=>{
    const f=course.frame(s);
    const x=f.x+f.rx*side*range,z=f.z+f.rz*side*range;
    if(marks.some(mark=>(mark.x-x)**2+(mark.z-z)**2<72))return;
    const sample=floorSample(course,survey,spec,x,z);
    if(sample.d<course.halfWidth+(kindBias==="fern"?1.65:back?5.2:3.3))return;
    const kind=kindBias||spec.props[Math.floor(random()*spec.props.length)];
    const rawSize=(kind==="crag"?5.4+random()*8.8:kind==="blossom"?5.9+random()*5.4:
      kind==="fern"?.76+random()*1.29:8.15+random()*8.5)*spec.size*(back?1.23:1)*scale;
    const size=kind==="crag"?Math.min(rawSize,(sample.d-course.halfWidth-.63)*2.02):rawSize;
    const ratio=kind==="pine"?.61:kind==="palm"?.83:kind==="crag"?.87:kind==="fern"?1.51:1.02;
    // Roadside ground is the profiled verge ribbon, not the coarser valley floor.
    const dist=range-course.halfWidth;
    const y=dist<17.2?f.y+Math.tan(f.bank)*side*range+vergeHeight(s,dist,side)-.16:sample.height-.43;
    props.push({type:kind,x,y,z,center:[x,y,z],size,width:size*ratio,flip:random()>.5,wobble:random(),bright:random()>.5,back});
  };
  for(let s=18;s<course.length-14;s+=spec.spacing*(.72+random()*.57)){
    if(inBridge(course,s))continue;
    const grove=.5+.17*Math.sin(s*.031)+.26*Math.cos(s*.014);
    for(const side of [-1,1]){
      if(random()>grove*.27)plant(s+random()*5,side,course.halfWidth+4.6+random()*13,false);
      if(random()>.22+grove*.31)plant(s+random()*9,side,course.halfWidth+20+random()*31,true);
      if((course.id==="moss"||course.id==="mangrove"||course.id==="orchard"||course.id==="citadel") && random()<.47){
        plant(s-3+random()*7,side,course.halfWidth+2.15+random()*5.0,false,"fern");
      }
    }
  }
  if(course.id==="moss"){
    // Fills the valley behind the kart in the initial orbit and keeps the
    // start line, signage, touch camera and racing surface clear.
    for(const side of [-1,1]){
      for(const [t, extra, size] of [[-45,14,1.13],[-36,13,1.28],[-30,17,1.20],[-21,11,1.40],[-12,14,1.22],[-6,8,1.21],[4,14,1.17]]){
        plant(t+side*2.4,side,course.halfWidth+extra,false,"pine",size);
      }
      for(const t of [-39,-29,-20,-8,3,9,16,24]){
        plant(t+side*2.5,side,course.halfWidth+2.15+random()*1.7,false,"fern",1.03);
      }
    }
  }
  const formation=formations[course.id];
  if(formation){
    const [landmark, kind, count, mass]=formation;
    const anchor=course.landmarks[landmark].fraction*course.length;
    const side=landmark%2===0?-1:1;
    for(let i=0;i<count;i++){
      const along=(i-count*.5)*6.6 + 3.7*random();
      const arc=1-Math.abs(i-(count-1)*.5)/(count*.5);
      const height=(.66+.30*arc+.27*random())*mass;
      const back=i%2===0;
      plant(anchor+along,side,course.halfWidth+22+arc*19+(back?11:0)+random()*7,back,kind,height);
    }
  }
  return props;
}
