const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const css = (rgb, alpha) => `rgba(${rgb.map(v => Math.round(clamp(v * 255, 0, 255))).join(",")},${clamp(alpha, 0, 1)})`;
const fragment = n => n - Math.floor(n);
const rand = n => fragment(Math.sin(n * 13.917 + 4.753) * 43758.5453);

function trace(ctx, points) {
  ctx.moveTo(points[0][0], points[0][1]);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i][0], points[i][1]);
  ctx.closePath();
}

function canvasTile(canvas, size) {
  const tile = canvas.ownerDocument?.createElement?.("canvas") ??
    (typeof OffscreenCanvas === "undefined" ? null : new OffscreenCanvas(size, size));
  if (!tile) return null;
  tile.width = tile.height = size;
  return tile;
}

function stamp(canvas) {
  const size = 112;
  const tile = canvasTile(canvas, size);
  if (!tile) return null;
  const ink = tile.getContext("2d");
  if (!ink) return null;
  for (let i = 0; i < 1350; i++) {
    const x = rand(i * 2) * size, y = rand(i * 2 + 1) * size;
    const q = rand(i + 734);
    ink.fillStyle = q < .49 ? "rgba(8,14,16,.31)" : "rgba(215,219,187,.21)";
    ink.fillRect(x, y, q < .9 ? 1 : 2.25, q < .9 ? 1 : 1.5);
  }
  return tile;
}

export function createSurfaceLight(canvas) {
  let asphalt;
  let shadow;

  function roadway(ctx, road, w, h, horizon, env, meters, low) {
    if (!road.length) return;
    const wet = env.wetness || 0;
    ctx.save();
    ctx.beginPath();
    for (const face of road) {
      trace(ctx,face.map(([x,y])=>[clamp(x,-w,w*2),clamp(y,-h,h*2)]));
    }
    const top = clamp(horizon + h * .025, 0, h - 2);
    const wash = ctx.createLinearGradient(0, top, 0, h);
    const sun = env.sun || [1, .9, .74], sky = env.skyBottom || [.65, .66, .63];
    const reflected = sky.map((v, i) => v * .69 + sun[i] * .31);
    wash.addColorStop(0, css(reflected, .14 + wet * .36));
    wash.addColorStop(.36, css(reflected, .065 + wet * .19));
    wash.addColorStop(.68, css(reflected, .030 + wet * .044));
    wash.addColorStop(1, "rgba(3,11,16,.30)");
    ctx.fillStyle = wash;
    ctx.fill();
    if (!low) {
      if (asphalt === undefined) {
        const tile = stamp(canvas);
        asphalt = tile ? ctx.createPattern(tile, "repeat") : null;
      }
      if (asphalt) {
        ctx.globalAlpha = .33;
        ctx.fillStyle = asphalt;
        const shift = (meters || 0) * 3 % 112;
        if(shift)ctx.translate(0,shift);
        ctx.fill();
      }
    }
    ctx.restore();
  }

  function contactShade(ctx, x, y, scale, roll, airborne, opacity = 1) {
    if(shadow===undefined){
      shadow=canvasTile(canvas,64);
      const ink=shadow?.getContext("2d");
      if(ink){
        const shade=ink.createRadialGradient(32,32,1,32,32,32);
        shade.addColorStop(0,"rgba(4,13,17,.88)");
        shade.addColorStop(.52,"rgba(4,13,17,.45)");
        shade.addColorStop(1,"rgba(4,13,17,0)");
        ink.fillStyle=shade;ink.fillRect(0,0,64,64);
      }
    }
    const lift = Math.max(airborne || 0, 0);
    const wide=scale*(.96+lift*.13), deep=scale*(.41+lift*.11);
    ctx.save();
    ctx.translate(x,y);ctx.rotate(-roll);
    ctx.globalAlpha*=opacity/(1+lift*.75);
    if(shadow)ctx.drawImage(shadow,-wide,-deep,2*wide,2*deep);
    else {
      ctx.fillStyle="rgba(4,13,17,.50)";
      ctx.beginPath();ctx.ellipse(0,0,wide*.68,deep*.68,0,0,Math.PI*2);ctx.fill();
    }
    ctx.restore();
  }

  return { roadway, contactShade };
}

export function puddle(ctx, points, weather, fog) {
  if (points.length < 3 || fog > 10 || weather.wetness < .20) return;
  const yValues = points.map(p => p[1]);
  const min = Math.min(...yValues), max = Math.max(...yValues);
  if (max - min < .6) return;
  const tint = weather.skyBottom.map((v, i) => v * .62 + weather.fog[i] * .38);
  const opacity = weather.wetness * (1 - fog / 16);
  const glint = ctx.createLinearGradient(0, min, 0, max);
  glint.addColorStop(0, css(tint, opacity * .40));
  glint.addColorStop(.25, css(tint, opacity * .18));
  glint.addColorStop(.64, css(tint, opacity * .08));
  glint.addColorStop(1, css(tint, 0));
  ctx.fillStyle = glint;
  ctx.beginPath();
  trace(ctx, points);
  ctx.fill();
  if (max - min < 3.2) return;
  ctx.save();
  ctx.clip();
  ctx.strokeStyle = css(tint, opacity * .25);
  ctx.lineWidth = .8;
  ctx.beginPath();
  const a = points[0], b = points[Math.floor(points.length / 2)];
  const left = Math.min(a[0], b[0]), right = Math.max(a[0], b[0]);
  for (let i = 1; i < 5; i++) {
    const y = min + (max - min) * i / 6;
    ctx.moveTo(left - 4, y);
    ctx.lineTo(right + 4, y - 1.8);
  }
  ctx.stroke();
  ctx.restore();
}

export function lightShafts(ctx, w, h, sun, env, variant) {
  const damp = env.humidity ?? (variant === "moss" ? .55 : .2);
  if (sun[2] < 7 || damp < .15) return;
  const [x, y] = sun;
  if (x < -w * .4 || x > w * 1.4 || y > h * .63) return;
  const end = [clamp(w * .5 + (w * .5 - x) * .62, -w * .1, w * 1.1), h * .88];
  const reach = h * .68;
  const glow = ctx.createRadialGradient(x, y, 2, x, y, reach);
  glow.addColorStop(0, css(env.sun || [1, .9, .74], .105 + damp * .093));
  glow.addColorStop(.34, css(env.sun || [1, .9, .74], .065 + damp * .060));
  glow.addColorStop(1, css(env.sun || [1, .9, .74], 0));
  ctx.save();
  ctx.fillStyle = glow;
  ctx.beginPath();
  for (const [offset, width] of [[-.33,.035],[-.16,.014],[-.062,.021],[.042,.024],[.19,.025],[.29,.019]]) {
    const base = [end[0] + w * offset, end[1]];
    trace(ctx, [[x, y], [base[0] - w * width, base[1]], [base[0] + w * width, base[1]]]);
  }
  ctx.fill();
  ctx.restore();
}

export function filmWeather(ctx, w, h, env, time, speed, calm, low) {
  const weather = env.weather;
  if (calm || low || !["rain","snow","ash","mist"].includes(weather)) return;
  const rain = weather === "rain";
  const snow = weather === "snow";
  const ash = weather === "ash";
  ctx.save();
  ctx.lineWidth = Math.max(.6, w * .0012);
  const strength = .63 + clamp(speed / 78, 0, .44);
  const count = rain ? 44 : snow ? 33 : ash ? 27 : 19;
  for (let layer = 0; layer < 2; layer++) {
    ctx.beginPath();
    ctx.strokeStyle = rain ? (layer ? "rgba(217,240,235,.16)" : "rgba(217,240,235,.095)") :
      snow ? (layer ? "rgba(236,250,248,.37)" : "rgba(222,235,234,.21)") :
      ash ? (layer ? "rgba(248,155,92,.37)" : "rgba(241,167,104,.24)") : "rgba(244,216,168,.21)";
    const step = rain ? .69 : .083;
    for (let i = layer; i < count; i += 2) {
      const near = .4 + rand(i + 283) * .8;
      const x = fragment(rand(i + 28) + time * (rain ? .029 : -.023) * near) * w;
      const y = fragment(rand(i + 129) + time * step * near * strength) * h;
      const length = (rain ? h * .017 : h * .0016) * near * strength;
      ctx.moveTo(x, y);
      ctx.lineTo(x - length * (rain ? .37 : .53), y + length);
    }
    ctx.stroke();
  }
  ctx.restore();
}

