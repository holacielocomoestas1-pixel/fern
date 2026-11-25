import { viewFor } from "./render-math.mjs";
import { inBridge, roadPoint, warningMarks } from "./world-track.mjs";
import { blendHex, forVisibleFixtures } from "./world.mjs";
import { fixtures, transformFace } from "./world-fixtures.mjs";
import { createSoftwareModels } from "./software-model.mjs";
import { createSoftwareScenery } from "./software-scenery.mjs";
import { createSurfaceLight, puddle, lightShafts, filmWeather } from "./software-light.mjs";

const TAU = Math.PI * 2;
const NEAR = .30;
const signAlphabet = {
  A:[6,9,9,15,9,9], B:[14,9,14,9,9,14], D:[14,9,9,9,9,14], E:[15,8,14,8,8,15], F:[15,8,14,8,8,8], C:[7,8,8,8,8,7],
  G:[7,8,11,9,9,7], H:[9,9,15,9,9,9], I:[7,2,2,2,2,7], L:[8,8,8,8,8,15],
  M:[9,15,15,9,9,9], N:[9,13,13,11,11,9], O:[6,9,9,9,9,6], R:[14,9,14,10,9,9],
  S:[7,8,6,1,1,14], P:[14,9,9,14,8,8], Q:[6,9,9,9,11,7], U:[9,9,9,9,9,6], Y:[9,9,6,6,6,6], T:[15,2,2,2,2,2], V:[9,9,9,9,6,6], W:[9,9,9,15,15,9],
};
const themes = {
  moss: {
    grass: "#56834e", land: "#2b6657", hill: "#406e58", peak: "#699289",
    road: "#445b53", roadLight: "#526e62", curb: "#e9deb0", stripe: "#60b7a7",
    wood: "#7a5c48", metal: "#548478", glow: "#ffe19e", water: "#63bcad",
    bark: "#584531", leaves: "#374f44", light: "#79875d", rock: "#68746b",
  },
  lantern: {
    grass: "#564365", land: "#3b3858", hill: "#59466f", peak: "#976d88",
    road: "#45465b", roadLight: "#585369", curb: "#edd095", stripe: "#ad718d",
    wood: "#665576", metal: "#a57991", glow: "#ffca7f", water: "#726fa4",
    bark: "#523e65", leaves: "#754e82", light: "#bf86aa", rock: "#7e6d96",
  },
  river: {
    grass: "#88a66e", land: "#81ac85", hill: "#79a69d", peak: "#aac8b2",
    road: "#526875", roadLight: "#627a82", curb: "#ece6cb", stripe: "#529f96",
    wood: "#a38162", metal: "#70a6a3", glow: "#ffdf9b", water: "#3eacae",
    bark: "#907356", leaves: "#278975", light: "#7dc392", rock: "#b0ae94",
  },
};

const limit = (value, low, high) => Math.min(high, Math.max(low, value));
const mix = (a, b, n) => a + (b - a) * n;

function rgb(hex) {
  const number = Number.parseInt(hex.slice(1), 16);
  return [number >> 16, (number >> 8) & 255, number & 255];
}

function color(parts) {
  return `rgb(${parts.map(n => limit(Math.round(n), 0, 255)).join(",")})`;
}

function colorTable(theme, env) {
  const fog = env.fog.map(n => n * 255);
  const entries = Object.entries(theme).map(([key, value]) => {
    const base = rgb(value);
    const row = Array.from({ length: 15 }, (_, i) =>
      color(base.map((channel, index) => mix(channel, fog[index], Math.pow(i / 14, 1.18) * .84))));
    return [key, row];
  });
  entries.push(["cream", entries.find(row => row[0] === "curb")[1]]);
  return Object.fromEntries(entries);
}

function seed(value) {
  let state = (value || 1) >>> 0;
  return () => {
    state ^= state << 13;
    state ^= state >>> 17;
    state ^= state << 5;
    return (state >>> 0) / 4_294_967_296;
  };
}

function projection(camera, w, h) {
  const { forward, right, up, tanHalf } = viewFor(camera, w / h, NEAR, 320);
  const eye = [camera.x, camera.y, camera.z];
  const f = h / (2 * tanHalf);
  const cx = w / 2;
  const cy = h / 2;
  function vector(point) {
    const vx = point[0] - eye[0];
    const vy = point[1] - eye[1];
    const vz = point[2] - eye[2];
    return [
      vx * right[0] + vy * right[1] + vz * right[2],
      vx * up[0] + vy * up[1] + vz * up[2],
      vx * forward[0] + vy * forward[1] + vz * forward[2],
    ];
  }
  function plane(point) {
    return [cx + point[0] * f / point[2], cy - point[1] * f / point[2]];
  }
  return { vector, plane, f, forward, right, eye };
}

function nearClip(points) {
  if (points.every(point => point[2] >= NEAR)) return points;
  const result = [];
  for (let i = 0; i < points.length; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const aOK = a[2] >= NEAR;
    const bOK = b[2] >= NEAR;
    if (aOK) result.push(a);
    if (aOK !== bOK) {
      const t = (NEAR - a[2]) / (b[2] - a[2]);
      result.push([mix(a[0], b[0], t), mix(a[1], b[1], t), NEAR]);
    }
  }
  return result;
}

function polygon(ctx, points, paint) {
  if (points.length < 3) return;
  ctx.fillStyle = paint;
  ctx.beginPath();
  ctx.moveTo(points[0][0], points[0][1]);
  for (let j = 1; j < points.length; j++) ctx.lineTo(points[j][0], points[j][1]);
  ctx.closePath();
  ctx.fill();
}

function scaledShape(ctx, x, y, unit, points, paint) {
  polygon(ctx, points.map(p => [x + p[0] * unit, y + p[1] * unit]), paint);
}

function ribbon(course, s, end, a, b, lift = 0) {
  return [roadPoint(course, s, a, lift), roadPoint(course, end, a, lift),
    roadPoint(course, end, b, lift), roadPoint(course, s, b, lift)];
}

function transposer(course, s) {
  const f = course.frame(s);
  return (x,y,z) => [
    f.x + f.rx * x + f.dx * z,
    f.y + y + Math.tan(f.bank) * x + f.dy * z,
    f.z + f.rz * x + f.dz * z,
  ];
}

function block(group, at, x, y, z, w, h, l, paints) {
  const a = w / 2;
  const c = l / 2;
  const p = (sx, sy, sz) => at(x + a * sx, y + h * sy, z + c * sz);
  const [A, B, C, D, E, F, G, H] = [p(-1,0,-1),p(1,0,-1),p(1,1,-1),p(-1,1,-1),p(-1,0,1),p(1,0,1),p(1,1,1),p(-1,1,1)];
  for (const [points, index] of [[[A,B,C,D],0],[[E,H,G,F],0],[[A,D,H,E],1],[[B,F,G,C],1],[[D,C,G,H],2]]) {
    group.push({ points, paint: paints[index] || paints[0] });
  }
}

function gateMeshes(course, extra, letter) {
  const output = [];
  const s = extra || 9.5;
  const w = course.halfWidth + .9;
  const at = transposer(course, s);
  const startHeight = course.id === "lantern" ? 7.65 : 7.0;
  const taller = !!letter;
  const h = startHeight + (taller ? .65 : -.15);
  for (const side of [-1, 1]) {
    block(output, at, side * w, -.7, 0, 2.62, 1.16, 1.88, ["rock", "land", "metal"]);
    block(output, at, side * w, .4, 0, 1.03, h, 1.07, ["wood", "hill", "metal"]);
    block(output, at, side * w, h - .41, 0, 1.53, .52, 1.42, ["metal", "rock", "curb"]);
    block(output, at, side * w - side * .38, 1.45, -.60, .085, h - 2.2, .17, ["glow"]);
    if (course.id === "lantern") {
      for (let layer = 0; layer < 3; layer++) {
        const x = side * (w + layer * .11);
        const y = h + layer * .64;
        const roof = 1.46 - layer * .29;
        output.push({ points: [at(x - roof,y,-1), at(x,y+.94,-.16), at(x + roof,y,-1)], paint: "metal" });
        output.push({ points: [at(x - roof,y,1), at(x,y+.94,.16), at(x + roof,y,1)], paint: "wood" });
      }
    } else {
      output.push({
        points: [at(side * w, h+.31,-.5), at(side * (w+2.63),h+2.05,-.5),
          at(side * (w+.95), h+.5,-.5), at(side * (w-.26),h+.26,-.5)],
        paint: "metal",
      });
    }
  }
  const barHeight = taller ? 1.11 : .42;
  block(output, at, 0, h -.96, 0, w * 2.09, barHeight, .81, ["wood","metal","rock"]);
  block(output, at, 0, h -.98, -.496, w * 2.05, .105, .095, ["glow"]);
  const label = letter && {
    center: at(0,h-.43,-.51), a: at(-w*.75,h-.43,-.52), b: at(w*.75,h-.43,-.52),
    text: course.name.en.toUpperCase(),
  };
  return { output, label };
}

function makeCourseArt(course, world) {
  const random = seed(course.seed ^ 0x773d92);
  const tiles = [];
  const surface = [];
  const props = [];
  const signs = [];
  const gates = [], labels = [];
  const width = course.halfWidth;
  const count = Math.ceil(course.length / 3.5);
  const step = course.length / count;
  for (let i = 0; i < count; i++) {
    const s = i * step;
    const end = (i+1) * step;
    const center = roadPoint(course, s + step/2, 0);
    const bridge = inBridge(course, s);
    const faces = [];
    const push = (a,b,y,paint) => faces.push({ points: ribbon(course, s, end, a,b,y), paint });
    for (const side of [-1,1]) {
      const curbStart = side * (width - .22);
      const curbEnd = side * (width + .12);
      const sideWidth = bridge ? .86 : 2.14;
      const outer = side * (width + sideWidth);
      const near = (a,b,y,paint) => push(Math.min(a,b), Math.max(a,b), y, paint);
      near(curbEnd,outer,-.048,bridge ? "wood" : "grass");
      if (!bridge) {
        near(outer,side*(width+8.9),-.27,i%3 ? "land":"grass");
        near(side*(width+8.9),side*(width+26.5),-1.35,i%6 ? "land":"hill");
      }
      near(curbStart,curbEnd,.033,i%7 < 3 ? "stripe" : "curb");
      if (bridge) {
        near(outer - .12,outer + .12,.69,"metal");
        if (i%2 === 0) props.push({ type:"post", center:roadPoint(course,s,outer,.07), size:1.04 });
      }
    }
    push(-width+.13,width-.13,0,bridge ? i%2 ? "wood":"rock" : "road");
    if (!bridge) {
      faces.at(-1).asphalt = true;
      const wear = i%9 === 0 ? "rubberDark" : "rubber";
      const left = -width * .48 + Math.sin(s * .12) * .12;
      const right = width * .42 + Math.cos(s * .14) * .19;
      const strip = (offset, spread, paint) => ({
        points:ribbon(course, s, end, offset-spread, offset+spread, .025), paint,
      });
      const details = [];
      if(i%8>=2)details.push(strip(left, .026+random()*.022, wear));
      if(i%9>=3)details.push(strip(right, .041+random()*.021, wear));
      if (i%4 === 0) details.push(strip(0, .064, "roadDash"));
      surface.push({ center, faces:details });
      if (i%4 === 2 && world.environment.wetness > .23) {
        const d = s + step * .11;
        const lane = (random() - .5) * width * 1.44;
        const length = step * (.49 + random() * .56);
        const half = .28 + random() * .65;
        const q = (z,x) => roadPoint(course,d + length*z,lane + half*x,.026);
        const edge = [[0,-.33],[.24,-.98],[.57,-.89],[.89,-.61],[1,.11],[.69,.74],[.37,.93],[.06,.54]];
        surface.push({ center, faces:[{ points:edge.map(([z,x])=>q(z,x)), puddle:true }] });
      }
    }
    if (s < 1.15 || s > course.length-step*1.3) {
      for (let square = 0; square < 12; square++) {
        const from = -width + square*(width/6);
        faces.push({
          points:ribbon(course,s+.15,s+.76,from,from+width/6,.051),
          paint:(square+i)%2 ? "curb":"stripe",
        });
      }
    }
    tiles.push({ center, faces });
  }

  let lastTurn = -30;
  for (let s = 22; s < course.length - 22; s += 4) {
    const before = course.frame(s), after = course.frame(s + 9);
    const delta = Math.atan2(before.dz*after.dx - before.dx*after.dz, before.dx*after.dx + before.dz*after.dz);
    if (Math.abs(delta) > .145 && s - lastTurn > 30) {
      const direction = Math.sign(delta);
      signs.push({ type:"turn",center:roadPoint(course,s,-direction*(width+1.12),0),size:1.83,direction });
      lastTurn=s;
    }
    if (course.theme === "lantern" && Math.round(s/4)%8===0 && !inBridge(course,s)) {
      for (const side of [-1,1]) props.push({type:"lantern",center:roadPoint(course,s,side*(width+2),.03),size:2.5,wobble:random()});
    }
  }
  for (const at of [9.5, ...(course.sectors || []).slice(1).map(sector=>sector.fraction*course.length)]) {
    const gate=gateMeshes(course,at,true);
    gates.push(...gate.output);
    labels.push(gate.label);
  }
  props.push(...world.props);
  const pads = course.pads.map((pad, n) => {
    const a = pad.s - pad.halfLength;
    const b = pad.s + pad.halfLength;
    const l = pad.offset - pad.halfWidth;
    const r = pad.offset + pad.halfWidth;
    const faces = [{ points:ribbon(course,a,b,l,r,.045),paint:"metal" }];
    const span = pad.halfWidth*.73;
    for(let z=a+.4;z<b-.88;z+=1.32) {
      const q=(s,x)=> roadPoint(course,s,pad.offset+x,.066);
      const points=[q(z,-span),q(z+.27,-span),q(z+.86,0),q(z+.27,span),q(z,span),q(z+.54,0)];
      faces.push({ points, paint:"glow" });
    }
    return { center:roadPoint(course,pad.s,pad.offset), faces };
  });
  const warnings = warningMarks(course).map(({points,lit,where,sweeping})=>({
    center:roadPoint(course,where,0),
    faces:[{points,custom:lit ? sweeping?"#f5bc60":"#c9a669" : "#3b4242"}],
  }));
  const structures = world.marks.map(mark => ({
    center:[mark.x,mark.y+3,mark.z],
    faces:mark.faces.map(face=>({points:transformFace(face.points,mark.x,mark.y,mark.z,mark.yaw),custom:"#"+face.paint})),
  }));
  return { tiles, surface, props, pads, gates, signs, labels, structures, warnings };
}

function drawSkies(ctx, width, height, camera, project, env, variant, time, scenery, calm) {
  const h = limit(height / 2 + project.f*project.forward[1]/Math.max(.22,Math.hypot(project.forward[0],project.forward[2])), -height*.7, height*1.7);
  const yaw = Math.atan2(project.forward[0],project.forward[2]);
  const gradient=ctx.createLinearGradient(0,0,0,Math.max(1,limit(h+height*.24,1,height)));
  gradient.addColorStop(0,color(env.skyTop.map(n=>n*255)));
  gradient.addColorStop(1,color(env.skyBottom.map(n=>n*255)));
  ctx.fillStyle=gradient;
  ctx.fillRect(0,0,width,height);
  const sun = project.vector([camera.x+env.sunDirection[0]*140,camera.y+ env.sunDirection[1]*140,camera.z+env.sunDirection[2]*140]);
  if (sun[2] > 8) {
    const [x,y] = project.plane(sun);
    const radius=height*(variant === "lantern" ? .15 : .31);
    const halo=ctx.createRadialGradient(x,y,1,x,y,radius);
    halo.addColorStop(0,variant==="lantern"?"rgba(255,218,176,.86)":"rgba(255,249,207,.92)");
    halo.addColorStop(.25,variant==="lantern"?"rgba(255,160,120,.24)":"rgba(255,231,177,.35)");
    halo.addColorStop(1,"rgba(255,227,187,0)");
    ctx.fillStyle=halo;
    ctx.fillRect(0,0,width,height);
    ctx.fillStyle=variant==="lantern"?"#ffe8cb":"#fff6d6";
    ctx.beginPath();
    ctx.arc(x,y,height*(variant==="lantern"?.025:.045),0,TAU);
    ctx.fill();
  }
  scenery.drawAtmosphere(ctx,width,height,h,project.f,yaw,env,variant,calm?0:time);
  const floorTop=limit(h+height*.28,0,height-1);
  const floor=ctx.createLinearGradient(0,floorTop,0,height);
  floor.addColorStop(0,"transparent");
  floor.addColorStop(1,variant==="river"?"rgba(61,173,165,.49)":"rgba(20,46,36,.34)");
  ctx.fillStyle=floor;
  ctx.fillRect(0,floorTop,width,height-floorTop);
  if (variant==="river") {
    ctx.lineCap="round";
    for (let i=0;i<18;i++){
      const x=(((i*.618 - yaw*.41) % 1)+1)%1*width;
      const y=h+height*(.21 + (i%6)*.112 + Math.sin(i*6.25+time*.55)*.009);
      if(y<0||y>=height)continue;
      ctx.lineWidth=height*.002;
      ctx.strokeStyle="rgba(220,251,224,.23)";
      ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+width*(.018+(i%3)*.027),y);ctx.stroke();
    }
    ctx.lineCap="butt";
  }
}

function prop(ctx, item, xy, scale, tone, alpha, scenery, course, solidTone) {
  const [x,y]=xy;
  const size=item.size*scale;
  const { type }=item;
  if (scenery.drawProp(ctx,item,x,y,scale,solidTone,alpha,course.id)) return;
  const draw=(points,paint)=>scaledShape(ctx,x,y,size,points,tone(paint));
  if (type==="pine") {
    draw([[-.07,0],[.076,0],[.052,-.72],[-.038,-.72]], "bark");
    for (let n=0;n<4;n++) {
      const start=-.18-n*.155;
      const span=.35-n*.064;
      const top=start-.37+n*.024;
      draw([[-span,start],[0,top],[span,start],[.11,start+.052],[-.13,start+.041]],"leaves");
      draw([[0,top],[-.022,start+.038],[span,start],[.13,start-.13]],item.bright?"light":"hill");
    }
  } else if (type==="palm") {
    const bend=(item.wobble-.5)*.4;
    draw([[-.055,0],[.054,0],[bend+.035,-.98],[bend-.036,-.98],[-.019,-.7]],"bark");
    for (let i=0;i<6;i++) {
      const angle=i*TAU/6;
      const vx=Math.cos(angle), vy=Math.sin(angle);
      draw([[bend,-.97],[bend+vx*.29,-1.19+vy*.11],[bend+vx*.60,-1.09+vy*.20],
        [bend+vx*.56,-.96+vy*.23],[bend+vx*.26,-1.06+vy*.10]],i%2===0?"light":"leaves");
    }
  } else if (type==="blossom") {
    draw([[-.064,0],[.077,0],[.06,-.65],[-.045,-.64]],"bark");
    draw([[-.09,-.38],[-.35,-.66],[-.42,-.84],[-.19,-1.01],[.04,-1.14],[.35,-1.02],[.39,-.79],[.23,-.56]],"leaves");
    draw([[-.27,-.82],[-.16,-1.02],[.04,-1.11],[.32,-.96],[.27,-.78],[.06,-.69]],"light");
    draw([[-.17,-.46],[-.20,-.66],[.02,-.81],[.24,-.68],[.13,-.47]],"hill");
  } else if(type==="stack" || type==="rock" || type==="crag") {
    draw([[-.43,0],[-.38,-.57],[-.21,-.89],[.14,-1],[.39,-.77],[.45,0]],"rock");
    draw([[-.43,0],[-.37,-.56],[-.22,-.86],[.04,-.77],[-.046,0]],"metal");
    draw([[-.22,-.87],[.14,-1],[.4,-.77],[.04,-.73]],item.bright?"grass":"light");
  } else if(type==="lantern" || type==="post") {
    draw([[-.041,0],[.041,0],[.029,-.86],[-.028,-.86]],"bark");
    if (type==="lantern") {
      if (size>10 && alpha<10) {
        const glow=ctx.createRadialGradient(x,y-size*.81,0,x,y-size*.81,size*.46);
        glow.addColorStop(0,"rgba(255,221,152,.49)"); glow.addColorStop(1,"rgba(255,174,104,0)");
        ctx.fillStyle=glow; ctx.fillRect(x-size*.47,y-size*1.31,size*.94,size*.94);
      }
      draw([[-.115,-.68],[-.119,-.83],[.114,-.83],[.115,-.68]],"glow");
      draw([[-.155,-.83],[0,-1.03],[.16,-.83]],"metal");
      draw([[-.147,-.68],[.147,-.68],[.13,-.65],[-.13,-.65]],"wood");
    } else {
      draw([[-.052,-.84],[.056,-.84],[.07,-.78],[-.07,-.78]],"curb");
    }
  } else if (type==="turn") {
    draw([[-.045,0],[.045,0],[.04,-.88],[-.04,-.88]],"rock");
    draw([[-.64,-.51],[.64,-.51],[.64,-1],[-.64,-1]],"wood");
    const d=item.direction;
    for (const offset of [-.25,.25]){
      const points=[[offset-.2,-.63],[offset-.04,-.63],[offset+.16,-.756],[offset-.04,-.88],[offset-.2,-.88],[offset+.035,-.756]];
      draw(points.map(([i,j])=>[i*d,j]),"glow");
    }
  }
}

function drawGem(ctx, point, scale, time, index, special) {
  const [x,y]=point;
  const r=.37*scale;
  if (r<1.6) return;
  const xx = Math.max(.40,Math.abs(Math.cos(time*2+index*1.7)));
  const tx=x+r*xx;
  const lx=x-r*xx;
  ctx.fillStyle=special?"rgba(249,179,98,.29)":"rgba(144,255,190,.25)";
  ctx.beginPath();
  ctx.ellipse(x,y,r*1.41,r*1.55,0,0,TAU); ctx.fill();
  polygon(ctx,[[x,y-r],[tx,y],[x,y+r],[lx,y]],special?"#ffe091":"#c5ffe4");
  polygon(ctx,[[x,y-r],[tx,y],[x,y+r],[x+r*.12,y]],special?"#ffae73":"#68dfa2");
  polygon(ctx,[[x,y-r],[x+r*.12,y],[lx,y]],"#fff7df");
}

function drawKart(ctx, point, scale, vehicle, camera, models, surroundings, time, reducedMotion, view, light) {
  const [x,y]=point;
  const roadHeight=Number.isFinite(vehicle.roadY)?vehicle.roadY:vehicle.y;
  const foot=view.vector([vehicle.x,roadHeight+.018,vehicle.z]);
  const shadow=foot[2]>.3?view.plane(foot):point;
  ctx.save();
  if (vehicle.ghost) ctx.globalAlpha=.49+Math.sin(time*2)*.09;
  const wet=surroundings.wetness||0;
  light.contactShade(ctx,...shadow,scale,camera.roll||0,vehicle.airborne,vehicle.ghost ? .55 : 1);
  if(!vehicle.ghost&&scale>44&&!vehicle.airborne&&camera.shot!=="chase"){
    const yaw=vehicle.yaw||0, sin=Math.sin(yaw),cos=Math.cos(yaw);
    for(const front of [-1.09,1.13]) for(const side of [-.92,.92]){
      const tire=view.vector([vehicle.x+sin*front+cos*side,roadHeight+.015,vehicle.z+cos*front-sin*side]);
      if(tire[2]>.5) light.contactShade(ctx,...view.plane(tire),scale*.39,camera.roll||0,0,.69);
    }
  }
  if (!reducedMotion && (vehicle.boost || vehicle.drift || vehicle.offroad)) {
    const heated=vehicle.boost>0;
    for(let i=0;i<(heated?13:9);i++) {
      const t=((time*(heated?3.5:2.9)+i*.38)%1+1)%1;
      const side=i%2===0?-1:1;
      const yy=y + t*scale*.66;
      const xx=x + side*(.68+t*.49)*scale;
      ctx.globalAlpha=(1-t)*(heated?.83:.58);
      ctx.fillStyle=heated?(i%3?"#a9f8ea":"#fff3ab"):vehicle.drift?(i%3?"#ffc787":"#fff0b0"):"#b4a489";
      ctx.beginPath();ctx.ellipse(xx,yy,Math.max(1.0,scale*.074*(1-t)),Math.max(1,scale*.125*(1-t)),side*.38,0,TAU);ctx.fill();
    }
    ctx.globalAlpha=1;
  }
  ctx.translate(x,y);
  ctx.rotate((vehicle.roll||0)*.40-(camera.roll||0));
  const rendered=models.draw(ctx,vehicle,camera,scale,surroundings,time,reducedMotion,
    !vehicle.ghost&&scale>15&&wet>.20&&Math.abs(vehicle.airborne||0)<.25 ? wet : 0);
  ctx.restore();
  return rendered;
}

function paintedSign(ctx, label, width, height) {
  const size = Math.min(height / 6, width / (label.length * 5));
  const left = -size * label.length * 2.5;
  for (let i=0;i<label.length;i++) {
    const rows = signAlphabet[label[i]];
    if (!rows) continue;
    for (let y=0;y<rows.length;y++) {
      for (let x=0;x<4;x++) {
        if (rows[y] & (8 >> x)) ctx.fillRect(left+(i*5+x)*size,(y-3)*size,size*.95,size*.96);
      }
    }
  }
}

export function createSoftwareRenderer(canvas, { quality = "auto", reducedMotion = false } = {}) {
  const ctx = canvas.getContext("2d",{alpha:false});
  if(!ctx) throw new Error("Canvas graphics are unavailable.");
  const models=createSoftwareModels(canvas);
  const scenery=createSoftwareScenery(canvas);
  const light=createSurfaceLight(canvas);
  const stats={width:canvas.width,height:canvas.height,drawCalls:0,triangles:0,frameMs:0,contextLost:false};
  let world, course, environment, art, scheme, shades, gone=false;

  function setWorld(next) {
    if (!next?.course) throw new Error("The software renderer needs the 3D circuit.");
    world=next;
    course=world.course;
    environment=world.environment;
    const base=themes[course.theme || course.id] || themes.moss;
    const ground=course.art?.ground || base.land;
    const verge=world.palette?.verge?.length===3 ? "#" + world.palette.verge.map(n=>Math.round(n*255).toString(16).padStart(2,"0")).join("") : base.grass;
    const wet=environment.wetness||0;
    const road=blendHex(course.art?.road || base.road,"#242b2e",.30+wet*.19);
    scheme={...base,land:blendHex(base.land,ground,.68),grass:blendHex(verge,ground,.45),
      hill:blendHex(base.hill,ground,.54),road,
      rubber:blendHex(road,"#22272b",.16),rubberDark:blendHex(road,"#111b1c",.29),
      roadDash:blendHex(road,"#e8e3bc",.39),roadLight:blendHex(road,"#b5b7af",.12),
      stripe:blendHex(base.stripe,course.art?.accent || base.stripe,.23)};
    shades = colorTable(scheme,environment);
    art=makeCourseArt(course,world);
    models.setWorld(environment);
    scenery.setWorld(course.id);
  }

  function resize(w,h,dpr=1) {
    if(!w||!h) return false;
    const budget=quality==="low"?680_000:1_380_000;
    const scale=Math.min(dpr,quality==="high"?1.7:1.42,Math.sqrt(budget/(w*h)));
    stats.width=Math.max(1,Math.round(w*scale));
    stats.height=Math.max(1,Math.round(h*scale));
    if(canvas.width!==stats.width)canvas.width=stats.width;
    if(canvas.height!==stats.height)canvas.height=stats.height;
    ctx.imageSmoothingEnabled=true;
    if ("imageSmoothingQuality" in ctx) ctx.imageSmoothingQuality="high";
    return true;
  }

  function setQuality(value) {
    quality=["auto","low","high"].includes(value) ? value : "auto";
    models.setQuality(quality);
  }

  function draw({camera,vehicles=[],time=0,boost=0,effects}={}) {
    if(gone||!art||!camera) return false;
    const started=performance.now();
    const w=canvas.width, h=canvas.height;
    if(!w||!h) return false;
    const view=projection(camera,w,h);
    const focal = view.f;
    const sheets=[];
    const asphalt=[];
    const low=quality==="low";
    const calm=reducedMotion || effects?.calm;
    stats.drawCalls=0;
    stats.triangles=0;
    models.beginFrame();
    drawSkies(ctx,w,h,camera,view,environment,course.id,time,scenery,calm);
    const enqueue=(center,type,data,radius)=>{
      const far=type===7?Math.min(environment.fogFar,low?62:104):environment.fogFar;
      const reach=far+radius+8;
      if((center[0]-camera.x)**2+(center[2]-camera.z)**2>reach*reach)return;
      const p=view.vector(center);
      if(p[2]<-radius||p[2]>far+radius)return;
      if(Math.abs(p[0])>p[2]*w/(2*focal)+radius||Math.abs(p[1])>p[2]*h/(2*focal)+radius)return;
      sheets.push({ depth:p[2],p,type,data });
    };
    for(const tile of art.tiles)enqueue(tile.center,0,tile.faces,16);
    for(const detail of art.surface)enqueue(detail.center,7,detail.faces,course.halfWidth+2);
    for(const pad of art.pads)enqueue(pad.center,6,pad.faces,6);
    for(const warning of art.warnings)enqueue(warning.center,6,warning.faces,course.halfWidth+3);
    for(const face of art.gates) {
      const middle=face.points.reduce((all,p)=>[all[0]+p[0],all[1]+p[1],all[2]+p[2]],[0,0,0]).map(v=>v/face.points.length);
      enqueue(middle,0,[face],10);
    }
    for(const item of art.props)enqueue(item.center,1,item,item.size*1.2);
    for(const item of art.signs)enqueue(item.center,1,item,item.size);
    for(const label of art.labels)enqueue(label.center,2,label,9);
    for(const mark of art.structures)enqueue(mark.center,5,mark.faces,22);
    forVisibleFixtures(world,camera,time,effects,(kind,center,yaw,w,h,l)=>{
      const faces=fixtures[kind].map(face=>({points:transformFace(face.points,...center,yaw,w,h,l),custom:"#"+face.paint}));
      enqueue(center,5,faces,Math.max(6,l+2));
    });
    for(const [i,item] of course.pickups.entries()) {
      const flag=effects?.pickups?.[item.id??i];
      if(flag===false||flag?.active===false)continue;
      const height=1.20+(reducedMotion?0:.16*Math.sin(time*2.42+i));
      enqueue(roadPoint(course,item.s,item.offset,height),3,{index:i,special:item.special},1.35);
    }
    for(const vehicle of vehicles) {
      if(camera.hidePlayer&&vehicle.id===0&&!vehicle.ghost) continue;
      enqueue([vehicle.x,vehicle.y,vehicle.z],4,vehicle,2.6);
    }
    const pass = type => type === 0 ? 0 : type === 7 ? 1 : type === 6 ? 2 : 3;
    sheets.sort((a,b)=>pass(a.type)-pass(b.type) || b.depth-a.depth || a.type-b.type);
    let surfacePainted=false;
    for(const {depth,p,type,data} of sheets){
      if(type!==0&&!surfacePainted) {
        const horizon=h*.5+focal*view.forward[1]/Math.max(.22,Math.hypot(view.forward[0],view.forward[2]));
        light.roadway(ctx,asphalt,w,h,horizon,environment,camera.trackDistance,low);
        surfacePainted=true;
      }
      const fog=limit(Math.floor(Math.max(0,depth-22)/(environment.fogFar-28)*14),0,14);
      const tone=name=>shades[name][fog];
      if (type===0 || type===5 || type===6 || type===7){
        const faces=type===5 ? data.map(face=>{
          const vectors=face.points.map(view.vector);
          return {face,vectors,depth:vectors.reduce((n,v)=>n+v[2],0)/vectors.length};
        }).sort((a,b)=>b.depth-a.depth) : data.map(face=>({face,vectors:face.points.map(view.vector)}));
        for(const {face,vectors} of faces) {
          const clipped=nearClip(vectors);
          if(clipped.length<3) continue;
          const points=clipped.map(view.plane);
          if(points.every(v=>v[0]<-1)||points.every(v=>v[0]>w+1)||points.every(v=>v[1]<-1)||points.every(v=>v[1]>h+1))continue;
          if(face.asphalt)asphalt.push(points);
          if(face.puddle){
            if(!low)puddle(ctx,points,environment,fog);
          } else polygon(ctx,points,face.custom ? blendHex(face.custom,scheme.peak,fog*.036) : tone(face.paint));
          stats.drawCalls++;
          stats.triangles+=points.length-2;
        }
        continue;
      }
      if (p[2]<.5)continue;
      const point=view.plane(p);
      const scale=focal/p[2];
      if(type===1) {
        if(data.size*scale<3)continue;
        prop(ctx,data,point,scale,tone,fog,scenery,course,(name,band)=>shades[name][band]);
      } else if(type===2){
        const a=view.vector(data.a), b=view.vector(data.b);
        if(a[2]<1 || b[2]<1 || view.forward[1]>.35)continue;
        const x=view.plane(a), y=view.plane(b);
        if(y[0]<x[0])continue;
        const maxWidth=Math.hypot(y[0]-x[0],y[1]-x[1]);
        if(maxWidth<20)continue;
        ctx.save();
        ctx.translate(...point);
        ctx.rotate(Math.atan2(y[1]-x[1],y[0]-x[0]));
        ctx.fillStyle=tone("curb");
        paintedSign(ctx,data.text,maxWidth,Math.max(6,scale*.65));
        ctx.restore();
      } else if(type===3) drawGem(ctx,point,scale,time,data.index,data.special);
      else drawKart(ctx,point,scale,data,camera,models,environment,time,calm,view,light);
      stats.drawCalls++;
    }
    if (!calm && boost>.1) {
      ctx.strokeStyle="rgba(226,255,222,.55)";
      ctx.lineWidth=Math.max(1.1,h*.0018);
      for(let i=0;i<23;i++){
        const jitter=((time*2.9+i*.713)%1+1)%1;
        const a=i*TAU/23 + .16;
        const x=Math.cos(a)*w*.56, y=Math.sin(a)*h*.61;
        const dx=w/2,dy=h*.49;
        const inner=.72+jitter*.24;
        ctx.globalAlpha=(1-jitter)*boost*.63;
        ctx.beginPath();ctx.moveTo(dx+x*inner,dy+y*inner);ctx.lineTo(dx+x*(inner+.16),dy+y*(inner+.16));ctx.stroke();
      }
      ctx.globalAlpha=1;
    }
    const sun=view.vector([camera.x+environment.sunDirection[0]*160,camera.y+environment.sunDirection[1]*160,camera.z+environment.sunDirection[2]*160]);
    if(!low && sun[2]>7) lightShafts(ctx,w,h,[...view.plane(sun),sun[2]],environment,course.theme);
    filmWeather(ctx,w,h,environment,time,vehicles[0]?.speed||0,calm,low);
    stats.frameMs=performance.now()-started;
    stats.generatedModelViews=models.generated;
    stats.cachedModelViews=models.cached;
    return true;
  }

  models.setQuality(quality);
  return { setWorld, setVehicles:models.setVehicles, setQuality, draw, resize, dispose(){ gone=true; art=null; scenery.dispose(); models.dispose(); }, stats };
}
