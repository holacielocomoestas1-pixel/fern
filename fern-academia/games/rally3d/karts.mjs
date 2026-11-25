import { Mesh, bevel, egg, latheWheel, lerpColor, rgb, ring, shell, tint, tube } from "./kart-mesh.mjs";

const C = Object.fromEntries(Object.entries({
  ink: "192728", rubber: "263231", seat: "4b3633", metal: "a6b7ae",
  lamp: "fff3bb", tail: "ff755c", linen: "fff1d5", linenShade: "cfae82",
  tan: "d9a269", amber: "d17838", darkFur: "6a452e", eyes: "33201c", shine: "fff9e5",
}).map(([name, value]) => [name, rgb(value)]));

const roster = [
  { name: { en: "Fern", th: "เฟิร์น" }, color: "1e604e", trim: "c1a27d", accent: "e2ba77", fur: "d9a269", type: "bear" },
  { name: { en: "Pip", th: "พิพ" }, color: "84528f", trim: "c4a0b4", accent: "ecc6a1", fur: "f0d9e0", type: "hare" },
  { name: { en: "Ember", th: "เอมเบอร์" }, color: "9d3f30", trim: "d29a62", accent: "f4d5a3", fur: "db7946", type: "fox" },
  { name: { en: "Skye", th: "สกาย" }, color: "315e81", trim: "91b8c8", accent: "eec485", fur: "70aade", type: "bird" },
  { name: { en: "Thistle", th: "ธิสเซิล" }, color: "9d722d", trim: "d6b679", accent: "dce68d", fur: "bc8763", type: "hedgehog" },
  { name: { en: "Juniper", th: "จูนิเปอร์" }, color: "585180", trim: "a599c5", accent: "b5d6b8", fur: "a7a4ab", type: "raccoon" },
];

export const DRIVERS = roster.map(driver => ({ name: driver.name, primary: "#" + driver.color }));

const wheelOffsets = [
  [-.93, .36, -.96], [.93, .36, -.96], [-.9, .36, 1.04], [.9, .36, 1.04],
];

const tireProfile = [
  [-.171,.204,0],[-.184,.227,0],[-.171,.253,0],[-.171,.289,0],[-.139,.339,0],
  [-.089,.355,0],[-.071,.353,0],[-.051,.357,0],[0,.354,0],[.051,.357,0],
  [.071,.353,0],[.089,.355,0],[.139,.339,0],[.171,.289,0],[.171,.253,0],[.184,.227,0],[.171,.204,0],
];
const hubProfile = [
  [-.185,0,1],[-.171,.085,1],[-.138,.10,1],[-.125,.164,1],[-.183,.217,2],
  [.183,.217,2],[.125,.164,1],[.138,.10,1],[.171,.085,1],[.185,0,1],
];
const GOLD = rgb("aa7746");
const IRON = rgb("434c49");
const BLACK = rgb("172421");
const STEEL = rgb("688079");
const CREAM = rgb("e0c8a0");
const DIAL = rgb("253733");

function makeWheel(primary, trim, showcase) {
  const rubber = new Mesh();
  const metal = new Mesh();
  const cutProfile = showcase ? tireProfile : tireProfile.filter((_,i)=>![2,6,8,10,14].includes(i));
  latheWheel(rubber, cutProfile, tint(C.rubber,.71), IRON, IRON, showcase ? 26 : 22);
  latheWheel(metal, hubProfile, BLACK, lerpColor(IRON, primary, .15), tint(trim, .91), showcase ? 22 : 17);
  for (const side of [-1, 1]) {
    const x = side * .188;
    ring(metal, [x, 0, 0], .210, .008, C.metal, "x", 15, 4);
    egg(metal, [side * .200, 0, 0], [.021, .070, .070], trim, { rings: 3, slices: 8 });
    const spokes = showcase ? 6 : 5;
    for (let i = 0; i < spokes; i++) {
      const angle = i * Math.PI*2 / spokes;
      const around = (r, a, d) => [side*d, r * Math.cos(angle + a), r * Math.sin(angle + a)];
      tube(metal, [around(.065,0,.197), around(.122,.066,.182), around(.197,.14,.175)],
        [.014,.019,.013], tint(C.metal, 1.05), 4);
      if (showcase) egg(metal, around(.051,.4,.209), [.011,.009,.009], tint(IRON,1.32), { rings: 2, slices: 5 });
    }
  }
  return {
    wheel: rubber.finish(0, { surface: "rubber", roughness: .84 }),
    wheelMetal: metal.finish(0, { surface: "metal", roughness: .24 }),
  };
}

function stitchRun(mesh, from, to, count, color) {
  for (let i=0;i<count;i++) {
    const t=(i+.13)/count;
    const end=t+.54/count;
    const point=u=>from.map((c,j)=>c+(to[j]-c)*u);
    stitch(mesh,point(t),point(end),color,.0037);
  }
}

function fernEmblem(mesh, x, y, z, scale = 1) {
  const center=(a,b,c)=>[x+a*scale,y+b*scale,z+c*scale];
  ring(mesh,center(0,0,0),.069*scale,.0048*scale,CREAM,"z",16,4);
  tube(mesh,[center(-.032,-.043,.004),center(-.006,-.009,.008),center(.027,.043,.004)],.006*scale,CREAM,5);
  for (const [dx,dy,angle] of [[-.020,-.012,-.66],[.016,.018,.65],[.035,.033,-.49]]) {
    egg(mesh,center(dx,dy,.006),[.014*scale,.024*scale,.005*scale],CREAM,
      {rings:4,slices:7,rotation:[0,0,angle]});
  }
}

function chassis(m, glow, metal, trimDetails, paint, trim, accent, index) {
  const chrome = lerpColor(C.metal, trim, .24);
  const darkPaint = tint(paint, .72);
  const shellStations = [
    [-1.54,.026,.52,.018,.017],[-1.46,.332,.51,.137,.117],[-1.29,.47,.51,.227,.196],
    [-1.05,.488,.49,.28,.205],[-.64,.51,.445,.228,.227],[-.15,.562,.45,.203,.227],
    [.25,.58,.493,.237,.235],[.65,.535,.486,.235,.218],[1.0,.447,.462,.198,.159],
    [1.25,.35,.459,.168,.145],[1.43,.293,.482,.188,.170],[1.54,.055,.48,.105,.101],
  ];
  const surface = shell(m, shellStations, (z, angle) => {
    const high = Math.sin(angle);
    if (high < -.44) return tint(BLACK, 1.09 + .10*Math.sin(z*3));
    const vertical = Math.max(0, high);
    return tint(paint, .85 + .22*vertical + .025*Math.cos(z*7));
  },index === 0 ? 26 : 18);
  for (const side of [-1,1]) {
    // Twin pinstripes follow the panel instead of floating over a flat hood.
    for(const [angle,shift,width] of [[.94,.004,.009],[1.03,.005,.0042]]) {
      const positions = Array.from({ length: index === 0 ? 22 : 11 },(_, i)=>{
        const z=.17+1.28*i/(index === 0 ? 21 : 10);
        const {p,n}=surface(z,side>0 ? angle : Math.PI-angle);
        return p.map((v,j)=>v+n[j]*shift);
      });
      tube(metal,positions,width,tint(trim,.86),5);
    }
  }

  // A plated, inward-facing radiator with real fins, not an outline painted on the bonnet.
  bevel(m, [0,.462,1.47], [.715,.482,.192],.138,darkPaint,[-.10,0,0]);
  bevel(metal, [0,.464,1.54], [.622,.415,.059],.12,chrome,[-.10,0,0]);
  bevel(trimDetails, [0,.467,1.573], [.560,.351,.034],.105,BLACK,[-.10,0,0]);
  for (let i=0;i<9;i++) {
    const barY=.330+i*.034;
    const barW=.490-.15*((i-4)/4)**4;
    tube(metal,[[-barW/2,barY,1.597],[barW/2,barY,1.597]],.0055,tint(IRON,1.45),4);
  }
  for (const side of [-1,1]) tube(metal,[[side*.090,.298,1.600],[side*.086,.601,1.605]],.0054,STEEL,4);
  fernEmblem(metal,0,.612,1.607,.46);

  // Tall cowl and a stitched leather seat sit behind the narrow central cockpit.
  bevel(trimDetails, [0,.572,-.574], [.676,.183,.587],.084,tint(C.seat,.72));
  bevel(trimDetails, [0,.916,-.83], [.671,.694,.215],.103,tint(C.seat,.78),[-.15,0,0]);
  bevel(trimDetails, [0,.946,-.713], [.573,.555,.109],.05,C.seat,[-.15,0,0]);
  bevel(m, [0,.718,-1.072], [.724,.326,.514],.146,darkPaint,[-.14,0,0]);
  tube(metal,[[-.344,.825,-.974],[-.292,.897,-1.095],[0,.933,-1.163],[.292,.897,-1.095],[.344,.825,-.974]],.016,trim,6);
  if(index === 0) for (const side of [-1,1]) stitchRun(trimDetails,[side*.245,.739,-.678],[side*.245,1.183,-.704],10,CREAM);
  bevel(m, [0,.459,-1.394], [1.017,.255,.262], .076,darkPaint);
  bevel(metal, [0,.462,-1.527], [.656,.153,.045], .029,chrome);
  bevel(trimDetails, [0,.463,-1.553], [.581,.112,.022], .02,BLACK);
  for(let i=0;i<5;i++) tube(metal,[[-.25,.42+.021*i,-1.569],[.25,.42+.021*i,-1.569]],.0045,tint(STEEL,.88),4);
  const plate=lerpColor(trim,BLACK,.43);
  bevel(trimDetails, [0,.751,-1.315], [.241,.113,.046],.013,plate);
  fernEmblem(metal,0,.75,-1.344,.57);

  for (const side of [-1, 1]) {
    // Lower body panels leave the steering rack and suspension unobstructed.
    egg(m, [side * .599, .438, -.11], [.157, .143, .542], tint(paint,.82),
      {rings:8,slices:14,rotation:[0,side*.075,side*.11],shaping:([x,y,z])=>[x*(1-.2*z),y,z]});
    tube(metal, [[side*.687,.504,-.555],[side*.722,.521,-.319],[side*.747,.529,.03],
      [side*.717,.526,.254],[side*.657,.493,.372]],.0098,tint(trim,.97),6);
    tube(metal, [[side * .50,.308,-1.16],[side * .701,.306,-.835],
      [side * .807,.297,-.510],[side * .821,.299,.345],[side*.726,.309,.661],[side*.536,.320,.941]], .027, GOLD, 7);
    for (let i=0;i<3;i++) {
      const z=-.398+i*.056;
      tube(trimDetails,[[side*.734,.457,z],[side*.744,.477,z+.055]],.009,BLACK,5);
    }
    if(index === 0) for(const z of [-.48,-.16,.23]) egg(metal,[side*.74,.461,z],[.011,.013,.013],chrome,{rings:3,slices:7});

    tube(metal, [[side*.44,.36,.912],[side*.704,.396,.923],[side*.81,.406,1.04]],.024,STEEL,6);
    tube(metal, [[side*.433,.274,1.125],[side*.644,.291,1.09],[side*.808,.336,1.04]],.026,IRON,6);
    tube(metal, [[side*.438,.303,-.843],[side*.632,.307,-.931],[side*.837,.355,-.96]],.03,STEEL,6);
    tube(metal, [[side*.48,.585,1.028],[side*.612,.369,1.029]], .031,chrome, 6);
    if (index === 0) {
      const coils = Array.from({ length:20 },(_, i)=>{
        const t=i/19,a=t*Math.PI*8; return [side*(.487+.112*t+.037*Math.cos(a)),.569-.160*t,1.028+.039*Math.sin(a)];
      });
      tube(metal, coils, .0083, GOLD, 4);
    }

    // Separate lens and transparent-looking geometry sealed in a brass housing.
    egg(trimDetails, [side*.474,.525,1.266],[.123,.115,.119],BLACK,{rings:7,slices:12});
    ring(metal, [side*.475,.534,1.348],.096,.011,chrome,"z",16,4);
    tube(metal,[[side*.488,.460,1.355],[side*.534,.476,1.365]],.0045,tint(accent,.83),4);
    egg(glow,[side*.475,.534,1.348],[.086,.086,.036],C.lamp,{rings:6,slices:12});
    const lamp = [side*.438,.59,-1.465];
    ring(metal,lamp,.072,.010,tint(STEEL,1.25),"z",16,4);
    egg(glow,[lamp[0],lamp[1],lamp[2]-.013],[.063,.058,.025],C.tail,{rings:6,slices:10});

    const pipeX=side*.40;
    tube(metal,[[pipeX,.359,-1.05],[side*.484,.359,-1.178],[side*.494,.366,-1.437],[side*.493,.38,-1.552]],
      [.058,.063,.070,.070],tint(chrome,.70),9);
    ring(metal,[side*.493,.38,-1.563],.059,.011,chrome,"z",15,4);
    egg(trimDetails,[side*.493,.38,-1.565],[.051,.051,.009],BLACK,{rings:4,slices:10});
    // Tire silhouette and camera framing stay clear of the chassis.
    tube(metal,[[side*.32,.273,.21],[side*.602,.272,.24],[side*.742,.281,.351]],.023,IRON,6);
  }

  // Exposed shaft ends at the small wheel, just behind the sculpted paws.
  bevel(m, [0,.677,.364], [.319,.243,.332], .104,darkPaint,[-.26,0,0]);
  tube(metal, [[0,.605,.367],[0,.788,.298],[0,.997,.157]], [.041,.028,.029], chrome,7);
  ring(trimDetails,[0,1.025,.166],.207,.029,BLACK,"z",22,6);
  egg(metal,[0,1.023,.151],[.062,.062,.036],chrome,{rings:6,slices:9});
  for(let i=0;i<3;i++){
    const a=i*Math.PI*2/3+.45;
    tube(metal,[[.044*Math.cos(a),1.024+.044*Math.sin(a),.135],
      [.176*Math.cos(a),1.024+.176*Math.sin(a),.16]], .017,IRON,5);
  }
  const tach = [0,.764,.483];
  ring(metal,tach,.054,.007,chrome,"z",12,4);
  egg(trimDetails,[tach[0],tach[1],tach[2]+.001],[.049,.049,.011],DIAL,{rings:4,slices:10});
  tube(metal,[[0,.753,.493],[.025,.785,.494]],.004,CREAM,5);
}

function stitch(m, from, to, color, radius = .0055) {
  tube(m, [from, to], [radius, radius], color, 4);
}

function driverBody(m, hands, fur, shirt, shape = 1) {
  egg(m, [0, 1.003, -.458], [.294 * shape, .365, .319], shirt, { rings: 8, slices: 12 });
  bevel(m, [0, 1.284, -.407], [.355, .141, .374], .068, lerpColor(shirt, C.linen, .4));
  for (const side of [-1, 1]) {
    tube(m, [[side * .251 * shape, 1.125, -.52], [side * .324, .979, -.241], [side * .227, 1.015, .061]],
      [.102, .098, .077], shirt, 10);
    egg(hands, [side * .214, 1.03, .123], [.100, .079, .086], fur, { rings: 6, fiber:.017 });
    egg(hands, [side * .155, 1.004, .167], [.04, .042, .045], tint(fur, .96), { rings: 5, slices:8, rotation:[0,0,side*.29] });
  }
}

function plushHead(m, detail, fur, y, z, sizes, expression = {}) {
  const [w, h, d] = sizes;
  // Combine a narrow forehead with tucked chin and a fuller cheek volume.
  egg(m, [0, y, z], sizes, fur, {
    rings: 13, slices: 24, sheen: .11, fiber: .006,
    colorAt: expression.bear ? ([r,g,b],[x,dy,dz]) => {
      const cheek = .15 * Math.exp(-((Math.abs(x)-.60)**2*11 + (dy+.29)**2*5)) * Math.max(0,dz);
      const muzzle = .13 * Math.exp(-(x*x*7 + (dy+.37)**2*9)) * Math.max(0,dz);
      return lerpColor(lerpColor([r,g,b],C.amber,cheek),C.linen,muzzle);
    } : undefined,
    shaping: ([x, fy, fz])=>[
      x * (1 + .075 * Math.cos((fy + .21) * 3.1) - .11 * Math.max(0,-fy-.24)),
      fy,
      fz * (1 - .042 * Math.max(0,fy) + .045 * Math.max(0,-fy)),
    ],
  });
  const { mask, cheeks, nose = C.eyes, s = 1, mouth = true, eyes = true } = expression;
  for (const side of [-1, 1]) {
    const x = side * w * .418;
    const eyeY = y + h * (expression.bear ? -.03 : .065);
    const eyeZ = z + d * .925;
    if (mask) egg(m, [x, eyeY, eyeZ - .009], [.111 * s, .08 * s, .029], mask,
      { rings: 6, slices: 12, rotation: [0, side * .32, side * .21] });
    if (cheeks) egg(m, [x * 1.27, y - h * .15, z + d * .845], [.064 * s, .038 * s, .02], cheeks,
      { rings: 5, slices: 10, rotation: [0, side * .36, 0] });
    if (eyes) {
      const faceZ = eyeZ + (mask ? .028 : .003);
      const stitched = expression.bear === true;
      if(stitched) {
        tube(detail, [[x-side*.041,eyeY+.01,faceZ-.007],[x-side*.024,eyeY+.042,faceZ+.004],
          [x+side*.012,eyeY+.044,faceZ+.006],[x+side*.035,eyeY+.017,faceZ-.002]],
          [.002,.006,.006,.002], tint(C.darkFur,.79),5);
      }
      egg(detail, [x, eyeY, faceZ], [(.039-.007*stitched) * s, .059 * s, .023], C.eyes, { rings: 7, slices: 12, rotation: [0, side * .16, -side * .19] });
      egg(detail, [x - .010, eyeY + .017, faceZ + .020], [.007, .008, .006], tint(C.shine,.88), { rings: 4, slices: 8 });
    }
  }
  if (!mouth) return;
  egg(m, [0, y - h * .296, z + d * .939], [.164 * s, .099 * s, .046], lerpColor(fur, C.linen, expression.bear ? .30 : .49), { rings: 8, slices: 16, fiber:.014 });
  egg(detail, [0, y - h * .176, z + d + .024], [.062 * s, .038 * s, .032], nose, {
    rings: 7, slices: 13, fiber:.014, shaping: ([x,ny,nz])=>[x*(.91 + .23 * ny),ny,nz],
  });
  const smile = Array.from({ length: 8 }, (_, i) => {
    const u = i / 7 * 2 - 1;
    return [u * .094 * s, y - h * .384 + .034 * u * u, z + d + .019 - .017 * u * u];
  });
  tube(detail, smile, [.001, .006, .007, .007, .007, .007, .006, .001], tint(C.darkFur, .67), 5);
}

function bonnet(m, y, z, base) {
  // A tailored cap closes behind the head. The sewn ruffle projects into its opening.
  const transform = (theta, phi, width = 0) => {
    const scallop = (Math.sin(phi * 18 + .3) + .34 * Math.sin(phi * 7 - .7)) * width;
    const gathering = Math.exp(-((theta-1.10)**2)*8) *.019;
    const puff = (gathering * Math.cos(phi * 18) + .007 * Math.cos(phi * 7)) * Math.sin(theta) ** 2;
    const dx = (.456 + puff + scallop) * Math.sin(theta) * Math.cos(phi);
    const dy = (.478 + puff + scallop) * Math.sin(theta) * Math.sin(phi);
    return [dx, y + dy, z + (.426 + width) * Math.cos(theta) + scallop * .7];
  };
  const cloth = (theta, phi, width) => {
    const p = transform(theta, phi, width);
    const radial = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
    const thetaPlus=transform(theta+.002,phi,width), thetaMinus=transform(theta-.002,phi,width);
    const phiPlus=transform(theta,phi+.002,width), phiMinus=transform(theta,phi-.002,width);
    const [ax,ay,az]=thetaPlus.map((v,i)=>v-thetaMinus[i]);
    const [bx,by,bz]=phiPlus.map((v,i)=>v-phiMinus[i]);
    const normal=[ay*bz-az*by,az*bx-ax*bz,ax*by-ay*bx];
    const magnitude=Math.hypot(...normal);
    const n=magnitude > 1e-9 ? normal.map(v=>v/magnitude) : radial;
    const pleat = .966 + .035 * Math.cos(phi * 18) + .020 * Math.sin(phi * 12 + theta * 2.6);
    return { p, n, color: tint(base, pleat) };
  };
  m.grid(12, 48, (u, v) => cloth(.99 + u * (Math.PI - .99), v * Math.PI * 2, 0));
  m.grid(4, 60, (u, v) => cloth(.99 - u * .225, v * Math.PI * 2, .013 + .025 * Math.sin(u * 1.98)));
  for (let i=0;i<48;i++) {
    const a = i * Math.PI * 2 / 48;
    stitch(m, transform(1.12,a,.008), transform(1.12,a+.059,.008), tint(C.linenShade,1.06), .0035);
  }
  // The center seam visible during a chase runs over the back of the cap.
  for (const side of [-1,1]) {
    const a = side * Math.PI / 2;
    for (let i=0;i<17;i++) {
      const t=1.32+i*.1;
      stitch(m,transform(t,a,.008),transform(t+.052,a,.008),tint(C.linenShade,1.12),.0044);
    }
  }
}

function fernDriver(m, unusedFur, unusedShirt, fabric, detail) {
  const jacket=rgb("b58f61");
  driverBody(fabric, m, C.tan, jacket);
  const y = 1.562, z = -.473;
  plushHead(m, detail, C.tan, y, z, [.416, .437, .391], { nose: C.amber, bear:true });
  for (const side of [-1, 1]) {
    egg(m, [side * .359, y + .347, z - .034], [.149, .158, .13], C.tan, {
      rings: 9, slices: 15, rotation: [0, side * .11, -side * .24], fiber:.018,
      shaping: ([x,ny,nz])=>[x*(.98+.09*ny),ny,nz],
    });
    egg(m, [side * .370, y + .360, z + .065], [.088, .096, .038], tint(C.darkFur, 1.39),
      { rings: 7, slices: 12, rotation: [0, side * .10, -side * .21], fiber:.017 });
  }
  bonnet(fabric, y, z, C.linen);
  for (const side of [-1, 1]) {
    const cuff = [side*.248,1.016,.041];
    egg(fabric,cuff,[.091,.084,.044],tint(jacket,.81),{rings:4,slices:10,rotation:[-.14,0,side*.17]});
    const sleevePath=[[side*.286,1.083,-.409],[side*.327,1.039,-.263],[side*.296,1.033,-.107]];
    tube(fabric,sleevePath,.0041,tint(jacket,.74),5);
    tube(fabric, [[side * .341, 1.436, -.205], [side * .255, 1.28, -.127], [side * .13, 1.17, -.11], [0, 1.138, -.113]],
      [.027, .030, .033, .028], C.linen, 8);
    egg(fabric, [side * .103, 1.166, -.075], [.123, .059, .037], C.linen, {
      rings: 8, slices: 13, rotation: [0, 0, side * .29],
      shaping: ([x,by,bz]) => [x,by*(.98 + side*x*.32),bz*(.97 + side*x*.28)],
    });
    fabric.grid(5, 5, (u,v) => {
      const ribbonWidth = .022 + .031 * u;
      const ripple = Math.sin(u*3.8 + v*4.2) * .015;
      const x = side * (.022 + .067 * u) + (v - .5) * 2 * ribbonWidth;
      return {
        p:[x,1.148 - u * (.169 + .020*side) - (v-.5)*.016,-.037 + ripple + .017*u],
        n:[0, .12, .993], color:tint(C.linen, .88 + .10 * Math.sin(v*Math.PI)),
      };
    });
  }
  egg(fabric, [0, 1.148, -.034], [.044, .043, .036], C.linen, { rings: 7, slices: 10 });
  for (const y of [.951,1.02]) {
    egg(detail,[0,y,-.135],[.019,.019,.008],GOLD,{rings:3,slices:7});
  }
}

function pointedEar(m, side, y, z, main, inner) {
  m.grid(6, 10, (u, v) => {
    const angle = v * Math.PI * 2;
    const r = Math.max(.012, (1 - u) * (.123 - .021 * u));
    const n = [Math.cos(angle), .13, Math.sin(angle)];
    const p = [side * (.255 + .129 * u) + r * n[0], y + .242 + .31 * u, z + r * n[2] * .64];
    return { p, n: n.map(x => x / Math.hypot(...n)), color: main };
  });
  egg(m, [side * .32, y + .376, z + .065], [.069, .124, .014], inner, {
    rings: 6, slices: 12, rotation: [0, 0, -side * .37],
  });
}

function hare(m, fur, color, fabric, detail) {
  const y = 1.5, z = -.463;
  driverBody(fabric, m, fur, color, .91);
  plushHead(m, detail, fur, y, z, [.398, .406, .371], { nose: rgb("96647d"), cheeks: rgb("e8b3bb") });
  for (const side of [-1, 1]) {
    const x = side * .215;
    egg(m, [x, y + .427, z - .079], [.113, .333, .105], fur, {
      rings: 10, slices: 13, rotation: [side * .04, -.21 * side, -.3 * side],
    });
    egg(m, [side * .233, y + .442, z + .006], [.055, .231, .043], rgb("cb97ba"), {
      rings: 8, slices: 12, rotation: [0, -.17 * side, -.277 * side],
    });
  }
  ring(fabric, [0, 1.162, -.441], .26, .046, rgb("a970b5"), "y", 20, 7);
}

function fox(m, fur, color, fabric, detail) {
  const y = 1.516, z = -.473;
  driverBody(fabric, m, fur, color);
  plushHead(m, detail, fur, y, z, [.411, .382, .388], { nose: C.ink, cheeks: rgb("df987a") });
  for (const side of [-1, 1]) {
    pointedEar(m, side, y, z + .008, fur, rgb("694443"));
    egg(m, [side * .268, y - .124, z + .275], [.159, .112, .103], rgb("ffe5cc"), {
      rings: 7, slices: 13, rotation: [0, side * .22, side * .32],
    });
  }
  egg(detail, [0, y - .112, z + .418], [.079, .047, .042], C.ink, { rings: 6, slices: 11 });
}

function bird(m, fur, color, fabric, detail) {
  const y = 1.525, z = -.453;
  driverBody(fabric, m, fur, color, .94);
  plushHead(m, detail, fur, y, z, [.383, .398, .347], { mouth: false, cheeks: rgb("c9deea") });
  // The curved clay-orange beak is separate from the skylark's olive flight goggles.
  egg(detail, [0, y - .106, z + .356], [.135, .063, .137], rgb("e89d42"), { rings: 7, slices: 14 });
  egg(detail, [0, y - .147, z + .363], [.108, .041, .106], rgb("cf7f2c"), { rings: 6, slices: 12 });
  for (const side of [-1, 1]) {
    egg(m, [side * .119, y + .319, z - .087], [.086, .153, .098], tint(fur, .74), {
      rings: 7, slices: 10, rotation: [-.45, 0, side * .32],
    });
    ring(detail, [side * .151, y + .029, z + .336], .09, .013, rgb("b9d8de"), "z", 16, 6);
  }
}

function hedgehog(m, fur, color, fabric, detail) {
  const y = 1.48, z = -.473;
  driverBody(fabric, m, fur, color, 1.045);
  egg(m, [0, y, z - .119], [.473, .48, .343], rgb("654734"), { rings: 10, slices: 18 });
  for (let i = 0; i < 14; i++) {
    const angle = i * Math.PI * 2 / 14;
    const x = .404 * Math.cos(angle), high = .407 * Math.sin(angle);
    if (high < -.22) continue;
    egg(m, [x, y + high, z - .175 + .042 * Math.sin(angle * 3)], [.096, .173, .074],
      tint(rgb("875638"), .79 + .19 * ((i + 1) % 3)), {
        rings: 6, slices: 9, rotation: [-.26, 0, angle - Math.PI / 2],
      });
  }
  plushHead(m, detail, rgb("deb991"), y, z + .064, [.352, .346, .352], { nose: C.ink });
  for (const side of [-1, 1]) egg(m, [side * .258, y + .233, z + .03], [.091, .091, .066], rgb("c89b7b"), { rings: 6, slices: 10 });
}

function raccoon(m, fur, color, fabric, detail) {
  const y = 1.532, z = -.467;
  driverBody(fabric, m, fur, color);
  for (const side of [-1, 1]) {
    egg(m, [side * .276, y + .284, z - .045], [.126, .157, .107], tint(fur, .73), {
      rings: 7, slices: 12, rotation: [0, 0, -side * .35],
    });
    egg(m, [side * .281, y + .305, z + .025], [.073, .092, .046], rgb("b3909d"), { rings: 6, slices: 10 });
  }
  plushHead(m, detail, fur, y, z, [.426, .386, .394], { mask: rgb("54515e"), nose: C.ink });
  ring(fabric, [0, 1.188, -.471], .248, .053, rgb("a16083"), "y", 19, 7);
  const tail = [[.175, .961, -.678], [.327, 1.044, -.836], [.376, 1.101, -1], [.335, 1.108, -1.146],
    [.24, 1.159, -1.203], [.16, 1.272, -1.176], [.181, 1.384, -1.138]];
  tube(m, tail, [.1, .11, .118, .111, .094, .054, .001], tint(fur, .79), 10);
  for (const i of [1, 3, 5]) {
    const r = [.106, .103, .05][Math.round((i - 1) / 2)];
    egg(m, tail[i], [r, r, r * .65], tint(C.ink, 1.65), { rings: 6, slices: 10, rotation: [.24, .2, -.1] });
  }
}

const character = { bear: fernDriver, hare, fox, bird, hedgehog, raccoon };

export function createKarts() {
  return roster.map((driver, index) => {
    const primary = rgb(driver.color);
    const trim = rgb(driver.trim);
    const accent = rgb(driver.accent);
    const body = new Mesh();
    const lights = new Mesh();
    const metal = new Mesh();
    const fur = new Mesh();
    const fabric = new Mesh();
    const detail = new Mesh();
    chassis(body, lights, metal, detail, primary, trim, accent, index);
    character[driver.type](fur, rgb(driver.fur), lerpColor(primary, C.ink, .24), fabric, detail);
    return {
      ...DRIVERS[index],
      body: [
        body.finish(0, { surface: "paint", roughness: .27 }),
        metal.finish(0, { surface: "metal", roughness: .31 }),
        fur.finish(0, { surface: "fur", roughness: .96 }),
        fabric.finish(0, { surface: "cloth", roughness: .93 }),
        detail.finish(0, { surface: "detail", roughness: .74 }),
        lights.finish(.53, { surface: "lights", roughness: .56 }),
      ],
      ...makeWheel(primary, trim, index === 0),
      wheelOffsets,
    };
  });
}
