import { Mesh, rgb } from "./world-geometry.mjs";

export const panoramaFor = {
  moss:"woodland", lantern:"twilight", river:"coast", mangrove:"mangrove", quarry:"quarry",
  orchard:"orchard", glacier:"alpine", caldera:"caldera", citadel:"citadel", aurora:"aurora",
};

const palette = {
  carbon:"232c32", brass:"cc9958", cream:"f4edd0", amber:"f7b743", orange:"d96332", glass:"25928e",
  teal:"53ded5", green:"28544e", lamp:"ffe9a4", navy:"293c58", oil:"2d3045", steel:"778487",
  iron:"515d60", wood:"76604b", pale:"b8c3ba", stone:"90978c", blue:"7893a2", rust:"ab6042",
};
const swatch = name => palette[name] || name;

function model() {
  const faces=[];
  function face(points,paint) { faces.push({points,paint:swatch(paint)}); }
  function box(x,y,z,w,h,d,paint,yaw=0) {
    const c=Math.cos(yaw),s=Math.sin(yaw);
    const p=(a,b,f)=>[x + a*w*.5*c + f*d*.5*s, y + b*h, z + f*d*.5*c - a*w*.5*s];
    const A=p(-1,0,-1), B=p(1,0,-1), C=p(1,1,-1), D=p(-1,1,-1);
    const E=p(-1,0,1), F=p(1,0,1), G=p(1,1,1), H=p(-1,1,1);
    for(const points of [[A,D,C,B],[F,G,H,E],[A,E,H,D],[B,C,G,F],[D,H,G,C]])face(points,paint);
  }
  function cone(x,y,z,r,R,h,n,paint,aspect=1){
    const p=(i,top)=>{const a=i*2*Math.PI/n;return [x+(top?R:r)*Math.cos(a),y+(top?h:0),z+(top?R:r)*Math.sin(a)*aspect];};
    for(let i=0;i<n;i++)face([p(i,0),p(i,1),p(i+1,1),p(i+1,0)],paint);
    if(R>.015)face(Array.from({length:n},(_,i)=>p(n-1-i,1)),paint);
  }
  function beam(a,b,r,paint,n=4) {
    const length=Math.hypot(b[0]-a[0],b[1]-a[1],b[2]-a[2]);
    if(length<.001)return;
    const dir=b.map((v,i)=>(v-a[i])/length);
    const probe=Math.abs(dir[1])>.9?[1,0,0]:[0,1,0];
    const cross=(v,w)=>[v[1]*w[2]-v[2]*w[1],v[2]*w[0]-v[0]*w[2],v[0]*w[1]-v[1]*w[0]];
    const side=cross(dir,probe);const l=Math.hypot(...side);for(let i=0;i<3;i++)side[i]/=l;
    const up=cross(dir,side);
    const p=(center,i)=>{const t=i*2*Math.PI/n;return center.map((v,k)=>v+r*(side[k]*Math.cos(t)+up[k]*Math.sin(t)));};
    for(let i=0;i<n;i++)face([p(a,i),p(b,i),p(b,i+1),p(a,i+1)],paint);
  }
  return {faces,face,box,cone,beam};
}

function boxStripes(b,x,y,z,w,h,d){
  b.box(x,y,z,w,h,d,"amber");
  for(const side of [-1,1]) {
    const zf=z+side*(d*.5+.008);
    for(let i=-2;i<3;i++){
      const left=x+w*(i/5-.04), right=left+w*.09;
      b.face([[left,y,zf],[right,y,zf],[right+w*.065,y+h,zf],[left+w*.065,y+h,zf]],"carbon");
    }
  }
}

function hazard(kind) {
  const b=model();
  if(kind==="slick"){
    const sides=19;
    const edge=t=>{const a=t*2*Math.PI/sides;const radius=.88+.08*Math.sin(a*5+.6)+.04*Math.sin(a*3);
      return [Math.cos(a)*radius,.038,Math.sin(a)*radius];};
    b.face(Array.from({length:sides},(_,i)=>edge(sides-i)),"navy");
    b.face(Array.from({length:sides},(_,i)=>{const [x,y,z]=edge(sides-i);return [x*.86,y+.006,z*.86];}),"oil");
    for(let i=0;i<3;i++) {
      const t=.18+i*.09;
      b.face([[-.65+i*.17,.055,t],[-.19+i*.19,.055,t+.075],[.24+i*.09,.055,t+.04],[-.07+i*.1,.055,t+.004]],i%2?"6b7294":"639a9e");
    }
  } else if(kind==="hurdle"){
    for(const x of [-.81,.81]){
      b.box(x,0,0,.22,.17,.70,"iron");b.box(x,.13,0,.10,.68,.20,"cream");
    }
    boxStripes(b,0,.50,0,1.98,.38,.32);
    b.box(0,.89,0,1.95,.045,.33,"cream");
  } else if(kind==="slalom"){
    for(const x of [-.56,.56]){
      b.box(x,0,0,.72,.13,.49,"carbon");
      b.cone(x,.13,0,.33,.092,.96,8,"orange",1.18);
      b.cone(x,.54,0,.231,.182,.19,8,"cream",1.18);
      b.cone(x,1.06,0,.095,.075,.10,8,"lamp",1.18);
    }
    b.box(0,.31,0,.94,.13,.09,"amber");
  } else {
    b.box(0,.11,0,1.85,.25,.83,"carbon");
    boxStripes(b,0,.32,0,1.94,.41,.72);
    b.box(0,.72,.02,1.32,.17,.55,"steel");
    for(const x of [-.62,.62]){
      b.cone(x,.90,0,.125,.082,.21,7,"orange");
      b.cone(x,1.11,0,.078,.044,.07,7,"lamp");
    }
  }
  return b.faces;
}

function powerBox() {
  const b=model(), e=.72, clip=.14;
  const ring=(y,r)=>[[-r+clip,y,-r],[r-clip,y,-r],[r,y,-r+clip],[r,y,r-clip],
    [r-clip,y,r],[-r+clip,y,r],[-r,y,r-clip],[-r,y,-r+clip]];
  const bottom=ring(-.56,e-.13), mid=ring(-.43,e), upper=ring(.43,e), lid=ring(.56,e-.13);
  for(let i=0;i<8;i++){
    const j=(i+1)%8;
    b.face([bottom[i],mid[i],mid[j],bottom[j]],i%2?"brass":"green");
    b.face([mid[i],upper[i],upper[j],mid[j]],i%2?"brass":"glass");
    b.face([upper[i],lid[i],lid[j],upper[j]],i%2?"lamp":"teal");
  }
  b.face(lid.slice().reverse(),"teal");
  for(let side=0;side<4;side++){
    const a=side*Math.PI/2, c=Math.cos(a),s=Math.sin(a);
    const p=(x,y)=>[c*x-s*(e+.01),y,-s*x-c*(e+.01)];
    b.face([p(0,.33),p(.073,.086),p(.36,0),p(.078,-.076),p(0,-.34),p(-.075,-.08),p(-.34,0),p(-.075,.073)],"lamp");
  }
  return b.faces;
}

export const fixtures = Object.fromEntries(["slick","sweeper","hurdle","slalom"].map(kind=>[kind,hazard(kind)]));
fixtures.item=powerBox();

export function fixtureMesh(faces, material={}) {
  const mesh=new Mesh(material);
  for(const {points,paint} of faces){
    const tint=rgb(paint);
    for(let i=1;i<points.length-1;i++)mesh.triangle(points[0],points[i],points[i+1],tint);
  }
  return mesh.toMesh();
}

const roof=(b,x,y,z,w,d,paint)=>{
  const h=w*.29;
  b.face([[x-w/2,y,z-d/2],[x,y+h,z-d/2],[x,y+h,z+d/2],[x-w/2,y,z+d/2]],paint);
  b.face([[x+w/2,y,z+d/2],[x,y+h,z+d/2],[x,y+h,z-d/2],[x+w/2,y,z-d/2]],paint);
  b.face([[x-w/2,y,z-d/2],[x+w/2,y,z-d/2],[x,y+h,z-d/2]],"wood");
};

function wheel(b,x,y,r,z){
  const at=(angle,zz)=>[x+Math.cos(angle)*r,y+Math.sin(angle)*r,zz];
  for(let i=0;i<12;i++){
    const a=i*Math.PI/6;
    b.beam(at(a,z),at(a+Math.PI/6,z),.25,"rust");
    b.beam([x,y,z],at(a,z),.14,"wood");
    b.box(...at(a,z),.36,.40,1.32,"wood");
  }
}
const motifs={
  mill(b) {
    b.box(-2.3,0,.6,5.5,4.4,6.8,"wood");roof(b,-2.3,4.4,.6,6.8,8,"iron");
    b.box(-2.3,1.5,-2.86,1,1.6,.08,"lamp");wheel(b,1.4,3.6,3.4,-.9);
  },
  pavilion(b) {
    b.box(0,0,0,7.4,.58,6,"stone");for(const x of [-2.7,2.7])for(const z of [-2,2])b.box(x,.58,z,.55,5,.55,"rust");
    for(let i=0;i<3;i++)b.cone(0,5+i*1.35,0,5.6-i*1.35,2.6-i*.95,1.25,4,i===1?"rust":"iron",.85);
    for(const x of [-2,2])b.cone(x,3.9,-2.2,.38,.36,.80,8,"amber");
  },
  lighthouse(b){
    b.cone(0,0,0,2.65,1.6,10,12,"cream");b.cone(0,3.8,0,2.3,2.12,1.65,12,"rust");
    b.cone(0,10,0,2.01,1.99,.38,12,"navy");b.cone(0,10.38,0,1.3,1.3,1.9,10,"lamp");
    b.cone(0,12.28,0,2.11,.05,1.44,10,"rust");b.box(0,0,-2.58,1.15,2.45,.08,"green");
  },
  dock(b){
    for(const x of [-3.6,3.6])for(const z of [-3.4,3.4])b.box(x,-1,z,.35,4,.35,"wood");
    b.box(0,1.8,0,8,.4,7.3,"wood");b.box(0,2.2,1.45,5.5,2.8,3.3,"green");
    roof(b,0,5.0,1.45,6.8,4.8,"rust");for(const x of [-2.6,-.7,1.4])b.box(x,2.2,-3.0,.20,1.15,.20,"cream");
    b.beam([-3.3,3.26,-3],[3.3,3.26,-3],.10,"brass");
  },
  gantry(b){
    for(const x of [-2.2,2.2])for(const z of [-2.1,2.1])b.beam([x,0,z],[x*.60,10.3,z*.60],.28,"iron");
    for(let i=0;i<4;i++)for(const sign of [-1,1])b.beam([sign*1.8,i*2.55,-1.6],[-sign*1.8,(i+1)*2.55,-1.55],.095,"steel");
    b.box(0,9.9,0,3.6,2.1,3.5,"rust");b.beam([-2.5,11.9,0],[6.7,15.0,0],.29,"brass");
    b.beam([-2.1,11.1,0],[6.7,15,0],.24,"iron");b.beam([6.4,14.9,0],[6.4,6.9,0],.07,"carbon");
    b.box(6.4,6.5,0,1.2,.45,1.28,"rust");
  },
  tower(b){
    b.cone(0,0,0,3.15,2.23,7,8,"stone");b.cone(0,7,0,2.95,2.95,.55,8,"wood");
    b.box(0,7.5,0,3.35,2.45,3.35,"wood"); for(const z of [-1.71,1.71])b.box(0,8.25,z,2.52,1.12,.09,"lamp");
    b.cone(0,10.0,0,3.65,.1,2.4,4,"iron");
  },
  greenhouse(b){
    b.box(0,0,0,7.8,.54,6,"stone");b.box(0,.54,0,7.3,2.8,5.5,"glass");roof(b,0,3.34,0,8.2,6.3,"pale");
    for(const x of [-3,-1.5,0,1.5,3])b.box(x,.54,-2.83,.13,2.8,.14,"cream");
    for(const x of [-2.45,0,2.45])b.cone(x,.42,-3.9,.42,.58,.92,6,"rust");
  },
  ice(b){
    for(const [x,z,r,h] of [[0,0,4.8,9],[-3.8,2.6,3.4,6],[3.1,-1.1,2.8,11],[-2.6,-2.8,2.1,4.2]]) {
      b.cone(x,-.4,z,r,r*.73,h,5,"92b6bf",.72);b.cone(x,h-.4,z,r*.74,.025,h*.39,5,"d2e3e1",.72);
    }
  },
  stone(b){
    for(const [x,z,r,h] of [[0,0,3.5,9.8],[-3.6,2.7,2.1,6],[3,-1.1,2.55,9.5],[-2.1,-3,1.65,4.7]]){
      b.cone(x,-.5,z,r,r*.65,h,7,"stone",.75);b.cone(x,h-.5,z,r*.65,.22,h*.30,7,"pale",.75);
    }
  },
  bridge(b){
    for(const x of [-4.6,3.7])b.box(x,0,0,2.3,7.8,3.4,"stone");
    b.box(-.5,7.8,0,12.8,1.3,3.9,"stone");for(const x of [-6,-3,0,3,5])b.box(x,9.1,0,.42,.92,3.7,"cream");
    b.beam([-3.6,5.0,0],[-1.4,7.6,0],.64,"stone");b.beam([2.6,5.0,0],[.4,7.6,0],.64,"stone");
  },
  citadel(b){
    b.box(0,0,0,7.5,5.8,4.1,"stone");for(const x of [-3.7,3.7]){
      b.cone(x,0,0,2.35,2.0,8.2,8,"pale");b.cone(x,8.2,0,2.45,2.45,.52,8,"stone");
      for(let i=0;i<6;i++){const a=i*Math.PI/3;b.box(x+1.85*Math.cos(a),8.72,1.85*Math.sin(a),.72,.83,.70,"pale");}
    }b.box(0,0,-2.1,1.9,3.5,.10,"carbon");
  },
  dome(b){
    b.cone(0,0,0,4.0,4.0,4.2,12,"steel");b.cone(0,4.2,0,4.0,3.7,1.08,12,"pale");
    b.cone(0,5.28,0,3.7,2.75,1.25,12,"pale");b.cone(0,6.53,0,2.75,.26,1.18,12,"cream");
    b.box(0,.45,-3.9,1.15,2.6,.18,"navy");b.beam([2.8,3.8,0],[4.4,7.9,2.1],.10,"steel");
    b.cone(4.4,7.9,2.1,.13,.09,.4,7,"amber");
  },
  vent(b){
    for(const [x,z,h] of [[-2.7,1.1,7.4],[0,-.2,10.8],[2.6,1.5,5.2]]){
      b.cone(x,-.3,z,2.25,1.32,h,8,"iron");b.cone(x,h-.3,z,1.35,1.59,.36,8,"rust");
      b.cone(x,h+.06,z,1.05,1.05,.045,8,"orange");
    }
  }
};

const aliases={
  roots:"dock",platform:"dock",pier:"dock",canopy:"pavilion",forest:"tower",pines:"tower",lookout:"tower",station:"dome",observatory:"dome",
  lantern:"pavilion",terrace:"pavilion",garden:"greenhouse",orchard:"greenhouse",stack:"stone",arch:"bridge",quarry:"stone",
  gate:"citadel",rampart:"citadel",aqueduct:"bridge",fjord:"ice",glacier:"ice",ridge:"stone",summit:"ice",crater:"vent",basalt:"vent",
  furnace:"vent",works:"gantry",crane:"gantry",cavern:"ice",spire:"stone",switchback:"stone",kiln:"vent",glasshouse:"greenhouse",
};
const defaultMotif={moss:"mill",lantern:"pavilion",river:"lighthouse",mangrove:"dock",quarry:"gantry",orchard:"greenhouse",glacier:"ice",caldera:"vent",citadel:"citadel",aurora:"dome"};
const landmarkCache=new Map();
export function landmarkFaces(kind,courseId){
  const key=motifs[kind]?kind:aliases[kind]||defaultMotif[courseId]||"tower";
  if(!landmarkCache.has(key)){
    const b=model();motifs[key](b);landmarkCache.set(key,b.faces);
  }
  return landmarkCache.get(key);
}

export function markInstances(course){
  return (course.landmarks||[]).map((item,i)=>{
    const s=item.fraction*course.length, f=course.frame(s);
    const side=i%2===0?1:-1, offset=side*(course.halfWidth+10+i*1.5);
    return {x:f.x+f.rx*offset,y:f.y-.72,z:f.z+f.rz*offset,yaw:Math.atan2(f.dx,f.dz)-side*.28,
      faces:landmarkFaces(item.kind,course.id),kind:item.kind};
  });
}

export function transformFace(points,x,y,z,yaw,w=1,h=1,l=1){
  const c=Math.cos(yaw),s=Math.sin(yaw);
  return points.map(p=>[x+c*p[0]*w+s*p[2]*l,y+p[1]*h,z+c*p[2]*l-s*p[0]*w]);
}
