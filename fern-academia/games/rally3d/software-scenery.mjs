import { ridgeElevation, ridgeColor, auroraBand } from "./atmosphere.mjs";

const TAU=2*Math.PI;
const TYPES=new Set(["pine","palm","blossom","crag","rock","stack"]);
const cap=(value,low,high)=>Math.min(high,Math.max(low,value));
const rgb=color=>`rgb(${color.map(n=>Math.round(n*255)).join(",")})`;
const rgba=(color,a)=>`rgba(${color.map(n=>Math.round(n*255)).join(",")},${a})`;

function rng(seed) {
  let state=seed|0||1;
  return () => {
    state^=state<<13;state^=state>>>17;state^=state<<5;
    return (state>>>0)/4294967296;
  };
}

function region(canvas,size) {
  const document=canvas.ownerDocument||globalThis.document;
  const tile=document?.createElement?.("canvas")||(typeof OffscreenCanvas!=="undefined"?new OffscreenCanvas(size,size):null);
  if(!tile)return null;
  tile.width=tile.height=size;
  return tile;
}

function path(ctx,points,paint) {
  ctx.fillStyle=paint;
  ctx.beginPath();
  ctx.moveTo(...points[0]);
  for(let i=1;i<points.length;i++)ctx.lineTo(...points[i]);
  ctx.closePath();
  ctx.fill();
}

function oval(ctx,x,y,a,b,color,rotation=0) {
  ctx.fillStyle=color;
  ctx.beginPath();ctx.ellipse(x,y,a,b,rotation,0,TAU);ctx.fill();
}

function line(ctx,coords,stroke,width) {
  ctx.strokeStyle=stroke;
  ctx.lineWidth=width;ctx.lineCap="round";
  ctx.beginPath();ctx.moveTo(...coords[0]);
  for(let i=1;i<coords.length;i++)ctx.lineTo(...coords[i]);
  ctx.stroke();
}

function pine(ctx,r,tone,course) {
  const snow=course==="aurora"||course==="glacier";
  const lean=(r()-.5)*.16;
  line(ctx,[[0,0],[lean*.32,-.47],[lean,-1.05]],tone("bark"),.06);
  line(ctx,[[-.015,-.03],[lean,-.89]],"rgba(245,224,179,.16)",.008);
  for(let i=0;i<8;i++){
    const height=-.16-i*.108;
    const half=(.43*(1-i*.103))*(.86+.22*r());
    const y=height-.22;
    const x=lean*(i+1)/8;
    const outline=[[x,y],[x+half*.24,height-.096],[x+half*.66,height-.033]];
    for(let j=6;j>=-6;j--){
      const u=j/6;
      const span=.57+.43*Math.abs(u);
      outline.push([x+u*half*(.78+.22*r()),height+Math.sin(j*.88)*.026+(r()-.3)*.043-Math.abs(u)*.031+span*.02]);
    }
    outline.push([x-half*.67,height-.057],[x-half*.24,height-.12]);
    const crown=ctx.createLinearGradient(x-half,y,x+half,height+.06);
    crown.addColorStop(0,tone("light"));
    crown.addColorStop(.58,tone("leaves"));
    crown.addColorStop(1,tone("hill"));
    path(ctx,outline,crown);
    for(let j=0;j<14;j++){
      const side=j%2?-1:1;
      const d=r();
      const nx=x+side*half*d*.98;
      const ny=height-.035-.102*(1-d)+r()*.054;
      line(ctx,[[nx-side*half*.33,ny-.048],[nx,ny+.005],[nx+side*half*.03,ny+.02]],
        snow&&j%3===0?"rgba(226,241,237,.64)":j%4===0?"rgba(193,221,163,.23)":"rgba(11,42,35,.38)", .006+r()*.007);
    }
    if(snow) path(ctx,[[x,y+.004],[x+half*.19,y+.085],[x+half*.63,height-.037],[x-half*.22,height-.08]],"rgba(227,241,242,.66)");
  }
}

function palm(ctx,r,tone) {
  const lean=(r()-.45)*.56;
  const tip=[lean,-.98];
  const trunk=ctx.createLinearGradient(-.08,0,.09,0);
  trunk.addColorStop(0,tone("metal"));trunk.addColorStop(.41,tone("bark"));trunk.addColorStop(1,tone("wood"));
  ctx.strokeStyle=trunk;ctx.lineWidth=.064;
  ctx.beginPath();ctx.moveTo(0,0);ctx.bezierCurveTo(-lean*.19,-.30,lean*.34,-.73,...tip);ctx.stroke();
  for(let i=1;i<20;i++){
    const n=i/20;
    const x=lean*(n*n*n+1.02*n*n*(1-n)-.57*n*(1-n)*(1-n));
    line(ctx,[[x-.03,-n*.96],[x+.031,-n*.96-.018]],"rgba(29,32,26,.42)",.006);
  }
  for(let i=0;i<9;i++) {
    const side=i%2?-1:1;
    const length=.36+r()*.31;
    const high=.11+r()*.17;
    const drop=((i*7)%9)/9*.39;
    const points=[tip];
    for(let j=1;j<=12;j++){
      const t=j/12;
      points.push([tip[0]+side*length*t,tip[1]-high*Math.sin(t*Math.PI)+drop*t*t]);
    }
    line(ctx,points,i%3===0?tone("light"):tone("leaves"),.018);
    for(let j=2;j<=11;j++){
      const at=points[j];const t=j/12;
      const leaf=(.16-.105*t)*(.84+r()*.26);
      path(ctx,[at,[at[0]+side*leaf*.58,at[1]+leaf*.43],[at[0]+side*(leaf*.82+.02),at[1]+leaf],[at[0]+side*leaf*.48,at[1]+leaf*.51]], i%3===0?tone("light"):tone("leaves"));
      path(ctx,[at,[at[0]+side*leaf*.48,at[1]-leaf*.53],[at[0]+side*leaf*.8,at[1]-leaf*.40],[at[0]+side*leaf*.37,at[1]-.014]],tone("light"));
    }
  }
  oval(ctx,tip[0],tip[1]+.042,.041,.036,tone("wood"));
}

function blossom(ctx,r,tone,course) {
  const spring=course==="orchard";
  const foliage=["#523745","#b97f94","#dcb3be","#e9c8c6"];
  const colors=spring?foliage:[tone("hill"),tone("leaves"),tone("light"),tone("curb")];
  const bend=(r()-.5)*.25;
  line(ctx,[[0,0],[-bend*.37,-.24],[bend*.33,-.50],[bend,-.83]],tone("bark"),.079);
  for(let i=0;i<7;i++) {
    const x=(r()-.5)*1.05+bend*.34;
    const y=-.63-r()*.42;
    line(ctx,[[bend*.07,-.35-i*.05],[(x+bend)*.45,-.58-i*.03],[x,y]],tone("bark"),.039);
    for(let j=0;j<16;j++){
      const a=r()*TAU;
      const d=.18+.08*r();
      const px=x+Math.cos(a)*d*r(),py=y+Math.sin(a)*d*.55*r();
      const s=.024+.085*r();
      oval(ctx,px,py,s,s*(.60+r()*.5),colors[Math.min(3,Math.floor(j*.225))],a*.36);
    }
  }
  for(let i=0;i<72;i++) {
    const x=(r()-.5)*1.26;
    const y=-.67-r()*.43;
    if((x*x*3.2+(y+.86)**2*11)>1)continue;
    oval(ctx,x,y,.008+r()*.017,.006+r()*.011,spring?"rgba(255,229,213,.57)":"rgba(248,202,224,.33)");
  }
}

function rock(ctx,r,tone,course) {
  const white=course==="glacier"||course==="aurora";
  const hot=course==="caldera";
  const center=(r()-.5)*.27;
  const contours=[[-.59,0],[-.48,-.40],[-.36,-.64],[-.17,-.81],[center,-1],[.26,-.86],[.34,-.59],[.50,-.31],[.57,0]];
  const grad=ctx.createLinearGradient(-.54,-.69,.56,-.08);
  grad.addColorStop(0,white?"#9cacb6":hot?"#666163":tone("light"));
  grad.addColorStop(.52,white?"#4f7581":tone("rock"));
  grad.addColorStop(1,hot?"#302538":tone("hill"));
  path(ctx,contours,grad);
  path(ctx,[[center,-1],[.18,-.72],[.20,-.49],[.08,-.31],[.18,0],[.57,0],[.52,-.35],[.34,-.61],[.26,-.86]],
    white?"rgba(22,61,86,.34)":"rgba(29,34,32,.36)");
  for(let i=0;i<17;i++){
    const sc=i/19, left=-.53+sc*.42,right=.48-sc*.33;
    const ay=-.05-sc*.91;
    const x=left+r()*(right-left);
    line(ctx,[[x,ay],[x+.08,ay-.035],[x+.19,ay-.028],[x+.19+r()*.12,ay-.065]],
      i%3===0?(white?"rgba(250,249,234,.54)":hot?"rgba(220,126,98,.45)":"rgba(210,204,149,.26)"):"rgba(28,36,40,.39)", .008+r()*.010);
  }
  if(white)path(ctx,[[center,-1],[.26,-.86],[.29,-.74],[.04,-.87],[-.14,-.77],[-.18,-.79]],"#e5f2ee");
}

function backdropLayers(ctx,w,h,level,focal,yaw,env,variant,time) {
  const phase=angle=>yaw+Math.atan((angle-w*.5)/focal);
  const yFor=angle=>level-focal*Math.tan(angle);
  const horizon=env.horizon||{height:.14,ruggedness:.46,forest:1,aurora:variant==="aurora"?1:0,seed:31};
  const muted=env.stars>.34||variant==="lantern";
  const layerCount=4;
  if(muted) {
    const density=env.stars>.34?62:21;
    const r=rng(83246);
    for(let i=0;i<density;i++){
      const az=r()*TAU-Math.PI;
      const diff=Math.atan2(Math.sin(az-yaw),Math.cos(az-yaw));
      const x=w*.5+Math.tan(diff)*focal;
      const y=yFor(.14+r()*.65);
      const size=.45+r()*1.05;
      if(Math.abs(diff)>1.2||x<0||x>w||y<0||y>=level)continue;
      oval(ctx,x,y,size,size,rgba([.90,.94,1],.31+r()*.41));
    }
  } else {
    // Directional wisps are anchored in the world and get thinner at the horizon.
    const r=rng((horizon.seed||311)*7391);
    for(let i=0;i<17;i++){
      const az=r()*TAU-Math.PI;
      const diff=Math.atan2(Math.sin(az-yaw),Math.cos(az-yaw));
      if(Math.abs(diff)>1.23) {r();r();r();continue;}
      const x=w*.5+Math.tan(diff)*focal;
      const y=yFor(.12+r()*.33);
      const cloudW=focal*(.085+r()*.24);
      const cloudH=cloudW*(.053+r()*.085);
      if(x+cloudW<0||x-cloudW>w||y>=level||y+cloudH<0)continue;
      const haze=ctx.createRadialGradient(x,y,0,x,y+1,cloudW);
      haze.addColorStop(0,rgba([1,.94,.85],.37));haze.addColorStop(1,rgba([1,.94,.85],0));
      oval(ctx,x,y,cloudW,cloudH,haze,-.064);
      oval(ctx,x+cloudW*.27,y-cloudH*.24,cloudW*.61,cloudH*.82,haze,.041);
    }
  }
  if(horizon.aurora>0) {
    const samples=45;
    for(let strand=0;strand<2;strand++){
      ctx.beginPath();ctx.lineWidth=(strand===0?8:3)*h/844;
      ctx.strokeStyle=strand===0?"rgba(114,248,185,.43)":"rgba(205,164,255,.31)";
      for(let i=0;i<=samples;i++){
        const x=w*i/samples;
        const {center,width,strength}=auroraBand(phase(x),time,horizon);
        if(!Number.isFinite(center)||!width||strength<.015)continue;
        const y=yFor(center+width*(strand===0?-.18:.44));
        if(i===0)ctx.moveTo(x,y);else ctx.lineTo(x,y);
      }
      ctx.stroke();
    }
    for(let i=0;i<45;i++){
      const x=w*i/44;
      const wave=auroraBand(phase(x),time,horizon);
      if(!Number.isFinite(wave.center)||!wave.width||wave.strength<.015)continue;
      const y=yFor(wave.center), top=yFor(wave.center+wave.width);
      line(ctx,[[x,top],[x-1,y]],rgba([.32,.87,.71],cap(wave.strength*.38,.03,.55)),w/55);
    }
  }
  for(let layer=0;layer<layerCount;layer++){
    const paint=ridgeColor(layer,env);
    const alpha=layer===0?.73:.94;
    const ridgePoints=[];
    for(let i=0;i<=64;i++){
      const x=w*i/64,y=yFor(ridgeElevation(phase(x),layer,horizon));
      if(Number.isFinite(y))ridgePoints.push([x,y]);
    }
    if(ridgePoints.length<2)continue;
    const fill=ctx.createLinearGradient(0,cap(level-h*.30,-h,h),0,Math.max(cap(level+h*.49,-h,h),cap(level-h*.30,-h,h)+1));
    fill.addColorStop(0,rgba(paint,alpha));
    fill.addColorStop(.65,rgb(paint.map((n,i)=>n*.88+(env.fog?.[i]||n)*.12)));
    fill.addColorStop(1,rgb(paint.map(n=>n*.78)));
    path(ctx,[[-2,h+2],...ridgePoints,[w+2,h+2]],fill);
    if(layer<3&&(variant==="river"||variant==="moss")) {
      for(let k=3;k<61;k+=9){
        const [x,y]=ridgePoints[k];
        const j=ridgePoints[k-1];
        if(j[1]<y-4)continue;
        path(ctx,[[x,y],[x+w*.099,y+h*.24],[x+w*.028,y+h*.20],[j[0],j[1]]],rgba(env.fog,.13));
      }
    }
  }
}

export function createSoftwareScenery(canvas) {
  const cache=new Map();
  let last="";
  function setWorld(id){if(id!==last){cache.clear();last=id;}}
  function drawProp(ctx,item,x,y,scale,tone,fog,course) {
    const type=item.type;
    if(!TYPES.has(type))return false;
    const size=item.size*scale;
    const w=(item.width||item.size*.85)*scale;
    if(size<4||w<2)return true;
    if(size<14)return false;
    const specimen=Math.round((item.wobble??.42)*23)%4;
    const key=[type,specimen].join(":");
    let art=cache.get(key);
    if(!art){
      art=region(canvas,160);
      if(!art)return false;
      const sketch=art.getContext("2d");
      if(!sketch)return false;
      const random=rng(specimen*7710+83);
      sketch.translate(80,146);sketch.scale(108,111);
      sketch.lineJoin="round";
      if(type==="pine")pine(sketch,random,tone,course);
      else if(type==="palm")palm(sketch,random,tone,course);
      else if(type==="blossom")blossom(sketch,random,tone,course);
      else rock(sketch,random,tone,course);
      if(cache.size>=72)cache.delete(cache.keys().next().value);
      cache.set(key,art);
    }
    ctx.save();
    ctx.translate(x,y);
    if(item.flip)ctx.scale(-1,1);
    ctx.globalAlpha=1-fog*.040;
    ctx.drawImage(art,-w*.685,-size*1.208,w*1.37,size*1.324);
    ctx.restore();
    return true;
  }
  return { drawAtmosphere:backdropLayers, drawProp, setWorld, dispose(){cache.clear();} };
}
