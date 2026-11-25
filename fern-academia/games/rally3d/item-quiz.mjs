// Short, offline practice for the optional power upgrade. A shuffled round visits
// each skill once before repeating, with fresh numbers and answer positions.
const both = (en, th) => ({ en, th });
const range = (random, low, high) => low + Math.floor(random() * (high - low + 1));
const choose = (random, values) => values[range(random, 0, values.length - 1)];

function shuffle(values, random) {
  const items = [...values];
  for (let i = items.length - 1; i > 0; i--) {
    const j = range(random, 0, i);
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}

const topics = {
  number: both("Numerical reasoning", "ความสามารถด้านตัวเลข"),
  logic: both("Logical reasoning", "การคิดอย่างมีเหตุผล"),
  office: both("Office skills", "ทักษะงานสำนักงาน"),
};
const fixed = (stem, answers, explanation) => () => ({ stem, answers, explanation });
const numerical = (stem, right, wrong1, wrong2, explanation) => ({
  stem, answers: [right, wrong1, wrong2].map(n => both(String(n), String(n))), explanation,
});
const clock = minutes => String(Math.floor(minutes / 60)).padStart(2, "0") + ":" + String(minutes % 60).padStart(2, "0");
const tasks = [
  ["number", random => {
    const batches = range(random, 3, 9), files = range(random, 4, 11), total = batches * files;
    return numerical(both(`There are ${batches} folders with ${files} files each. How many files?`, `มี ${batches} แฟ้ม แฟ้มละ ${files} ฉบับ รวมกี่ฉบับ`),
      total, total + files, total - batches, both(`${batches} × ${files} = ${total}`, `${batches} × ${files} = ${total}`));
  }],
  ["logic", random => {
    const a = range(random, 2, 17), d = range(random, 2, 9);
    const seq = [a, a+d, a+2*d, a+3*d].join(", ");
    return numerical(both(`The same amount is added each time. ${seq}, …?`, `เพิ่มครั้งละเท่ากันทุกครั้ง ${seq}, …?`),
      a+4*d, a+3*d+1, a+5*d, both(`Add ${d} each time.`, `บวกครั้งละ ${d}`));
  }],
  ["number", random => {
    const items = 20 * range(random, 2, 9), percent = choose(random, [10, 20, 25, 50]), result = items * percent / 100;
    return numerical(both(`What is ${percent}% of ${items} files?`, `${percent}% ของเอกสาร ${items} ฉบับ เท่ากับกี่ฉบับ`),
      result, result + 3, result - 2, both(`${items} × ${percent} ÷ 100 = ${result}`, `${items} × ${percent} ÷ 100 = ${result}`));
  }],
  ["office", random => {
    const start = range(random, 8, 15)*60 + choose(random, [10, 15, 25, 40, 50]), wait = choose(random, [20, 25, 35, 45]);
    const right = clock(start + wait);
    return { stem: both(`A meeting starts at ${clock(start)} and lasts ${wait} minutes. When does it end?`, `ประชุมเริ่ม ${clock(start)} น. ใช้เวลา ${wait} นาที เลิกกี่โมง`),
      answers: [right, clock(start+wait+10), clock(start+wait-15)].map(s => both(s,s)),
      explanation: both(`${clock(start)} + ${wait} min = ${right}`, `${clock(start)} + ${wait} นาที = ${right}`) };
  }],
  ["number", random => {
    const rate = range(random, 3, 8), minutes = range(random, 4, 11), total = rate * minutes;
    return numerical(both(`A printer prints ${rate} pages per minute. How many minutes for ${total} pages?`, `เครื่องพิมพ์พิมพ์นาทีละ ${rate} หน้า ถ้าพิมพ์ ${total} หน้า ต้องใช้กี่นาที`),
      minutes, minutes + 2, minutes - 1, both(`${total} ÷ ${rate} = ${minutes}`, `${total} ÷ ${rate} = ${minutes}`));
  }],
  ["logic", random => {
    const a=range(random, 1, 7), b=range(random, 8, 15), start=range(random, 3, 18);
    const seq=[start,start+a,start+a+b,start+2*a+b,start+2*a+2*b].join(", ");
    return numerical(both(`Alternate +${a}, then +${b}. What follows ${seq}?`, `บวก ${a} และบวก ${b} สลับกัน จำนวนถัดจาก ${seq} คือเท่าไร`),
      start+3*a+2*b, start+2*a+3*b, start+3*a+3*b, both(`The next step is +${a}.`, `ขั้นถัดไปคือบวก ${a}`));
  }],
  ["number", random => {
    const middle = range(random, 9, 28), gap=range(random, 2, 6);
    return numerical(both(`Find the mean of ${middle-gap}, ${middle} and ${middle+gap}.`, `ค่าเฉลี่ยของ ${middle-gap}, ${middle} และ ${middle+gap} เท่ากับเท่าไร`),
      middle, middle-gap, middle+gap, both(`${3*middle} ÷ 3 = ${middle}`, `${3*middle} ÷ 3 = ${middle}`));
  }],
  ["office", random => {
    const row=range(random, 3, 35), col=choose(random, ["B","C","D","F","H"]);
    return { stem: both(`In a spreadsheet, which address is column ${col}, row ${row}?`, `ในตารางคำนวณ เซลล์คอลัมน์ ${col} แถวที่ ${row} มีชื่อว่าอะไร`),
      answers: [col+row,row+col,col+(row+1)].map(s=>both(s,s)), explanation: both("Write the column first, then the row.", "เขียนตัวอักษรคอลัมน์ก่อน ตามด้วยเลขแถว") };
  }],
  ["office", fixed(both("Which spreadsheet function adds a range of numbers?", "ฟังก์ชันใดในตารางคำนวณใช้หาผลรวมของช่วงตัวเลข"),
    [both("SUM","SUM"), both("COUNT","COUNT"), both("MAX","MAX")], both("SUM adds the values.", "SUM ใช้หาผลรวมของค่าในช่วงที่กำหนด"))],
  ["logic", fixed(both("Mali arrives before Nida. Nida arrives before Ploy. Who arrives last?", "มะลิมาถึงก่อนนิดา นิดามาถึงก่อนพลอย ใครมาถึงเป็นคนสุดท้าย"),
    [both("Ploy","พลอย"),both("Nida","นิดา"),both("Mali","มะลิ")], both("Mali, then Nida, then Ploy.", "ลำดับคือ มะลิ นิดา แล้วจึงพลอย"))],
  ["office", fixed(both("Which email field hides the recipient list from the other recipients?", "ช่องใดในอีเมลใช้ซ่อนรายชื่อผู้รับจากผู้รับคนอื่น"),
    [both("Bcc","Bcc"),both("Cc","Cc"),both("Subject","หัวเรื่อง")], both("Bcc is blind carbon copy.", "Bcc คือสำเนาลับ"))],
  ["number", random => {
    const ratio = range(random, 2, 6), one=range(random, 3, 9), total=one*(ratio+1);
    return numerical(both(`Blue to green folders are in a ${ratio} : 1 ratio. Of ${total} folders, how many are green?`,
      `แฟ้มสีน้ำเงินต่อแฟ้มสีเขียวมีอัตราส่วน ${ratio} ต่อ 1 ถ้ามีทั้งหมด ${total} แฟ้ม จะเป็นสีเขียวกี่แฟ้ม`),
      one, total-one, one+1, both(`One share is ${total} ÷ ${ratio+1} = ${one}.`, `หนึ่งส่วนเท่ากับ ${total} ÷ ${ratio+1} = ${one}`));
  }],
];

export function createQuizDeck(random = Math.random) {
  let order = [];
  let last = -1;
  return () => {
    if (!order.length) {
      order = shuffle(tasks.map((_, index) => index), random);
      if (order.at(-1) === last) [order[0],order[order.length-1]] = [order.at(-1),order[0]];
    }
    last = order.pop();
    const [topic, make] = tasks[last];
    const { stem, answers, explanation } = make(random);
    const positions = shuffle([0,1,2],random);
    return { family: last, topic: topics[topic], stem, answers: positions.map(index=>answers[index]), correct: positions.indexOf(0), explanation };
  };
}
