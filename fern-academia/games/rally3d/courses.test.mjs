import test from 'node:test';
import assert from 'node:assert/strict';
import { COURSES } from './courses.mjs';

const close = (a,b,eps) => assert.ok(Math.abs(a-b)<eps, `${a} should be within ${eps} of ${b}`);

test('the calendar provides ten distinct long two-lap worlds and every difficulty', () => {
  assert.equal(COURSES.length, 10);
  assert.equal(new Set(COURSES.map(c => c.biome)).size, 10);
  assert.deepEqual([...new Set(COURSES.map(c => c.difficulty))].sort(), [1,2,3,4,5]);
  assert.ok(COURSES.every(c => c.laps === 2 && c.length >= 2400 && c.length <= 4700));
  for (const c of COURSES) {
    assert.match(c.name.en, /Fern/);
    assert.match(c.name.th, /เฟิร์น/);
    assert.equal(c.sectors[0].fraction, 0);
    assert.equal(c.landmarks.length, 4);
    assert.ok(c.sectors.every((sector, i) => sector.name.en && sector.name.th &&
      (!i || c.sectors[i-1].fraction < sector.fraction) && sector.fraction < 1));
    assert.ok(c.bridges.every(([a,b]) => a>=0 && b>a && b<1));
  }
});

for (const course of COURSES) {
  test(course.id + ' has a continuous metric road, technical corners and no overlapping nonadjacent road', () => {
    const bins = Math.ceil(course.length/3.5);
    const step = course.length/bins;
    const frames = Array.from({length: bins}, (_,i) => course.frame(i*step));
    let distance = 0, corners = 0, priorSign = 0, minY = Infinity, maxY = -Infinity;
    const location = new Map();
    const cellWidth = 2*course.halfWidth + 3;
    const hash = (x,z) => x + '/' + z;
    frames.forEach((f,i) => {
      const next = frames[(i+1)%bins];
      distance += Math.hypot(next.x-f.x,next.z-f.z);
      minY = Math.min(minY,f.y);
      maxY = Math.max(maxY,f.y);
      close(Math.hypot(f.dx,f.dz),1,.00001);
      close(f.rx*f.dx + f.rz*f.dz,0,.00001);
      assert.ok(Math.abs(f.curve)*(course.halfWidth+1.6) < .65);
      assert.ok(Math.abs(f.dy) < .21);
      const sign = Math.abs(f.curve)>.012 ? Math.sign(f.curve) : 0;
      if (sign && sign!==priorSign) corners++;
      priorSign = sign;

      const cx = Math.floor(f.x/cellWidth), cz = Math.floor(f.z/cellWidth);
      for (let hx=cx-1; hx<=cx+1; hx++) for (let hz=cz-1; hz<=cz+1; hz++) {
        for (const j of location.get(hash(hx,hz)) ?? []) {
          const along = Math.min(i-j,bins-(i-j))*step;
          if (along<35) continue;
          const other = frames[j];
          assert.ok(Math.hypot(f.x-other.x,f.z-other.z) > cellWidth,
            `road edges intersect near ${Math.round(i*step)} and ${Math.round(j*step)} m`);
        }
      }
      const key = hash(cx,cz);
      if (!location.has(key)) location.set(key, []);
      location.get(key).push(i);
    });
    assert.ok(corners>=18);
    assert.ok(maxY-minY>=18.8);
    close(distance,course.length, course.length*.001);
    const a = course.frame(-.001), b = course.frame(.001);
    assert.ok(Math.hypot(a.x-b.x,a.z-b.z)<.003);
    for (const k of ['dx','dz','dy','curve','bank']) close(a[k],b[k],.0001);
  });

  test(course.id + ' telegraphs dodgeable traps and places pickups on a continuous race rhythm', () => {
    const itemRows = course.items.filter((_,i)=>i%3===0);
    assert.equal(itemRows[0].s,42);
    itemRows.forEach((row,i) => {
      const next = itemRows[(i+1)%itemRows.length];
      const spacing = (next.s-row.s+course.length)%course.length;
      assert.ok(spacing>=125 && spacing<=166);
      const line = course.items.slice(i*3,i*3+3);
      assert.ok(line.every(item=>item.s===row.s && item.group===i));
      assert.equal(line[1].offset,0);
    });
    for (const items of [course.items,course.hazards,course.pads,course.pickups]) {
      assert.ok(items.every((o,i)=>o.id===i && o.s>=0 && o.s<course.length && Math.abs(o.offset)<course.halfWidth));
    }
    assert.deepEqual([...new Set(course.hazards.map(h => h.kind))].sort(), ['gum', 'hurdle', 'slalom', 'slick', 'sweeper']);
    course.hazards.forEach((h,i) => {
      const previous = course.hazards[(i+course.hazards.length-1)%course.hazards.length];
      const gap=(h.s-previous.s+course.length)%course.length;
      // Even a centred sweeper leaves enough asphalt on either side for a kart.
      assert.ok(course.halfWidth-h.halfWidth > 3.1);
      assert.ok(gap-h.halfLength-previous.halfLength >=24);
      assert.ok(itemRows.every(r=>Math.abs(h.s-r.s)>=22));
    });
  });
}
