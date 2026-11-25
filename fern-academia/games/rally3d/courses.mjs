// Survey plans use local map coordinates, with turn radii measured in game metres.
// The racing surface is built from straights tangent to individually rounded turns.
const TAU = Math.PI * 2;
const clamp = (n, low, high) => Math.max(low, Math.min(high, n));
const wrap = (n, size) => ((n % size) + size) % size;
const label = (en, th) => ({ en, th });
const section = (fraction, en, th) => ({ fraction, name: label(en, th) });
const landmark = (fraction, kind, en, th) => ({ ...section(fraction, en, th), kind });
const colors = (skyTop, skyLow, fog, road, ground, accent) => ({ skyTop, skyLow, fog, road, ground, accent });

const PLANS = [
  {
    id: 'moss', biome: 'woodland', theme: 'moss', difficulty: 1, seed: 8191,
    name: label('Fern Mosswood', 'ป่ามอสเฟิร์น'), tag: label('Pine ridges · Linked forest bends', 'สันเขาป่าสน · โค้งต่อเนื่อง'),
    length: 2680, halfWidth: 7.3, cruise: 25.8, radius: 55,
    art: colors('#315464', '#f1d3a1', '#b1c1a9', '#444c43', '#45644c', '#e2bd78'),
    plan: [[0,0],[0,69],[-38,111,40],[-81,143,45],[-85,195,52],[-49,240,52],[8,258,62],[69,245,59],
      [103,204,42],[145,206,34],[175,247,46],[229,253,58],[280,217,59],[295,156,64],[270,112,39],
      [213,86,43],[206,47,31],[243,14,38],[258,-40,65],[219,-94,61],[159,-115,56],[113,-97,35],
      [72,-119,42],[28,-113,43],[0,-71,50]],
    elevation: [[0,4],[.09,7],[.24,31],[.37,25],[.50,42],[.62,19],[.74,5],[.84,13],[.94,4],[1,4]],
    sectors: [section(0,'Sawyer Meadow','ทุ่งโรงเลื่อย'),section(.25,'Pine Cathedral','แนวสนสูง'),section(.50,'Deer Ridge','สันเขากวาง'),section(.77,'Mill Creek','ลำธารโรงสี')],
    landmarks: [landmark(.067,'mill','Copper wheel','กังหันทองแดง'),landmark(.31,'pines','Cathedral pines','หมู่สนสูง'),landmark(.56,'lookout','Fire lookout','หอเฝ้าป่า'),landmark(.83,'bridge','Sawmill bridge','สะพานโรงเลื่อย')],
    interval: 157, sequence: ['hurdle','slalom','slick','slalom','sweeper','slalom'], lanes: [0,.46,-.48,.39,-.3,-.36],
    bridges: [[.072,.096],[.782,.813]],
  },
  {
    id: 'lantern', biome: 'lanterns', theme: 'lantern', difficulty: 3, seed: 12457,
    name: label('Fern Lantern Heights','เขาโคมไฟเฟิร์น'), tag: label('Terraced ascent · Night hairpins','ไต่ขั้นเขา · โค้งหักศอกยามค่ำ'),
    length: 3050, halfWidth: 6.65, cruise: 27.4, radius: 48,
    art: colors('#23283e','#db9383','#a77e87','#45434a','#4a4356','#ffbd73'),
    plan: [[0,0],[0,55],[-75,98,36],[-79,135,29],[-27,152,31],[39,158,32],[46,187,22],
      [-50,210,35],[-79,237,26],[-55,264,26],[75,266,37],[107,298,34],[158,310,57],[204,283,51],
      [209,240,35],[172,194,29],[181,162,26],[253,140,34],[276,100,40],[253,65,31],[198,57,26],
      [190,20,34],[249,-19,32],[250,-64,43],[191,-107,53],[109,-99,57],[53,-131,39],[8,-101,38],[0,-57]],
    elevation: [[0,5],[.075,12],[.20,47],[.34,72],[.42,78],[.51,56],[.65,33],[.72,42],[.86,7],[.95,5],[1,5]],
    sectors: [section(0,'Lantern Market','ตลาดโคมไฟ'),section(.19,'The Tea Terraces','ไร่ชาขั้นบันได'),section(.43,'Bell Summit','ยอดเขาระฆัง'),section(.70,'Ember Descent','ทางลงแสงโคม')],
    landmarks: [landmark(.056,'lantern','Market arch','ซุ้มตลาด'),landmark(.27,'terrace','Tea pavilion','ศาลาไร่ชา'),landmark(.45,'tower','Bell tower','หอระฆัง'),landmark(.76,'bridge','Lantern viaduct','สะพานโคมไฟ')],
    interval: 144, sequence: ['hurdle','sweeper','slalom','slick','slalom','sweeper','hurdle'], lanes: [0,-.22,.42,-.49,-.32,.18,.35],
    bridges: [[.31,.334],[.710,.747]],
  },
  {
    id: 'river', biome: 'coast', theme: 'river', difficulty: 2, seed: 16453,
    name: label('Fern Silverwater','อ่าวซิลเวอร์วอเตอร์เฟิร์น'), tag: label('Coastal straights · Double-apex coves','ทางตรงเลียบฝั่ง · โค้งสองจุดยอด'),
    length: 2860, halfWidth: 7.05, cruise: 27.0, radius: 55,
    art: colors('#36789b','#e5e8d5','#b5d3d1','#48575a','#708664','#7ae3d7'),
    plan: [[0,0],[0,79],[-30,132,34],[-70,145,37],[-118,174,51],[-120,224,47],[-81,253,42],[-24,244,57],
      [13,206,42],[52,192,43],[96,211,43],[132,248,50],[190,260,66],[244,236,56],[263,186,48],
      [239,149,38],[182,134,36],[159,107,29],[180,78,31],[245,67,41],[276,26,59],[263,-33,45],
      [228,-68,39],[180,-65,35],[158,-92,31],[103,-108,47],[47,-97,49],[0,-55]],
    elevation: [[0,2],[.09,4],[.18,21],[.29,12],[.40,3],[.53,17],[.61,14],[.68,3],[.79,6],[.88,23],[.97,2],[1,2]],
    sectors: [section(0,'Shell Harbour','ท่าเรือเปลือกหอย'),section(.23,'Twin Coves','อ่าวแฝด'),section(.49,'White Cliffs','หน้าผาขาว'),section(.76,'Lighthouse Run','ทางประภาคาร')],
    landmarks: [landmark(.08,'dock','Shell pier','ท่าเรือเปลือกหอย'),landmark(.32,'stack','Chalk needles','เสาหินปูน'),landmark(.60,'arch','Sea arch','ซุ้มหินทะเล'),landmark(.87,'lighthouse','Tide light','ประภาคารน้ำขึ้น')],
    interval: 152, sequence: ['hurdle','slick','slalom','sweeper','slick','hurdle'], lanes: [0,-.48,.5,.10,.44,-.31],
    bridges: [[.165,.191],[.416,.447],[.713,.739]],
  },
  {
    id: 'mangrove', biome: 'mangrove', theme: 'river', difficulty: 2, seed: 27281,
    name: label('Fern Tidal Reach','ป่าโกงกางเฟิร์น'), tag: label('Tidal causeways · Low zigzags','ทางข้ามน้ำขึ้น · ซิกแซกบนที่ราบ'),
    length: 3170, halfWidth: 7.0, cruise: 27.4, radius: 49,
    art: colors('#456981','#eac79b','#bdc7b0','#55574a','#56644b','#e8ab71'),
    plan: [[0,0],[0,64],[-37,87,33],[-66,123,35],[-54,166,42],[-10,192,44],[46,186,38],
      [73,209,24],[57,244,28],[1,261,37],[-15,293,35],[24,321,37],[116,328,52],[151,303,32],
      [160,247,39],[180,213,37],[219,204,28],[246,223,28],[289,219,39],[302,181,39],
      [278,137,38],[230,103,31],[251,70,31],[299,46,39],[304,3,43],[270,-34,42],
      [198,-29,42],[173,-61,28],[178,-95,31],[132,-126,44],[68,-112,48],[0,-66]],
    elevation: [[0,2],[.10,5],[.19,3],[.31,16],[.42,8],[.52,3],[.62,11],[.72,4],[.81,3],[.90,21],[.97,2],[1,2]],
    sectors: [section(0,'Fisher Wharf','ท่าเรือชาวประมง'),section(.22,'Root Maze','เขาวงกตรากไม้'),section(.48,'Kingfisher Banks','ตลิ่งนกกระเต็น'),section(.76,'Salt Flats','ลานเกลือ')],
    landmarks: [landmark(.06,'dock','Fishing wharf','ท่าเรือประมง'),landmark(.28,'roots','Mangrove roots','รากโกงกาง'),landmark(.57,'bridge','Tide crossing','สะพานน้ำขึ้น'),landmark(.85,'mill','Salt windmill','กังหันนาเกลือ')],
    interval: 147, sequence: ['hurdle','slick','sweeper','slick','slalom','sweeper','slalom'], lanes: [0,.45,-.22,-.53,.48,.12,-.43],
    bridges: [[.118,.142],[.291,.318],[.475,.51],[.64,.672],[.81,.842]],
  },
  {
    id: 'quarry', biome: 'quarry', theme: 'moss', difficulty: 4, seed: 31393,
    name: label('Fern Copper Quarry','เหมืองทองแดงเฟิร์น'), tag: label('Quarry terraces · Stepped switchbacks','ชั้นเหมืองหิน · โค้งพับขึ้นเขา'),
    length: 3520, halfWidth: 6.35, cruise: 28.2, radius: 43,
    art: colors('#59757b','#efd2a4','#c3a48a','#65564a','#89654f','#57dfcb'),
    plan: [[0,0],[0,58],[-58,92,33],[-83,130,33],[-81,180,33],[-55,201,28],[43,200,35],[62,222,22],
      [46,244,22],[-54,257,28],[-65,286,22],[-34,307,28],[97,306,41],[148,342,40],[211,339,48],
      [237,307,36],[226,276,27],[162,246,31],[142,220,22],[162,197,25],[228,205,32],[272,183,36],
      [286,140,45],[274,92,36],[240,83,25],[199,102,27],[176,80,25],[191,44,32],[263,12,34],
      [278,-23,32],[250,-66,42],[191,-83,39],[126,-74,40],[78,-112,34],[26,-111,36],[0,-64]],
    elevation: [[0,9],[.08,25],[.17,49],[.28,73],[.39,91],[.46,86],[.57,55],[.66,63],[.76,28],[.85,9],[.93,3],[1,9]],
    sectors: [section(0,'Loading Yard','ลานขนแร่'),section(.21,'Copper Ledges','ชั้นหินทองแดง'),section(.46,'Upper Works','โรงงานบนเขา'),section(.72,'Crusher Bend','โค้งโรงโม่')],
    landmarks: [landmark(.064,'gantry','Loading crane','ปั้นจั่นขนแร่'),landmark(.29,'quarry','Cut-stone ledges','ผาหินตัด'),landmark(.50,'tower','Headframe','หอรอกเหมือง'),landmark(.82,'trestle','Ore trestle','สะพานขนแร่')],
    interval: 138, sequence: ['hurdle','slalom','sweeper','hurdle','slick','sweeper','slalom','hurdle'], lanes: [0,.46,-.14,-.30,.49,.17,-.37,.32],
    bridges: [[.416,.44],[.792,.82]],
  },
  {
    id: 'orchard', biome: 'orchard', theme: 'lantern', difficulty: 3, seed: 36067,
    name: label('Fern Blossom Pass','ช่องเขาซากุระเฟิร์น'), tag: label('Orchard ribbons · Rhythm chicanes','เส้นทางสวนดอกไม้ · ชิเคนต่อเนื่อง'),
    length: 3320, halfWidth: 6.8, cruise: 27.9, radius: 47,
    art: colors('#65779c','#ffdfc0','#cdaeb9','#59525a','#7d8068','#ffafbb'),
    plan: [[0,0],[0,70],[-32,116,33],[-73,138,38],[-102,180,40],[-96,220,34],[-56,243,36],
      [-8,237,33],[19,211,27],[49,215,25],[81,257,37],[134,271,43],[162,253,28],
      [170,223,23],[197,212,27],[238,235,32],[278,224,38],[294,185,39],[279,148,32],
      [237,136,28],[210,119,26],[213,86,24],[246,71,28],[260,40,26],[238,15,28],
      [202,13,26],[183,-14,30],[205,-50,33],[202,-90,39],[154,-121,47],[106,-102,36],
      [74,-107,29],[46,-130,34],[12,-116,36],[0,-65]],
    elevation: [[0,5],[.08,8],[.18,32],[.29,52],[.40,39],[.49,54],[.58,28],[.69,34],[.80,12],[.90,20],[.97,5],[1,5]],
    sectors: [section(0,'Peach Orchard','สวนท้อ'),section(.23,'Petal Ridge','สันเขากลีบดอก'),section(.48,'Blossom Gallery','แนวซากุระ'),section(.74,'Tea House Lane','ทางโรงน้ำชา')],
    landmarks: [landmark(.066,'orchard','Peach terraces','สวนท้อขั้นบันได'),landmark(.27,'tree','The old cherry','ต้นซากุระเก่า'),landmark(.54,'pavilion','Petal pavilion','ศาลากลีบดอก'),landmark(.82,'bridge','Red orchard bridge','สะพานแดงในสวน')],
    interval: 146, sequence: ['hurdle','slalom','slalom','slick','sweeper','slalom','hurdle'], lanes: [0,-.48,.48,.39,-.21,-.40,.31],
    bridges: [[.24,.264],[.78,.808]],
  },
  {
    id: 'glacier', biome: 'glacier', theme: 'river', difficulty: 4, seed: 41263,
    name: label('Fern Glacier Run','ธารน้ำแข็งเฟิร์น'), tag: label('Ice shelves · Alpine switchbacks','ชั้นน้ำแข็ง · โค้งกลับบนเทือกเขา'),
    length: 3860, halfWidth: 6.65, cruise: 29.0, radius: 45,
    art: colors('#527b9d','#e1f1f1','#aac9d4','#515f6c','#9faeb8','#90f3ef'),
    plan: [[0,0],[0,68],[-43,114,33],[-89,132,33],[-134,175,47],[-140,229,45],[-116,266,32],
      [-85,271,26],[-22,224,31],[22,208,27],[40,232,21],[-18,280,26],[-36,308,27],
      [-9,341,36],[56,351,49],[111,316,34],[139,264,33],[184,246,31],[212,262,26],
      [216,309,31],[250,333,34],[289,314,38],[305,269,43],[288,206,40],[256,171,28],
      [219,168,26],[200,143,24],[222,118,26],[276,104,33],[304,65,41],[297,23,36],
      [251,2,38],[191,4,33],[163,-23,29],[174,-72,32],[156,-108,32],[108,-119,42],
      [77,-96,27],[49,-94,24],[23,-115,32],[0,-87,35],[0,-53]],
    elevation: [[0,11],[.08,31],[.17,67],[.25,82],[.37,116],[.46,103],[.55,79],[.65,48],[.75,33],[.81,45],[.92,6],[1,11]],
    sectors: [section(0,'Moraine Base','เชิงธารน้ำแข็ง'),section(.22,'Ice Ladders','บันไดน้ำแข็ง'),section(.48,'Blue Col','ช่องเขาสีน้ำเงิน'),section(.74,'Frozen Lake','ทะเลสาบน้ำแข็ง')],
    landmarks: [landmark(.077,'lodge','Survey lodge','กระท่อมสำรวจ'),landmark(.29,'ice','Blue icefall','น้ำตกน้ำแข็ง'),landmark(.53,'spire','Glacier needles','ยอดหินธารน้ำแข็ง'),landmark(.83,'bridge','Ice lake bridge','สะพานทะเลสาบน้ำแข็ง')],
    interval: 140, sequence: ['hurdle','slick','sweeper','slick','slalom','hurdle','slick','slalom'], lanes: [0,-.5,.16,.55,-.43,.20,-.42,.39],
    bridges: [[.205,.232],[.527,.55],[.79,.823]],
  },
  {
    id: 'caldera', biome: 'caldera', theme: 'lantern', difficulty: 5, seed: 48989,
    name: label('Fern Cinder Ring','วงแหวนภูเขาไฟเฟิร์น'), tag: label('Crater rim · Blind linked bends','ขอบปล่องภูเขาไฟ · โค้งบังสายตา'),
    length: 4210, halfWidth: 6.25, cruise: 29.2, radius: 43,
    art: colors('#392e3e','#d98465','#a07873','#423c40','#61514e','#ff9d6d'),
    plan: [[0,0],[0,71],[-42,113,34],[-78,174,43],[-83,235,51],[-57,280,34],[-24,296,31],
      [15,289,30],[48,261,29],[54,218,24],[25,183,25],[28,151,24],[69,125,31],
      [113,130,32],[131,154,23],[127,187,24],[105,214,23],[105,249,29],[139,278,33],
      [178,288,34],[225,270,30],[258,271,26],[299,302,37],[343,296,35],[378,260,42],
      [397,206,48],[385,154,36],[347,115,33],[319,114,23],[294,135,22],[267,125,23],
      [263,90,25],[289,58,30],[343,42,31],[368,4,42],[355,-46,39],[316,-81,36],
      [267,-90,34],[222,-71,31],[196,-81,25],[176,-112,28],[123,-129,42],
      [88,-112,31],[64,-88,26],[33,-95,27],[0,-65,38]],
    elevation: [[0,8],[.075,35],[.15,73],[.24,81],[.32,37],[.42,65],[.52,107],[.60,121],[.68,88],[.76,46],[.83,57],[.94,7],[1,8]],
    sectors: [section(0,'Ash Fields','ทุ่งเถ้าถ่าน'),section(.23,'Inner Crater','ปล่องชั้นใน'),section(.48,'Obsidian Rim','ขอบปล่องออบซิเดียน'),section(.73,'Furnace Chute','ทางลงเตาหลอม')],
    landmarks: [landmark(.06,'obelisk','Basalt columns','เสาหินบะซอลต์'),landmark(.28,'crater','Crater vent','ช่องไอภูเขาไฟ'),landmark(.55,'arch','Obsidian arch','ซุ้มหินภูเขาไฟ'),landmark(.83,'viaduct','Cinder viaduct','สะพานหุบภูเขาไฟ')],
    interval: 133, sequence: ['hurdle','sweeper','hurdle','slick','slalom','sweeper','slalom','sweeper'], lanes: [0,.2,-.39,.53,-.40,-.19,.43,-.14],
    bridges: [[.174,.194],[.48,.509],[.794,.827]],
  },
  {
    id: 'citadel', biome: 'citadel', theme: 'moss', difficulty: 4, seed: 52379,
    name: label('Fern Cloud Citadel','ป้อมเมฆเฟิร์น'), tag: label('Rampart straights · Stone gate chicanes','ทางตรงบนกำแพง · ชิเคนประตูหิน'),
    length: 4040, halfWidth: 6.5, cruise: 28.8, radius: 45,
    art: colors('#556879','#e8cba1','#bdbaa7','#555653','#72806c','#ebc580'),
    plan: [[0,0],[0,70],[-48,97,33],[-90,101,31],[-107,134,30],[-99,168,28],
      [-61,180,28],[-41,203,23],[-51,238,29],[-88,259,28],[-85,293,31],[-41,322,35],
      [12,320,36],[39,291,26],[86,289,32],[110,321,30],[161,334,40],[205,315,38],
      [228,274,35],[219,248,24],[182,236,22],[172,216,22],[188,192,25],[225,193,27],
      [251,222,25],[283,223,29],[310,186,37],[309,150,31],[274,126,27],[268,100,23],
      [303,75,26],[319,42,38],[301,-1,37],[270,-18,28],[221,-3,30],[192,-22,25],
      [190,-68,30],[161,-101,36],[115,-102,30],[88,-81,25],[60,-79,24],[36,-100,25],[5,-87,30],[0,-51]],
    elevation: [[0,8],[.08,29],[.16,48],[.27,62],[.40,82],[.51,100],[.60,84],[.69,44],[.77,56],[.84,26],[.95,6],[1,8]],
    sectors: [section(0,'Lower Gate','ประตูล่าง'),section(.22,'Western Ramparts','กำแพงตะวันตก'),section(.48,'Cloud Keep','ป้อมกลางเมฆ'),section(.75,'Watch Road','ถนนหอเฝ้ายาม')],
    landmarks: [landmark(.075,'gate','Gatehouse','ป้อมประตู'),landmark(.30,'rampart','Western tower','หอตะวันตก'),landmark(.54,'citadel','Cloud keep','ป้อมกลางเมฆ'),landmark(.84,'aqueduct','Old aqueduct','สะพานส่งน้ำเก่า')],
    interval: 141, sequence: ['hurdle','slalom','sweeper','slalom','hurdle','slick','sweeper'], lanes: [0,-.47,.18,.43,-.21,.48,-.15],
    bridges: [[.143,.166],[.547,.569],[.827,.852]],
  },
  {
    id: 'aurora', biome: 'aurora', theme: 'river', difficulty: 5, seed: 59281,
    name: label('Fern Aurora Divide','สันเขาออโรราเฟิร์น'), tag: label('Polar endurance · Summit switchbacks','ทางไกลขั้วโลก · โค้งพับบนยอดเขา'),
    length: 4650, halfWidth: 6.3, cruise: 29.6, radius: 46,
    art: colors('#152c45','#65878d','#668990','#43515c','#597a72','#85f1be'),
    plan: [[0,0],[0,73],[-39,105,31],[-93,119,37],[-137,159,41],[-146,205,35],
      [-125,237,30],[-90,240,27],[-57,213,27],[-25,220,23],[-16,254,23],[-51,297,30],
      [-48,335,32],[-11,358,34],[41,355,36],[72,320,30],[111,302,28],[135,325,23],
      [130,360,25],[160,390,31],[219,396,44],[256,365,34],[260,324,27],[227,293,24],
      [221,258,23],[247,238,25],[282,249,27],[315,282,27],[358,281,34],[391,243,39],
      [394,194,38],[365,152,30],[329,145,24],[309,121,23],[322,90,24],[370,73,28],
      [398,35,39],[388,-7,34],[347,-31,35],[299,-18,30],[266,-32,23],[256,-67,25],
      [279,-99,26],[269,-134,33],[221,-152,40],[168,-133,37],[129,-94,28],[94,-93,24],
      [63,-119,29],[25,-119,33],[0,-85,35],[0,-48]],
    elevation: [[0,8],[.08,31],[.16,64],[.23,51],[.32,94],[.41,125],[.49,142],[.57,113],[.64,88],[.72,55],[.77,70],[.85,39],[.94,6],[1,8]],
    sectors: [section(0,'Polar Station','สถานีขั้วโลก'),section(.21,'North Face','หน้าผาเหนือ'),section(.46,'Aurora Crown','ยอดเขาออโรรา'),section(.73,'Midnight Fjord','ฟยอร์ดเที่ยงคืน')],
    landmarks: [landmark(.066,'station','Polar outpost','ฐานขั้วโลก'),landmark(.26,'ice','North ice wall','ผาน้ำแข็งเหนือ'),landmark(.53,'dome','Aurora observatory','หอดูแสงเหนือ'),landmark(.85,'fjord','Midnight crossing','ทางข้ามฟยอร์ด')],
    interval: 132, sequence: ['hurdle','slick','sweeper','slalom','hurdle','sweeper','slick','slalom','sweeper'], lanes: [0,-.5,.18,.45,-.32,-.22,.48,-.39,.15],
    bridges: [[.182,.207],[.425,.448],[.757,.785],[.849,.874]],
  },
];

// A surveyed corner has two tangent points and one circle centre. Adjacent turns
// each reserve less than half of the common straight so the kerbs never fold back.
function buildAlignment(plan, scale, defaultRadius) {
  const corners = plan.map(([x0, z0, specifiedRadius], i) => {
    const before = plan[wrap(i - 1, plan.length)];
    const after = plan[(i + 1) % plan.length];
    const x = x0 * scale, z = z0 * scale;
    const ax = x0 - before[0], az = z0 - before[1];
    const bx = after[0] - x0, bz = after[1] - z0;
    const a = Math.hypot(ax, az), b = Math.hypot(bx, bz);
    const ix = ax / a, iz = az / a, ox = bx / b, oz = bz / b;
    const angle = Math.atan2(iz * ox - ix * oz, ix * ox + iz * oz);
    if (Math.abs(angle) < .00001) return { entry: [x,z], exit: [x,z], arc: 0 };
    const tangent = Math.tan(Math.abs(angle) / 2);
    const cut = Math.min((specifiedRadius ?? defaultRadius) * tangent, .475 * scale * Math.min(a, b));
    const radius = cut / tangent;
    const entry = [x - cut * ix, z - cut * iz];
    const exit = [x + cut * ox, z + cut * oz];
    const signedRadius = Math.sign(angle) * radius;
    return { entry, exit, arc: radius * Math.abs(angle), yaw: Math.atan2(ix, iz),
      centerX: entry[0] + signedRadius * iz, centerZ: entry[1] - signedRadius * ix, signedRadius };
  });
  const segments = [];
  let length = 0;
  for (let i = 0; i < corners.length; i++) {
    const from = corners[i].exit;
    const to = corners[(i + 1) % corners.length];
    const x = to.entry[0] - from[0], z = to.entry[1] - from[1];
    const span = Math.hypot(x,z);
    if (span > 1e-6) {
      segments.push({ start: length, x: from[0], z: from[1], yaw: Math.atan2(x,z), dx: x/span, dz: z/span });
      length += span;
    }
    if (to.arc) {
      segments.push({ start: length, ...to });
      length += to.arc;
    }
  }
  return { length, segments };
}

function metricAlignment(plan) {
  let low = 0, high = 1;
  while (buildAlignment(plan.plan, high, plan.radius).length < plan.length) high *= 2;
  for (let i = 0; i < 32; i++) {
    const scale = (low + high) * .5;
    if (buildAlignment(plan.plan, scale, plan.radius).length < plan.length) low = scale;
    else high = scale;
  }
  return buildAlignment(plan.plan, (low + high) * .5, plan.radius);
}

function alignmentPoint(segment, distance) {
  const d = distance - segment.start;
  if (!segment.arc) return [segment.x + segment.dx*d, segment.z + segment.dz*d, segment.yaw];
  const yaw = segment.yaw + d / segment.signedRadius;
  return [segment.centerX - segment.signedRadius * Math.cos(yaw),
    segment.centerZ + segment.signedRadius * Math.sin(yaw), yaw];
}

// Periodic monotone Hermite slopes give continuous gradients, including across
// the timing line, and keep authored crests and low points inside their bounds.
function heightProfile(keys, length) {
  const grade = keys.slice(0, -1).map(([fraction,y], i) => {
    const [nextFraction, nextY] = keys[i + 1];
    return (nextY - y) / ((nextFraction - fraction) * length);
  });
  const tangents = grade.map((outgoing, i) => {
    const incoming = grade[wrap(i - 1, grade.length)];
    return incoming * outgoing > 0 ? 2 / (1/incoming + 1/outgoing) : 0;
  });
  return (s, index) => {
    const [f0, y0] = keys[index], [f1, y1] = keys[index + 1];
    const width = (f1 - f0)*length;
    const t = clamp((s - f0*length)/width, 0, 1), t2 = t*t;
    const m0 = tangents[index], m1 = tangents[(index + 1) % tangents.length];
    const blend = t2*(3 - 2*t);
    return [y0 + (y1-y0)*blend + width*(m0 * t*(1-t)*(1-t) + m1*t2*(t-1)),
      (y1-y0)*6*t*(1-t)/width + m0*(1 - 4*t + 3*t2) + m1*(3*t2 - 2*t)];
  };
}

function makeFrames(plan) {
  const { length, segments } = metricAlignment(plan);
  const heightAt = heightProfile(plan.elevation, plan.length);
  const count = Math.ceil(plan.length/1.65);
  const stride = plan.length/count;
  const x = new Float64Array(count), y = new Float64Array(count), z = new Float64Array(count);
  const yaw = new Float64Array(count), dy = new Float64Array(count), curve = new Float64Array(count);
  let roadIndex = 0, heightIndex = 0;
  for (let i = 0; i < count; i++) {
    const distance = length * (i/count);
    while (roadIndex + 1 < segments.length && segments[roadIndex + 1].start <= distance) roadIndex++;
    while (heightIndex + 2 < plan.elevation.length && plan.elevation[heightIndex+1][0] <= i/count) heightIndex++;
    const point = alignmentPoint(segments[roadIndex], distance);
    x[i] = point[0]; z[i] = point[1];
    yaw[i] = Math.atan2(Math.sin(point[2]), Math.cos(point[2]));
    [y[i], dy[i]] = heightAt(stride * i, heightIndex);
  }
  const signedTurn = (a,b) => (b-a > Math.PI ? b-a-TAU : b-a < -Math.PI ? b-a+TAU : b-a);
  // Blending curvature over a short wheelbase eases the bank into each arc.
  for (let i = 0; i < count; i++) {
    curve[i] = signedTurn(yaw[wrap(i-2,count)],yaw[(i+2)%count])/(4*stride);
  }
  return distance => {
    const q = wrap(Number.isFinite(distance) ? distance : 0, plan.length)/stride;
    const a = Math.floor(q) % count, b = (a+1) % count, f = q - Math.floor(q);
    const heading = yaw[a] + f*signedTurn(yaw[a],yaw[b]);
    const dx = Math.sin(heading), dz = Math.cos(heading);
    const curvature = curve[a] + f*(curve[b]-curve[a]);
    return { x: x[a]+f*(x[b]-x[a]), y: y[a]+f*(y[b]-y[a]), z: z[a]+f*(z[b]-z[a]),
      dx, dz, rx: dz, rz: -dx, dy: dy[a]+f*(dy[b]-dy[a]), curve: curvature,
      bank: clamp(-curvature*(4.1 + plan.difficulty*.27), -.215, .215) };
  };
}

const HAZARD_SIZE = {
  hurdle: [1.59, .57],
  sweeper: [1.14, .9],
  slick: [1.58, 3.15],
  slalom: [.9, .86],
};

function raceObjects(plan, frame) {
  const items = [], pads = [], pickups = [], hazards = [];
  const rows = Math.round(plan.length/plan.interval);
  const spacing = plan.length/rows;
  const width = plan.halfWidth;
  function addHazard(kind, position, lane) {
    const [halfWidth, halfLength] = HAZARD_SIZE[kind];
    const id = hazards.length;
    hazards.push({ id, kind, s: position, offset: lane * width, halfWidth, halfLength,
      phase: wrap(plan.seed * .013 + id*2.39996,TAU) });
  }
  for (let i=0; i<rows; i++) {
    const s = 42 + i*spacing;
    for (const lane of [-.58, 0, .58]) {
      items.push({id: items.length, group: i, s, offset: lane*width});
    }
    const kind = plan.sequence[i % plan.sequence.length];
    const lane = plan.lanes[i % plan.lanes.length];
    const hazardS = s + spacing*(.34 + .055*Math.sin(i*1.8));
    addHazard(kind, hazardS, lane);
    // Pairs create a chicane when appropriate. Every obstacle can still be
    // bypassed individually, including the ramp hurdle on the novice circuit.
    const pair = plan.difficulty >= 3 && i%4 === 2 || plan.difficulty === 5 && i%4 === 0 && i>0;
    if (pair) addHazard('slalom', hazardS + 29, lane >= 0 ? -.46 : .46);
    // Place a bonus on the exit side after the hazard, leaving all escape paths clear.
    const rewardS = s + spacing*.71;
    if (rewardS + 8 > plan.length - 15) continue;
    const sign = Math.sign(frame(rewardS).curve);
    const rewardLane = sign ? sign *.47 : i%2 ? -.48 : .48;
    if ((i + plan.difficulty)%3 !== 0) {
      pads.push({id:pads.length, s: rewardS, offset: rewardLane*width, halfLength:3.25, halfWidth:1.5});
    } else {
      for (let j=0; j<3; j++) {
        pickups.push({id:pickups.length, s:rewardS + 3.7*j, offset:(rewardLane + .055*j)*width, special:j === 2});
      }
    }
  }
  return { items, hazards, pads, pickups };
}

export const COURSES = PLANS.map(plan => {
  const { id, biome, theme, difficulty, name, tag, art, length, halfWidth, cruise, seed,
    sectors, landmarks, bridges } = plan;
  const frame = makeFrames(plan);
  return { id, biome, theme, difficulty, name, tag, art, length, halfWidth, cruise, seed,
    sectors, landmarks, bridges, laps: 2, frame, ...raceObjects(plan,frame) };
});
