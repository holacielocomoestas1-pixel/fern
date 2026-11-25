import { TAU, add, blend, clamp, cross, dot, randomFor, rgb, sub, tint, tube, unit } from "./world-geometry.mjs";

const bark = rgb("564032");
const snow = rgb("dfe9df");
const darkWood = rgb("4b3428");
const species = {
  moss: { pine: ["182a26","576650"], crag: ["404841","7b806d"], fern: ["2a352c","747f55"] },
  lantern: { pine: ["34364d","59616b"], blossom: ["7b5688","d08aa3"] },
  river: { palm: ["245046","7a9d65"], crag: ["788982","c6b995"] },
  mangrove: { palm: ["233f2e","6d8559"], blossom: ["213d2b","75956b"] },
  quarry: { pine: ["414732","7f8054"], crag: ["6d5140","b08a60"] },
  orchard: { pine: ["284338","536c52"], blossom: ["7f5670","e8aab2"] },
  glacier: { pine: ["263c3b","778c83"], crag: ["5c7680","bbe0df"] },
  caldera: { crag: ["352c35","84524c"] },
  citadel: { pine: ["2b473a","69856b"], blossom: ["494f50","c1a887"], crag:["5f6559","a49d82"] },
  aurora: { pine: ["203936","4f7670"], crag: ["435d67","93b7bb"] },
};

function colorsFor(course, prop, palette) {
  const values = species[course.id]?.[prop.type];
  const base = values ? values.map(rgb) : prop.type === "crag" ? [palette.rock,palette.rockLight] : [palette.leaf,palette.leafLight];
  if(course.id!=="moss"||prop.type!=="pine") return base;
  const cover=clamp(.51+.34*Math.sin(prop.x*.137+prop.z*.175)+.27*Math.cos(prop.z*.138-prop.x*.073),0,1);
  return base.map((value,index)=>{
    const warmth = [.28,.302,.248];
    const shade = blend(value,warmth,cover*(index===0?.21:.35));
    return tint(shade,.73+cover*.35);
  });
}

function face(mesh, a, b, c, center, color, samples, soft = false) {
  const n = cross(sub(b,a), sub(c,a));
  const outside = dot(n,sub(a,center)) >= 0;
  const points = outside ? [a,b,c] : [a,c,b];
  const shades = !outside && samples ? [samples[0],samples[2],samples[1]] : samples;
  const amount = typeof soft === "number" ? soft : Number(soft);
  let normals;
  if(amount){
    const facing = outside ? unit(n) : unit(n).map(value=>-value);
    normals = points.map(point => unit(blend(facing,unit(sub(point,center)),amount)));
  }
  mesh.triangle(...points,color,undefined,shades,normals);
}

function quadrangle(mesh, a, b, c, d, center, color, samples, soft) {
  face(mesh,a,b,c,center,color,samples && [samples[0],samples[1],samples[2]],soft);
  face(mesh,a,c,d,center,color,samples && [samples[0],samples[2],samples[3]],soft);
}

function makeSpace(prop) {
  const position = prop.center;
  const radians = prop.wobble * TAU;
  const c = Math.cos(radians), s = Math.sin(radians);
  const at = (x,y,z) => [position[0]+prop.size*(x*c+z*s),position[1]+prop.size*y,position[2]+prop.size*(z*c-x*s)];
  const drawTube = (mesh, a,b,w,v,paint,sides) => tube(mesh,at(...a),at(...b),w*prop.size,v*prop.size,paint,sides,1,null,false);
  return { at, drawTube };
}

function pine(prop, mesh, wood, course, colors, random) {
  const { at, drawTube } = makeSpace(prop);
  const wind = prop.flip ? 1 : -1;
  const base = [0,0,0], middle = [.019*wind,.46,-.027], crown = [.051*wind,.94,-.051];
  drawTube(wood,base,middle,.031,.017,bark,6);
  drawTube(wood,middle,crown,.017,.003,tint(bark, .79),6);
  const tiers = prop.back ? 4 : 6;
  const rays = prop.back ? 6 : 8;
  const icy = course.id === "glacier" || course.id === "aurora";
  for (let tier=0;tier<tiers;tier++){
    const part=tier/tiers;
    const baseY=.19+part*.73+(random()-.5)*.048;
    const ring=.31*(1-part)**.92*(.86+.20*random());
    const tip=at(.055*part*wind,baseY+.163+part*.09,-.051*part);
    const inner=at(.045*part*wind,baseY+.05,-.044*part);
    const lower=at(.043*part*wind,baseY-.077,-.045*part);
    const spin=2.393*tier+(random()-.5)*.40;
    const points=Array.from({length:rays},(_,index)=>{
      const a=spin+index*TAU/rays+(random()-.5)*.49, ragged=(index%3===0?.66:1)*(.68+random()*.58);
      return at(Math.cos(a)*ring*ragged+.043*part*wind,baseY+.114*(random()-.67),Math.sin(a)*ring*ragged-.042*part);
    });
    for(let i=0;i<rays;i++){
      const next=points[(i+1)%rays], here=points[i];
      const needle=blend(colors[0], colors[1], .25+part*.39 + random()*.18);
      const bright=tint(needle,1.17+.19*random());
      const icyTip=icy&&i%3===0?blend(bright,snow,.48+.17*part):bright;
      if(prop.back){
        face(mesh,tip,next,here,lower,needle,[bright,needle,needle],true);
      }else{
        const angle=spin+(i+.47)*TAU/rays;
        const fold=at(Math.cos(angle)*ring*.52+.043*part*wind,
          baseY+.108+random()*.042,Math.sin(angle)*ring*.52-.042*part);
        const extension = sub(here,inner).map((value,k) => here[k]+value*.22+(k===1?-.047*prop.size:0));
        face(mesh,tip,fold,here,lower,needle,[icyTip,bright,needle],true);
        face(mesh,tip,next,fold,lower,needle,[icyTip,needle,bright],true);
        face(mesh,fold,next,here,lower,needle,[bright,tint(needle,.88),needle],true);
        if(tier<5 && i%2===0){
          const barb=at(Math.cos(angle+.17)*ring*.91+.043*part*wind,baseY-.08-random()*.036,
            Math.sin(angle+.17)*ring*.91-.04*part);
          face(mesh,fold,here,extension,lower,bright,[bright,needle,tint(needle,.76)],true);
          face(mesh,fold,extension,barb,lower,needle,[bright,needle,tint(needle,.68)],true);
        }
      }
      face(mesh,lower,here,next,inner,tint(needle,.69));
    }
  }
}

function fern(prop, mesh, wood, colors, random) {
  const { at, drawTube } = makeSpace(prop);
  const rays=5;
  for(let ray=0;ray<rays;ray++){
    const phi=ray*TAU/rays+.37*random(), x=Math.cos(phi),z=Math.sin(phi);
    const reach=.48+.26*random(), height=.49+.43*random(), bent=.10+.24*random();
    const center=t=>[x*reach*t,t*height-bent*t*t*t,z*reach*t];
    drawTube(wood,center(0),center(.62),.012,.006,tint(colors[0],.82),4);
    drawTube(wood,center(.62),center(1),.006,.0015,tint(colors[0],.94),3);
    for(let i=1;i<=4;i++){
      const t=.15+i*.16,b=at(...center(t-.076)), m=at(...center(t)), f=at(...center(t+.12));
      const p=center(t), spread=.19*Math.sin(t*Math.PI)+.037, up=p[1];
      const core=at(p[0],p[1]-.38,p[2]);
      for(const side of [-1,1]){
        const tip=at(p[0]-z*side*spread+x*.027,up-.064+random()*.087,p[2]+x*side*spread+z*.027);
        const shade=blend(colors[0],colors[1],.31+.44*random());
        face(mesh,b,tip,m,core,shade,[tint(shade,.87),shade,tint(shade,1.10)],true);
        face(mesh,m,tip,f,core,shade,[shade,tint(shade,1.08),tint(shade,.93)],true);
      }
    }
  }
}

function palm(prop, mesh, wood, course, colors, random) {
  const { at, drawTube } = makeSpace(prop);
  const mangrove=course.id==="mangrove";
  const sway=.165+.095*prop.wobble, reach=mangrove?.55:.43;
  const trunk=t=>[sway*t*t,.84*t,Math.sin(t*.8)*-.087];
  const steps=prop.back?3:5;
  for(let i=0;i<steps;i++){
    const t=i/steps, next=(i+1)/steps;
    drawTube(wood,trunk(t),trunk(next),.042-.021*t,.042-.021*next,tint(mangrove?darkWood:bark,1+.17*(i%2)),5);
  }
  const crown=trunk(1), leafCount=prop.back?5:8;
  if(mangrove && !prop.back){
    for(let i=0;i<4;i++){
      const a=i*TAU/4+prop.wobble;
      drawTube(wood,[.13*Math.cos(a),.012,.13*Math.sin(a)],trunk(.24),.013,.021,tint(bark,.72),4);
    }
  }
  for(let i=0;i<leafCount;i++){
    const angle=i*TAU/leafCount+random()*.33, c=Math.cos(angle), s=Math.sin(angle);
    const length=reach*(.70+random()*.47), lift=.098+random()*.102, drop=.106+random()*.115;
    const center=t=>[crown[0]+c*t*length,crown[1]+Math.sin(t*Math.PI*.91)*lift-drop*t*t,crown[2]+s*t*length];
    const edges=t=>{
      const p=center(t), blade=(.03+(.065+(mangrove?.032:0)) * Math.sin(t*Math.PI))*(1-t*.90);
      return [at(p[0]-s*blade,p[1]-.026,p[2]+c*blade),at(p[0]+s*blade,p[1]-.026,p[2]-c*blade),at(...p)];
    };
    const tintLeaf=tint(blend(colors[0],colors[1],.28+.48*random()), .85+.21*random());
    let a=edges(0);
    const divisions=prop.back?3:6;
    for(let j=1;j<=divisions;j++){
      const t=j/divisions, b=edges(t);
      const above=add(b[2],[0,-.4,0]);
      quadrangle(mesh,a[2],a[0],b[0],b[2],above,tintLeaf);
      quadrangle(mesh,a[1],a[2],b[2],b[1],above,tint(tintLeaf, .76+.21*t));
      if(!prop.back && j>=2 && j<divisions){
        const mid=center(t), l=.045*(1.15-t);
        face(mesh,b[2],b[0],at(mid[0]+c*.055-s*l,mid[1]-.068,mid[2]+s*.055+c*l),above,tint(tintLeaf,.83));
        face(mesh,b[1],b[2],at(mid[0]+c*.052+s*l,mid[1]-.060,mid[2]+s*.052-c*l),above,tint(tintLeaf,1.08));
      }
      a=b;
    }
  }
}

function blossom(prop, mesh, wood, course, colors, random) {
  const { at, drawTube } = makeSpace(prop);
  const lean=(prop.wobble-.5)*.15;
  const crotch=[lean,.42,-.059];
  drawTube(wood,[0,0,0],[lean*.41,.23,-.024],.047,.035,darkWood,6);
  drawTube(wood,[lean*.41,.23,-.024],crotch,.035,.024,bark,6);
  const boughs=prop.back?3:5;
  for(let i=0;i<boughs;i++){
    const a=i*TAU/boughs + (random()-.5)*.35;
    const radial=i===0?.12:.24+random()*.129;
    const endpoint=[lean+Math.cos(a)*radial,(i===0?.823:.65)+random()*.20,Math.sin(a)*radial-.06];
    const bend=crotch.map((v,k)=>v+(endpoint[k]-v)*.57-(k===1?.016:0));
    if(prop.back) drawTube(wood,crotch,endpoint,.021,.0065,bark,4);
    else {
      drawTube(wood,crotch,bend,.021,.014,bark,5);
      drawTube(wood,bend,endpoint,.014,.0065,tint(bark,1.17),5);
    }
    const outer=i===0?.258:.20+random()*.038;
    const puffCenter=at(...endpoint), sideCount=prop.back?5:6;
    const rings=[[-.51,.62],[.028,1],[.49,.65]];
    const yaw=2.40*i;
    const slopes=Array.from({length:sideCount},()=>.78+.38*random());
    const points=rings.map(([dy,radius],tier)=>slopes.map((factor,side)=>{
      const angle=side*TAU/sideCount+yaw+tier*.19;
      return at(endpoint[0]+Math.cos(angle)*outer*radius*factor,endpoint[1]+dy*outer*.66+
        .033*Math.sin(side*2.137+tier),endpoint[2]+Math.sin(angle)*outer*radius*factor*.89);
    }));
    const petal=blend(colors[0],colors[1],.33+.40*random());
    const top=at(endpoint[0]+.02,endpoint[1]+outer*.64,endpoint[2]-.011);
    const under=at(endpoint[0],endpoint[1]-outer*.77,endpoint[2]+.013);
    for(let k=0;k<sideCount;k++){
      const v=(k+1)%sideCount;
      face(mesh,under,points[0][k],points[0][v],puffCenter,tint(petal,.68),undefined,true);
      for(let j=0;j<points.length-1;j++){
        const brush=tint(blend(colors[0],petal,(j+.63)/3.45),.92+.21*random());
        quadrangle(mesh,points[j][k],points[j][v],points[j+1][v],points[j+1][k],puffCenter,brush,undefined,true);
      }
      face(mesh,top,points.at(-1)[v],points.at(-1)[k],puffCenter,tint(petal,1.11+.08*random()),undefined,true);
    }
  }
}

function crag(prop, mesh, course, colors, random) {
  const {at}=makeSpace(prop);
  const icy=course.id==="glacier"||course.id==="aurora";
  const basalt=course.id==="caldera";
  const limestone=course.id==="river";
  const quarry=course.id==="quarry";
  const shape=prop.wobble;
  const rings=basalt?[[0,.78],[.18,.83],[.53,.71],[.89,.56],[1,.27]]:
    limestone?[[0,.88],[.15,1],[.32,.90],[.46,.82],[.64,.71],[.84,.56],[1,.21]]:
    quarry?[[0,.92],[.16,1],[.17,.82],[.37,.85],[.39,.66],[.62,.69],[.66,.54],[.86,.49],[1,.22]]:
    [[0,.83],[.16,1],[.30,.93],[.47,.84],[.64,.68],[.78,.56],[.92,.38],[1,.19]];
  const sides=prop.back?6:9;
  const drift=.32*(shape-.28);
  const center=at(0,.47,0);
  const cut=Array.from({length:sides},(_,i)=>{
    const a=i*TAU/sides;
    return .89+.13*Math.cos(2*a+shape*TAU)+.09*Math.sin(3*a+shape*3)+.13*random();
  });
  const pts=rings.map(([height,band],i)=>cut.map((radius,j)=>{
    const a=j*TAU/sides+.15*Math.sin(i*.69+shape*7);
    return at(Math.cos(a)*radius*band*(basalt?.354:.437)+drift*height,
      Math.max(0,height+.075*Math.sin(j*1.79+shape*6)+.029*Math.cos(j*3.15+i*.79)),
      Math.sin(a)*radius*band*(basalt?.29:.365)+.080*height);
  }));
  const shades=pts.map((_,t)=>cut.map((_,i)=>{
    const slope=t/rings.length;
    const stratum=quarry?Math.cos(t*2.43):.27*Math.sin(t*1.96+shape*5);
    const base=tint(blend(colors[0],colors[1],.15+.70*slope),.86+stratum*.1+.17*cut[i]);
    const ice=icy?clamp((slope-.31)*1.3+.18*Math.sin(i*.87-t*.41),0,.69):0;
    return tint(blend(base,snow,ice),.89+.20*Math.cos(i*TAU/sides+shape));
  }));
  const softness=basalt?.25:quarry?.36:icy?.63:.73;
  for(let t=0;t<pts.length-1;t++){
    for(let i=0;i<sides;i++){
      const next=(i+1)%sides;
      quadrangle(mesh,pts[t][i],pts[t][next],pts[t+1][next],pts[t+1][i],center,shades[t][i],
        [shades[t][i],shades[t][next],shades[t+1][next],shades[t+1][i]],softness);
    }
  }
  const tip=at(drift,1.035+.087*shape,.080);
  const cap=icy?blend(colors[1],snow,.66):colors[1];
  for(let i=0;i<sides;i++){
    const next=(i+1)%sides;
    face(mesh,pts.at(-1)[i],pts.at(-1)[next],tip,center,cap,[shades.at(-1)[i],shades.at(-1)[next],cap],softness);
  }
}

export function buildFlora(course, props, palette, surfaces) {
  const { foliage, timber, stone } = surfaces;
  for (const [i, prop] of props.entries()) {
    const random = randomFor(course.seed ^ Math.imul(i+7,2654435761));
    const colors = colorsFor(course,prop,palette);
    if (prop.type === "crag") crag(prop,stone,course,colors,random);
    else if (prop.type === "pine") pine(prop,foliage,timber,course,colors,random);
    else if (prop.type === "fern") fern(prop,foliage,timber,colors,random);
    else if (prop.type === "palm") palm(prop,foliage,timber,course,colors,random);
    else blossom(prop,foliage,timber,course,colors,random);
  }
}
