import { clamp, transform, wheelTransform } from "./render-math.mjs";

const TAU = 2 * Math.PI;
const TILE_METRES = 4.55;
const ANCHOR_Y = .74;
const AZIMUTH = 48;
const ELEVATION_STEP = .12;
const DEPTHS = [4.0, 6.2, 8.8, 13.8, 23, 80];
const MAX_CACHE = 112;
const DETAIL_SIZE = [544, 384, 192, 120, 80];
const BUDGET = 1;
const IDENTITY = new Float32Array([1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1]);

const dot = (x,y,z,v) => x*v[0]+y*v[1]+z*v[2];
const channel = value => clamp(Math.round(value*255),0,255);

function catalogPart(part) {
  if (!part?.positions?.length || !part?.normals?.length || !part?.colors?.length) return null;
  const {positions, normals, colors} = part;
  const packed = [], faces = [], visited = new Map();
  for (let n=0;n<positions.length;n+=3) {
    // Matching positions can still carry two normals or two material edges.
    const key = [positions[n],positions[n+1],positions[n+2],normals[n],normals[n+1],normals[n+2],colors[n],colors[n+1],colors[n+2]]
      .map(value => Math.round(value*40000)).join(" ");
    let i = visited.get(key);
    if (i === undefined) {
      i=packed.length/9;
      visited.set(key,i);
      packed.push(positions[n],positions[n+1],positions[n+2],normals[n],normals[n+1],normals[n+2],colors[n],colors[n+1],colors[n+2]);
    }
    faces.push(i);
  }
  return {
    vertices:new Float32Array(packed), triangles:new Uint32Array(faces),
    surface:part.surface || (part.emissive ? "lights" : "detail"), emissive:part.emissive||0,
    projected:new Float32Array(packed.length/9*6),
  };
}

function cameraPose(vehicle,camera) {
  const dx=camera.x-vehicle.x, dy=camera.y-vehicle.y, dz=camera.z-vehicle.z;
  const distance=Math.hypot(dx,dy,dz);
  const angle=(Math.atan2(dx,dz)-(vehicle.yaw||0))/TAU;
  const az=((Math.round(angle*AZIMUTH)%AZIMUTH)+AZIMUTH)%AZIMUTH;
  const el=Math.round(clamp(Math.atan2(dy,Math.hypot(dx,dz)),-.3,1.26)/ELEVATION_STEP);
  const range=DEPTHS.findIndex((depth,i)=>i===DEPTHS.length-1||distance<=Math.sqrt(depth*DEPTHS[i+1]));
  return {az,el,range,distance};
}

function lighting(env,az,el) {
  const sun=env?.sunDirection||[.42,.67,.46];
  // A broad racing key light gives the model stable shading as its wheels turn.
  const angle=az*TAU/AZIMUTH, elev=el*ELEVATION_STEP;
  const si=Math.sin(angle),co=Math.cos(angle),lift=Math.sin(elev),flat=Math.cos(elev);
  const light=[sun[0]*.64-.39,Math.max(.30,sun[1]),sun[2]*.57-.34];
  const length=Math.hypot(...light)||1;
  for(let i=0;i<light.length;i++)light[i]/=length;
  return {
    light,
    forward:[si*flat,lift,co*flat],
    right:[-co,0,si],
    up:[-si*lift,flat,-co*lift],
    direct:env?.sun||[1,.90,.77],
    ambient:env?.ambient??.78,
  };
}

function textureContext(canvas,size) {
  const document=canvas.ownerDocument||globalThis.document;
  const target=document?.createElement?.("canvas")
    || (typeof OffscreenCanvas!=="undefined" ? new OffscreenCanvas(size,size) : null);
  if(!target)return null;
  target.width=size;
  target.height=size;
  const context=target.getContext("2d");
  if(!context?.createImageData||!context.putImageData)return null;
  return {target,context};
}

function rasterize(target,part,matrix,view,depth,size) {
  const {vertices,triangles,projected,surface,emissive}=part;
  const {forward,right,up,light,direct,ambient}=view;
  const factor=size/TILE_METRES;
  const cx=size*.5,cy=size*ANCHOR_Y;
  const [lightR,lightG,lightB]=direct;
  const finish=surface==="paint" || surface==="metal" ? 1 : surface==="cloth"||surface==="fur" ? .29 : .45;
  const paint=surface==="paint"?1:0;
  const nap=surface==="fur"||surface==="cloth";
  for(let i=0,j=0;i<vertices.length;i+=9,j+=6) {
    const x=vertices[i], y=vertices[i+1], z=vertices[i+2];
    const px=matrix[12]+x*matrix[0]+y*matrix[4]+z*matrix[8];
    const py=matrix[13]+x*matrix[1]+y*matrix[5]+z*matrix[9];
    const pz=matrix[14]+x*matrix[2]+y*matrix[6]+z*matrix[10];
    const iz=1/Math.max(.8,depth-dot(px,py,pz,forward));
    const scale=factor*depth*iz;
    projected[j]=cx+dot(px,py,pz,right)*scale;
    projected[j+1]=cy-dot(px,py,pz,up)*scale;
    projected[j+2]=iz;
    const nx=vertices[i+3],ny=vertices[i+4],nz=vertices[i+5];
    const dx=nx*matrix[0]+ny*matrix[4]+nz*matrix[8];
    const dy=nx*matrix[1]+ny*matrix[5]+nz*matrix[9];
    const dz=nx*matrix[2]+ny*matrix[6]+nz*matrix[10];
    const nl=Math.max(0,dot(dx,dy,dz,light));
    const nv=Math.max(0,dot(dx,dy,dz,forward));
    const upLit=clamp(dy*.5+.5,0,1);
    const half=nl*.55+nv*.45;
    const spec=finish*(half**(paint?14:19))*.33;
    const rim=(1-nv)**3 * (.052+upLit*.075);
    const fibres=nap ? .97+.031*Math.sin(px*278+py*356+pz*537) : 1;
    const occlusion=.84+.16*clamp(py*1.1+.16,0,1);
    const bounce=(ambient*.64+upLit*.25+emissive*.5)*occlusion;
    const chroma=clamp(nl*.52+.057,0,.62);
    projected[j+3]=channel((vertices[i+6]*(bounce+chroma*lightR)*fibres)+(spec+rim*.75)*lightR);
    projected[j+4]=channel((vertices[i+7]*(bounce+chroma*lightG)*fibres)+(spec+rim*.9)*lightG);
    projected[j+5]=channel((vertices[i+8]*(bounce+chroma*lightB)*fibres)+(spec+rim)*lightB);
  }
  const {zBuffer,pixels}=target;
  const doubleSided = surface==="cloth";
  for(let i=0;i<triangles.length;i+=3) {
    const a=triangles[i]*6,b=triangles[i+1]*6,c=triangles[i+2]*6;
    const ax=projected[a],ay=projected[a+1], bx=projected[b],by=projected[b+1], cx=projected[c],cy=projected[c+1];
    const ux=bx-ax,uy=by-ay,vx=cx-ax,vy=cy-ay;
    const area=ux*vy-uy*vx;
    // The projected winding is counter-clockwise in this screen convention.
    if(Math.abs(area)<1e-5||(!doubleSided&&area<0))continue;
    const minX=Math.max(0,Math.ceil(Math.min(ax,bx,cx)-.5));
    const maxX=Math.min(size-1,Math.floor(Math.max(ax,bx,cx)-.5));
    const minY=Math.max(0,Math.ceil(Math.min(ay,by,cy)-.5));
    const maxY=Math.min(size-1,Math.floor(Math.max(ay,by,cy)-.5));
    if(minX>maxX||minY>maxY)continue;
    const div=1/area, dbx=vy*div,dcx=-uy*div;
    const depthA=projected[a+2],depthU=projected[b+2]-depthA,depthV=projected[c+2]-depthA;
    const ra=projected[a+3],ru=projected[b+3]-ra,rv=projected[c+3]-ra;
    const ga=projected[a+4],gu=projected[b+4]-ga,gv=projected[c+4]-ga;
    const ba=projected[a+5],bu=projected[b+5]-ba,bv=projected[c+5]-ba;
    const dz=depthU*dbx+depthV*dcx;
    for(let y=minY;y<=maxY;y++) {
      const ty=y+.5-ay,tx=minX+.5-ax;
      let u=(tx*vy-ty*vx)*div,v=(ux*ty-uy*tx)*div;
      let z=depthA+depthU*u+depthV*v;
      for(let x=minX,index=y*size+x;x<=maxX;x++,index++,u+=dbx,v+=dcx,z+=dz) {
        if(u< -1e-4||v< -1e-4||u+v>1.0001||z<=zBuffer[index])continue;
        zBuffer[index]=z;
        const p=index*4;
        pixels[p]=ra+ru*u+rv*v;
        pixels[p+1]=ga+gu*u+gv*v;
        pixels[p+2]=ba+bu*u+bv*v;
        pixels[p+3]=255;
      }
    }
  }
}

function stretchFade(ctx,image,scale) {
  const width=TILE_METRES*scale;
  if (width<=0) return;
  ctx.drawImage(image,-width*.5,-width*ANCHOR_Y,width,width);
}

function overlayPower(ctx,car,scale,time,reduced) {
  const names=["shield","magnet","grip","pulse","spring"];
  const shades=["#ffc76c","#b8a8ff","#b5f8b3","#b7e5ff","#fff0bf"];
  const which=names.findIndex(key=>car[key]>0);
  if(which<0 || scale<5) return;
  const halo=.93+(!reduced ? .07*Math.sin(time*5) : 0);
  ctx.save();
  ctx.strokeStyle=shades[which];
  ctx.lineWidth=Math.max(1.15,scale*.021);
  ctx.globalAlpha=.64;
  ctx.beginPath();
  ctx.ellipse(0,-scale*(which===2?.30:1.03),scale*halo*1.13,scale*halo*(which===2?.42:1.13),which===2?0:.12,0,TAU);
  ctx.stroke();
  ctx.globalAlpha=.14;
  ctx.lineWidth*=3.2;
  ctx.stroke();
  ctx.restore();
}

export function createSoftwareModels(canvas) {
  const cache=new Map();
  let parts=[],lightStamp="",generated=0,updates=0;
  const bodyMatrix=new Float32Array(16), wheelMatrix=new Float32Array(16);
  const buffers=new Map(DETAIL_SIZE.map(size=>[size,new Float32Array(size*size)]));

  function setVehicles(models) {
    parts=(models||[]).map(data=>({
      body:data.body.map(part=>catalogPart(part)).filter(Boolean),
      wheel:catalogPart(data.wheel), wheelOffsets:data.wheelOffsets,
    }));
    cache.clear();
  }

  function createView(model,pose,view,turn,spin,size) {
    const output=textureContext(canvas,size);
    if(!output)return null;
    const {target,context}=output;
    const image=context.createImageData(size,size);
    const zBuffer=buffers.get(size);
    zBuffer.fill(0);
    const targetBuffer={pixels:image.data,zBuffer};
    const distance=DEPTHS[pose.range];
    for(const part of model.body)rasterize(targetBuffer,part,IDENTITY,view,distance,size);
    if(model.wheel) {
      transform(bodyMatrix,0,0,0);
      for(const offset of model.wheelOffsets) {
        wheelTransform(wheelMatrix,bodyMatrix,offset,offset[2]>0?turn*.21:0,spin);
        rasterize(targetBuffer,model.wheel,wheelMatrix,view,distance,size);
      }
    }
    context.putImageData(image,0,0);
    generated++;
    return target;
  }

  function setWorld(environment) {
    const stamp=[...(environment?.sunDirection||[]),...(environment?.sun||[]),environment?.ambient].join(",");
    if(stamp!==lightStamp){cache.clear();lightStamp=stamp;}
  }

  function chooseNearby(pose,id,tier,turn) {
    let nearest=null;
    let error=Infinity;
    for(const [key,view] of cache) {
      if(view.id!==id)continue;
      const azimuth=Math.abs(pose.az-view.pose.az);
      const angle=Math.min(azimuth,AZIMUTH-azimuth);
      const rise=Math.abs(pose.el-view.pose.el);
      const proximity=Math.abs(pose.range-view.pose.range);
      const deviation=angle+rise*.7+proximity*.4+Math.abs(view.turn-turn)*.25+Math.abs(view.tier-tier)*.53;
      if(deviation>=error||angle>5||rise>3)continue;
      error=deviation;
      nearest={key,view};
    }
    return nearest;
  }

  function remember(key,value) {
    if(cache.has(key))cache.delete(key);
    else if(cache.size>=MAX_CACHE)cache.delete(cache.keys().next().value);
    cache.set(key,value);
    return value;
  }

  function draw(ctx,vehicle,camera,scale,environment,time,reduced) {
    const id=(vehicle.model??vehicle.id)%parts.length;
    const model=parts[id]||parts[0];
    if(!model)return false;
    const pose=cameraPose(vehicle,camera);
    const view=lighting(environment,pose.az,pose.el);
    const portrait=vehicle.id===0&&!vehicle.ghost;
    const tier=portrait&&camera.shot==="lobby"?0:portrait&&(camera.shot==="hero"||scale>=83)?1:scale>=31?2:scale>=13?3:4;
    const turn=portrait&&tier<=2?Math.round(clamp(vehicle.steer||0,-1,1)*2):0;
    // Most steering moves remain in one angular slot. Close slow cinematics
    // can also show a distinct wheel position without taxing the race loop.
    const rotation=pose.distance<5.3 && !reduced ? 1.1 : .19;
    const key=[id,tier,pose.az,pose.el,pose.range,turn,rotation].join(":");
    let selected=cache.get(key);
    if(selected) remember(key,selected);
    else {
      const nearby=updates>=BUDGET&&tier>1 ? chooseNearby(pose,id,tier,turn) : null;
      if(nearby)selected=remember(nearby.key,nearby.view);
      else {
        const size=updates>=BUDGET&&tier>1 ? DETAIL_SIZE.at(-1) : DETAIL_SIZE[tier];
        const image=createView(model,pose,view,turn,rotation,size);
        if(!image)return false;
        updates++;
        selected=remember(key,{image,id,tier,turn,pose});
      }
    }
    stretchFade(ctx,selected.image,Math.min(scale,200));
    overlayPower(ctx,vehicle,scale,time,reduced);
    return true;
  }

  return {
    setVehicles,setWorld,draw,
    beginFrame(){updates=0;},
    dispose(){cache.clear();parts=[];},
    get generated(){return generated;},
    get cached(){return cache.size;},
  };
}
