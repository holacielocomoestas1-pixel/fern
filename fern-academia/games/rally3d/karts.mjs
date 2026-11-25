import { Mesh, bevel, egg, latheWheel, lerpColor, rgb, ring, shell, tint, tube } from "./kart-mesh.mjs";

const C = Object.fromEntries(Object.entries({
  ink: "192728", rubber: "263231", carbon: "223d37", seat: "4b3633", metal: "a6b7ae",
  brass: "e3b874", lamp: "fff3bb", tail: "ff755c", linen: "fff1d5", linenShade: "cfae82",
  tan: "d9a269", amber: "d17838", darkFur: "6a452e", eyes: "33201c", shine: "fff9e5",
}).map(([name, value]) => [name, rgb(value)]));

const roster = [
  { name: { en: "Fern", th: "เฟิร์น" }, color: "347e64", trim: "ddc092", accent: "f7d28c", fur: "d9a269", type: "bear" },
  { name: { en: "Pip", th: "พิพ" }, color: "d3a1e4", trim: "f3cbe8", accent: "ffd38d", fur: "f0d9e0", type: "hare" },
  { name: { en: "Ember", th: "เอมเบอร์" }, color: "d4664d", trim: "f7a46c", accent: "ffe4a4", fur: "db7946", type: "fox" },
  { name: { en: "Skye", th: "สกาย" }, color: "4f99d3", trim: "77cedf", accent: "f3d390", fur: "70aade", type: "bird" },
  { name: { en: "Thistle", th: "ธิสเซิล" }, color: "d4a34b", trim: "f6d679", accent: "dbf395", fur: "bc8763", type: "hedgehog" },
  { name: { en: "Juniper", th: "จูนิเปอร์" }, color: "7873bd", trim: "b1a5e0", accent: "c0efc8", fur: "a7a4ab", type: "raccoon" },
];

export const DRIVERS = roster.map(driver => ({ name: driver.name, primary: "#" + driver.color }));

const wheelOffsets = [
  [-.93, .36, -.96], [.93, .36, -.96], [-.9, .36, 1.04], [.9, .36, 1.04],
];

const tireProfile = [
  [-.184, 0, 1], [-.184, .094, 1], [-.171, .205, 1], [-.179, .22, 2],
  [-.16, .243, 0], [-.162, .288, 0], [-.133, .338, 0], [-.074, .358, 0],
  [.074, .358, 0], [.133, .338, 0], [.162, .288, 0], [.16, .243, 0],
  [.179, .22, 2], [.171, .205, 1], [.184, .094, 1], [.184, 0, 1],
];

function wheel(primary, trim) {
  const m = new Mesh();
  latheWheel(m, tireProfile, C.rubber, lerpColor(C.metal, primary, .2), trim);
  for (const side of [-1, 1]) {
    ring(m, [side * .183, 0, 0], .213, .009, tint(trim, .77), "x", 18, 4);
    egg(m, [side * .196, 0, 0], [.026, .087, .087], tint(trim, .85), { rings: 5, slices: 10 });
    const spokes = 5;
    for (let i = 0; i < spokes; i++) {
      const angle = i * Math.PI * 2 / spokes;
      const inner = [side * .179, .084 * Math.cos(angle), .084 * Math.sin(angle)];
      const outer = [side * .174, .187 * Math.cos(angle + .08), .187 * Math.sin(angle + .08)];
      tube(m, [inner, outer], [.018, .025], tint(C.ink, 1.63), 5);
    }
  }
  return m.finish(0, { surface: "rubber", roughness: .81 });
}

function chassis(m, glow, metal, paint, trim, accent) {
  const stations = [
    [-1.49, .03, .52, .025], [-1.43, .43, .53, .19], [-1.3, .66, .53, .25],
    [-1.04, .695, .52, .25], [-.65, .637, .48, .225], [-.17, .59, .472, .215],
    [.37, .63, .466, .23], [.78, .653, .465, .226], [1.04, .59, .451, .205],
    [1.31, .44, .439, .176], [1.49, .22, .43, .128], [1.55, .028, .416, .03],
  ];
  shell(m, stations, (vertical, u) => {
    if (vertical < -.37) return tint(C.ink, 1.06 + .17 * u);
    if (vertical > .32) return lerpColor(paint, trim, .28 + .21 * u);
    return tint(paint, .91 + .09 * vertical);
  });
  // Rounded front prow, split side pods and the warm rear radiator.
  bevel(m, [0, .374, 1.399], [1.06, .21, .22], .085, C.ink);
  bevel(m, [0, .464, 1.338], [.84, .26, .3], .106, paint);
  bevel(m, [0, .581, 1.06], [.34, .22, .769], .1, tint(C.carbon, .87), [-.11, 0, 0]);
  bevel(m, [0, .648, 1.06], [.266, .142, .55], .061, trim, [-.11, 0, 0]);
  bevel(m, [0, .47, -1.322], [1.36, .23, .34], .087, C.carbon);
  bevel(m, [0, .595, -1.366], [.66, .211, .223], .066, tint(C.metal, .6));
  bevel(m, [0, .592, -1.473], [.514, .161, .055], .025, C.ink);
  for (let i = 0; i < 4; i++) {
    bevel(metal, [0, .543 + .035 * i, -1.503], [.415, .012, .015], .006, tint(C.brass, .86));
  }
  bevel(m, [0, .813, -1.035], [.9, .42, .55], .12, tint(paint, .83), [-.12, 0, 0]);
  bevel(m, [0, .963, -1.147], [.894, .126, .44], .062, trim);
  bevel(m, [0, .583, -.66], [.819, .24, .634], .111, C.seat);
  bevel(m, [0, .983, -.797], [.709, .771, .27], .12, tint(C.seat, .72), [-.15, 0, 0]);
  bevel(m, [0, 1.025, -.674], [.614, .611, .148], .064, C.seat, [-.15, 0, 0]);
  for (const side of [-1, 1]) {
    egg(m, [side * .63, .49, -.05], [.186, .205, .638], contrastPanel(paint), { rings: 7, slices: 14 });
    egg(m, [side * .672, .635, .025], [.153, .056, .527], trim, { rings: 5, slices: 12 });
    bevel(m, [side * .795, .539, -.067], [.08, .096, .604], .034, tint(C.carbon, 1.37));
    bevel(m, [side * .803, .554, -.03], [.057, .022, .421], .01, accent);
    bevel(m, [side * .458, .626, 1.118], [.374, .232, .32], .102, tint(C.ink, 1.34), [0, -side * .12, 0]);
    egg(m, [side * .467, .647, 1.276], [.137, .077, .054], accent, { rings: 6 });
    egg(glow, [side * .469, .654, 1.306], [.098, .053, .024], C.lamp, { rings: 5, slices: 10 });
    bevel(m, [side * .464, .704, -1.368], [.319, .183, .206], .069, tint(C.ink, 1.41));
    bevel(m, [side * .465, .71, -1.477], [.244, .099, .045], .021, tint(C.tail, .75));
    bevel(glow, [side * .466, .723, -1.497], [.212, .043, .022], .01, C.tail);
    bevel(glow, [side * .465, .688, -1.5], [.165, .015, .018], .007, tint(C.tail, .86));
    const exhaustX = side * .48;
    tube(m, [[exhaustX, .425, -1.03], [exhaustX, .43, -1.4], [exhaustX, .429, -1.541]], [.099, .087, .084], C.carbon, 10);
    ring(metal, [exhaustX, .429, -1.545], .074, .018, C.metal, "z", 12, 6);
    egg(m, [exhaustX, .429, -1.536], [.068, .067, .018], C.ink, { rings: 4, slices: 10 });
    bevel(m, [side * .578, .269, -.96], [.667, .069, .09], .029, C.metal);
    bevel(m, [side * .56, .27, 1.04], [.647, .065, .09], .028, C.metal);
    // Visible axle ends and brushed guards are modeled all the way around.
    tube(metal, [[side * .471,.342,-1.14],[side * .665,.32,-1.005],[side * .80,.36,-.96]], [.027,.03,.041], tint(C.metal, .72), 6);
    tube(metal, [[side * .575,.393,1.11],[side * .728,.365,1.035],[side * .82,.357,1.04]], [.035,.025,.037], tint(C.metal, .8), 6);
    tube(metal, [[side * .70,.311,-.66],[side * .862,.345,-.49],[side * .878,.363,.24],[side * .723,.358,.48]], [.037,.034,.034,.033], C.brass, 6);
    for (let louver = 0; louver < 3; louver++) {
      const z = -.26 + .099 * louver;
      bevel(m, [side * .831,.523,z], [.026,.035,.052], .012, C.ink, [-.36,0,0]);
    }
    // Rivets are substantial enough to read in the cinematic reveal.
    egg(m, [side * .556, .971, -1.196], [.034, .028, .028], accent, { rings: 4, slices: 8 });
  }
  tube(m, [[0, .51, .456], [0, .79, .341], [0, .987, .21]], [.052, .044, .047], C.metal, 8);
  ring(m, [0, 1.017, .19], .225, .038, C.ink, "z", 17, 7);
  egg(m, [0, 1.016, .18], [.085, .084, .047], tint(C.metal, .8), { rings: 6, slices: 10 });
  bevel(m, [0, 1.028, .181], [.322, .033, .043], .015, C.carbon);
  egg(m, [0, 1.027, .126], [.04, .039, .018], accent, { rings: 5, slices: 8 });
}

function stitch(m, from, to, color, radius = .0055) {
  tube(m, [from, to], [radius, radius], color, 4);
}

function contrastPanel(paint) {
  return lerpColor(paint, C.carbon, .25);
}

function fernBadge(m) {
  egg(m, [0, .92, -1.37], [.143, .119, .045], C.linen, { rings: 6, slices: 14 });
  for (const side of [-1, 1]) {
    egg(m, [side * .044, .934, -1.407], [.029, .055, .012], rgb("438264"), { rings: 5, slices: 8, rotation: [0, 0, -side * .55] });
  }
  tube(m, [[0, .884, -1.407], [0, .919, -1.42], [0, .96, -1.413]], .012, rgb("438264"), 6);
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
    rings: 13, slices: 24, sheen: .11, fiber: .012,
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
      egg(detail, [x, eyeY, faceZ], [.039 * s, .059 * s, .023], C.eyes, { rings: 7, slices: 12, rotation: [0, side * .16, -side * .19] });
      egg(detail, [x - .010, eyeY + .017, faceZ + .020], [.008, .010, .007], tint(C.shine,.91), { rings: 4, slices: 8 });
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
    const n = [Math.sin(theta) * Math.cos(phi), Math.sin(theta) * Math.sin(phi), Math.cos(theta)];
    const pleat = .95 + .049 * Math.cos(phi * 18) + .036 * Math.sin(phi * 12 + theta * 2.6);
    return { p, n, color: tint(base, pleat) };
  };
  m.grid(12, 48, (u, v) => cloth(.99 + u * (Math.PI - .99), v * Math.PI * 2, 0));
  m.grid(4, 60, (u, v) => cloth(.99 - u * .225, v * Math.PI * 2, .013 + .038 * Math.sin(u * 1.98)));
  for (let i=0;i<48;i++) {
    const a = i * Math.PI * 2 / 48;
    stitch(m, transform(1.12,a,.008), transform(1.12,a+.074,.008), tint(C.linenShade,1.13), .004);
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
  driverBody(fabric, m, C.tan, rgb("ba915f"));
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
  fernBadge(detail);
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
    chassis(body, lights, metal, primary, trim, accent);
    character[driver.type](fur, rgb(driver.fur), lerpColor(primary, C.ink, .24), fabric, detail);
    return {
      ...DRIVERS[index],
      body: [
        body.finish(0, { surface: "paint", roughness: .46 }),
        metal.finish(0, { surface: "metal", roughness: .35 }),
        fur.finish(0, { surface: "fur", roughness: .96 }),
        fabric.finish(0, { surface: "cloth", roughness: .93 }),
        detail.finish(0, { surface: "detail", roughness: .74 }),
        lights.finish(.53, { surface: "lights", roughness: .56 }),
      ],
      wheel: wheel(primary, trim),
      wheelOffsets,
    };
  });
}
