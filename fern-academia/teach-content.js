// Fern Academy v6.0 — capa docente «como a un niño de 5 años».
// Contenido escrito a mano para los capítulos donde la plantilla paramétrica
// (teach.js) quedaría floja: temas abstractos o con reglas que se confunden.
// Cada anulación cubre los tres bloques: En simple / ¿Por qué pasa? /
// Recuérdalo así. Todo en tailandés primero, con versión EN breve.
// Los demás capítulos (57/75) se componen en teach.js desde su propio
// title/summary/sections de catalog.json — nunca relleno genérico.

export const SUBJECT_ANALOGY = {
  general: {
    th: "เหมือนเล่นเกมหาของที่ซ่อน — มองหาสิ่งที่ซ้ำกันก่อน แล้วคำตอบจะโผล่มาเอง",
    en: "Like a treasure hunt — spot what repeats first, and the answer pops out.",
  },
  thai: {
    th: "เหมือนเลือกเสื้อให้ถูกงาน — คำก็ต้องเหมาะกับที่ที่จะใช้",
    en: "Like dressing for the occasion — words must fit where they're used.",
  },
  it: {
    th: "เหมือนจัดโต๊ะทำงาน — ของอยู่ถูกที่ หยิบเมื่อไหร่ก็เจอ",
    en: "Like tidying a desk — everything in its place, easy to grab.",
  },
  saraban: {
    th: "เหมือนส่งจดหมาย — ใส่ซองถูก เขียนที่อยู่ชัด ถึงมือคนรับแน่นอน",
    en: "Like posting a letter — right envelope, clear address, and it reaches the right hands.",
  },
  law: {
    th: "เหมือนกฎของเกม — รู้กฎก่อนเล่น จะได้ไม่เสียเปรียบ",
    en: "Like the rules of a game — know them before you play and no one can catch you out.",
  },
  english: {
    th: "เหมือนสะพานข้ามภาษา — รู้คำเดียวก็ข้ามไปได้อีกก้าว",
    en: "Like a bridge between languages — one word carries you one step further.",
  },
};

// Forma: { simple: {th, en}, why: {th: [pasos], en: [steps]}, hook: {th, en} }
export const TEACH_OVERRIDES = {
  "g-probability": {
    simple: {
      th: "ความน่าจะเป็นก็คือการนับว่า ‘สิ่งที่เราอยากได้’ มีกี่แบบ จาก ‘ทั้งหมดที่เป็นไปได้’ กี่แบบ แล้วเอามาหารกัน",
      en: "Probability is counting how many ways you get what you want, out of all the ways things can happen — then dividing.",
    },
    why: {
      th: [
        "เพราะทุกผลมีโอกาสเท่ากัน เราจึงนับผลที่ต้องการแล้วหารด้วยผลทั้งหมด",
        "ถ้าหยิบแล้วไม่ใส่คืน ของในกล่องจะน้อยลง ผลทั้งหมดของรอบถัดไปจึงเปลี่ยนไปด้วย",
        "เลือกคนสองคนทำหน้าที่เหมือนกัน สลับที่กันก็ยังเป็นคู่เดิม จึงต้องหารด้วย 2",
      ],
      en: [
        "When every outcome is equally likely, count the ones you want and divide by all of them.",
        "Drawing without replacement shrinks the box, so the next round's total changes.",
        "Two people in identical roles make one pair either way round, so divide by 2.",
      ],
    },
    hook: {
      th: "นึกถึงกล่องบัตรสี: อยากได้สีเขียว 2 ใบ ต้องถามก่อนว่า ‘หยิบแล้วใส่คืนไหม’ — คำตอบเปลี่ยนทันทีที่กล่องเปลี่ยน",
      en: "Picture the box of coloured cards: before you multiply, ask 'do I put it back?' — the answer changes the moment the box changes.",
    },
  },
  "g-logic": {
    simple: {
      th: "ตรรกะคือการวาดลูกศรว่า ‘อะไรเกิดก่อน อะไรเกิดหลัง’ แล้วห้ามเดาสิ่งที่โจทย์ไม่ได้บอก",
      en: "Logic is drawing arrows for 'what comes before what' — and never guessing what the question never said.",
    },
    why: {
      th: [
        "เพราะเขียนเป็นลูกศร เราจึงเห็นโซ่ทั้งหมดและรวมข้อความที่เชื่อมกันได้",
        "‘ถ้า P แล้ว Q’ บอกแค่ว่า Q เท็จแล้ว P เท็จตาม แต่ Q จริงยังสรุป P ไม่ได้",
        "นับอันดับจากอีกด้านด้วยสูตร ทั้งหมด − อันดับเดิม + 1",
      ],
      en: [
        "Arrows turn scattered clues into one visible chain.",
        "'If P then Q' only lets you conclude: false Q means false P. True Q proves nothing about P.",
        "Count a rank from the other end with total − original rank + 1.",
      ],
    },
    hook: {
      th: "จำลูกศรของดล → กิต → บัว → จูน ไว้: โซ่ที่ต่อกันเท่านั้นที่บอกอันดับได้ โซ่ที่ขาดกันบอกไม่ได้",
      en: "Remember Don → Kit → Bua → June: only a connected chain can rank people. A broken chain stays silent.",
    },
  },
  "g-analogy": {
    simple: {
      th: "อุปมาคือการหาว่าคำคู่แรก ‘เกี่ยวกันแบบไหน’ แล้วหาคู่ที่สองที่เกี่ยวกันแบบเดียวกัน เป๊ะ ๆ",
      en: "An analogy asks: how exactly are the first two words related? Then find a second pair related in exactly the same way.",
    },
    why: {
      th: [
        "เพราะอ่านคู่แรกเป็นประโยค (‘ช้อนใช้ตัก’) เราจึงเห็นความสัมพันธ์ชัด ไม่ใช่แค่เดาว่าเกี่ยวกับเรื่องเดียวกัน",
        "เทอร์มอมิเตอร์วัดอุณหภูมิ เหมือนตราชั่งวัดน้ำหนัก — เครื่องมือกับสิ่งที่วัด",
        "ล้อ : รถ กับ รถ : ล้อ เป็นคำเดิมแต่ทิศกลับกัน ความสัมพันธ์จึงไม่เหมือนกัน",
      ],
      en: [
        "Saying the first pair as a sentence ('a spoon scoops') reveals the real relationship.",
        "A thermometer measures temperature, like a scale measures weight — instrument and what it measures.",
        "Wheel : car and car : wheel use the same words in opposite directions, so the relationship flips.",
      ],
    },
    hook: {
      th: "จำไว้ว่า ‘บทอยู่ในหนังสือ เหมือนฉากอยู่ในละคร’ — ส่วนกับทั้งหมด ต้องทิศเดียวกันเสมอ",
      en: "Remember: a chapter is part of a book, like a scene is part of a play — part to whole, always in the same direction.",
    },
  },
  "i-lookup": {
    simple: {
      th: "การค้นหาคือการบอก Excel ว่า ‘หารหัสนี้ให้หน่อย แล้วเอาคำตอบจากแถวเดียวกันมาให้’",
      en: "A lookup tells Excel: 'find this ID, then bring back the answer from the same row.'",
    },
    why: {
      th: [
        "เพราะ XLOOKUP ค้นในช่วงหนึ่งแล้วคืนค่าจากอีกช่วงในตำแหน่งเดียวกัน มันจึงหารหัสแล้วดึงคำตอบได้ในสูตรเดียว",
        "VLOOKUP ค้นเฉพาะคอลัมน์แรกของตาราง ส่วน MATCH บอกแค่ว่าอยู่ลำดับที่เท่าไร",
        "รหัสซ้ำทำให้เจอแถวแรกแทนแถวที่ต้องการ จึงต้องใช้รหัสที่ไม่ซ้ำกัน",
      ],
      en: [
        "XLOOKUP searches one range and returns the aligned value from another, so one formula finds the ID and fetches the answer.",
        "VLOOKUP only searches a table's first column, and MATCH only returns the position.",
        "Duplicate IDs return the first match instead of the right row, so IDs must be unique.",
      ],
    },
    hook: {
      th: "จำ P2 ได้ 60: XLOOKUP หา ‘P2’ เจอแถวที่สอง แล้วหยิบ 60 จากคอลัมน์ข้าง ๆ — เหมือนเปิดสมุดรายชื่อแล้วอ่านบรรทัดเดียวกัน",
      en: "Remember P2 → 60: XLOOKUP finds 'P2' in row two and reads 60 from the next column — like opening a phone book and reading across the same line.",
    },
  },
  "i-cloud": {
    simple: {
      th: "ไฟล์บนคลาวด์คือสมุดที่หลายคนเขียนพร้อมกันได้ — ต้องรู้ว่าใครแก้ได้บ้าง และถ้าเขียนทับผิดจะย้อนกลับยังไง",
      en: "A cloud file is a notebook many people can write in at once — so you must know who may edit it, and how to undo a bad overwrite.",
    },
    why: {
      th: [
        "เพราะลิงก์ ‘ใครก็เปิดได้’ ส่งต่อได้ไม่รู้จบ จึงต้องเลือกผู้รับเป็นรายคนเมื่ออยากจำกัดคนดู",
        "ประวัติรุ่นเก็บเนื้อหาก่อนแก้ผิดไว้ จึงกู้คืนได้โดยไม่ต้องพิมพ์ใหม่",
        "การซิงก์ส่งต่อการเปลี่ยนแปลงทุกอย่าง รวมถึงความผิดพลาด จึงต้องมีสำเนาสำรองแยกอีกชุด",
      ],
      en: [
        "An 'anyone can open' link can be forwarded endlessly, so name the recipients when the audience must stay limited.",
        "Version history keeps the content from before the mistake, so you can restore instead of retyping.",
        "Sync copies every change — including mistakes — so a separate backup is the real safety net.",
      ],
    },
    hook: {
      th: "จำเพื่อนที่เขียนทับตารางไว้: ก่อนกู้คืนให้ดูประวัติรุ่นก่อน ว่าฉบับดีฉบับสุดท้ายคือฉบับไหน",
      en: "Remember the colleague who overwrote the spreadsheet: check version history first to find the last good copy before restoring.",
    },
  },
  "i-security": {
    simple: {
      th: "ความปลอดภัยดิจิทัลคือกฎง่าย ๆ ข้อเดียว: ‘อย่ารีบเชื่อ อย่ารีบกด’ — หยุดก่อน แล้วเช็กผ่านช่องทางที่เรารู้จัก",
      en: "Digital safety is one simple rule: 'don't trust in a hurry, don't tap in a hurry' — pause, then verify through a channel you already know.",
    },
    why: {
      th: [
        "เพราะข้อความหลอกมักเร่งให้กลัว (‘ส่ง OTP เดี๋ยวนี้ไม่งั้นโดนล็อก’) การหยุดคิดจึงตัดกับดักตั้งแต่ต้น",
        "ชื่อและโลโก้ปลอมได้ง่าย แต่ช่องทางที่เรารู้จักอยู่แล้วปลอมยากกว่า",
        "รหัสผ่านไม่ซ้ำกับ MFA ช่วยได้แม้รหัสหลุด เพราะคนร้ายยังมีกุญแจอีกดอกที่ไม่มี",
      ],
      en: [
        "Scam messages rush you ('send your OTP now or get locked out'), so pausing breaks the trap at the start.",
        "Names and logos are easy to fake; a channel you already know is much harder to fake.",
        "Unique passwords plus MFA protect you even if one password leaks — the thief still lacks the second key.",
      ],
    },
    hook: {
      th: "จำไว้ว่า ‘ผู้ดูแลตัวจริงไม่เคยขอ OTP’ — ใครขอรหัสผ่านหรือ OTP ทางแชต คือคนร้ายแทบทุกครั้ง",
      en: "Remember: a real administrator never asks for your OTP — anyone asking for a password or code in a chat is almost always a thief.",
    },
  },
  "thai-exp-lesson-idioms": {
    simple: {
      th: "สำนวนคือประโยคสั้น ๆ ที่เล่าเรื่องทั้งเรื่อง — ต้องดูว่า ‘เกิดอะไรขึ้นก่อน-หลัง’ ไม่ใช่ดูแค่คำที่เห็น",
      en: "An idiom is a short phrase that tells a whole story — judge it by what happened first and what followed, not by the words on the surface.",
    },
    why: {
      th: [
        "เพราะสำนวนสื่อ ‘แกนการกระทำกับผล’ การสรุปสถานการณ์เป็นประโยคธรรมดาก่อนจึงช่วยให้เลือกถูก",
        "สำรองไฟล์หลังข้อมูลหายคือ ‘วัวหายล้อมคอก’ แต่สำรองก่อนหายคือ ‘กันไว้ดีกว่าแก้’ — ลำดับเวลากลับกัน ความหมายก็กลับกัน",
        "คำที่พูดถึงสัตว์เหมือนกันไม่ได้แปลว่าสำนวนเดียวกัน ต้องดูผลที่เกิดขึ้น",
      ],
      en: [
        "Idioms carry an action and its consequence, so summarising the situation in plain words first leads to the right choice.",
        "Backing up after losing data is วัวหายล้อมคอก; backing up before is กันไว้ดีกว่าแก้ — reverse the order and the meaning flips.",
        "Sharing an animal word doesn't make two idioms the same; look at the consequence.",
      ],
    },
    hook: {
      th: "จำวัวกับคอกไว้: วัวหายก่อนแล้วค่อยล้อมคอก คือสายไปแล้ว — ถามตัวเองเสมอว่า ‘ทำก่อนหรือหลังเสียหาย’",
      en: "Remember the cow and the fence: fencing after the cow escaped is too late — always ask 'before the damage, or after?'",
    },
  },
  "thai-exp-lesson-nuance": {
    simple: {
      th: "คำใกล้เคียงกันต่างกันที่ ‘สิ่งที่คำนั้นยืนยัน’ — รับทราบแค่บอกว่ารู้ แต่เห็นชอบคือยอมรับแล้ว",
      en: "Similar words differ in what they actually assert — รับทราบ only says 'I know', but เห็นชอบ says 'I agree'.",
    },
    why: {
      th: [
        "เพราะคำกริยาแต่ละคำยืนยันคนละอย่าง การดูกรรมและผลที่ตามมาจึงแยกคำได้",
        "‘รับทราบหนังสือแจ้งวันประชุม’ ยังไม่แปลว่ายอมเปลี่ยนกำหนดการ ต้องมีการอนุมัติก่อนจึงใช้คำว่าเห็นชอบได้",
        "คำที่เสียงหรือรูปใกล้กันอย่าง ‘ผัด’ กับ ‘ผลัด’ ต้องเทียบกับสิ่งที่มันทำ: ผัดวันคือเลื่อน ส่วนผลัดเวรคือสับเปลี่ยนคน",
      ],
      en: [
        "Each verb asserts something different, so the object and the consequence tell them apart.",
        "'Acknowledging a meeting notice' doesn't approve a change of date — approval language needs an actual approval.",
        "Look-alikes like ผัด and ผลัด split by what they act on: ผัดวัน postpones a date, ผลัดเวร rotates shifts.",
      ],
    },
    hook: {
      th: "จำคู่ ‘รับทราบ ≠ เห็นชอบ’ ไว้: รู้แล้วไม่ได้แปลว่าตกลง — ถามตัวเองว่า ‘แค่รู้ หรือยอมรับแล้ว’",
      en: "Remember: รับทราบ ≠ เห็นชอบ — knowing is not agreeing. Ask yourself: 'just aware, or actually agreed?'",
    },
  },
  "thai-exp-lesson-connectors": {
    simple: {
      th: "คำเชื่อมคือป้ายบอกทางของประโยค — บอกว่าประโยคหลังเป็น ‘สาเหตุ ผล เป้าหมาย หรือเงื่อนไข’ ของประโยคหน้า",
      en: "A connector is a road sign between clauses — it says whether the next clause is a cause, a result, a purpose, or a condition.",
    },
    why: {
      th: [
        "เพราะต้องอ่านสองส่วนก่อนเลือกคำเชื่อม การถามว่า ‘ส่วนหลังอธิบายอะไร’ จึงเลือกถูก",
        "‘เนื่องจาก’ นำสาเหตุ ส่วน ‘ดังนั้น’ นำผลหรือข้อสรุป — สลับกันไม่ได้",
        "‘เพื่อให้’ บอกแค่วัตถุประสงค์ ยังไม่ยืนยันว่าผลนั้นเกิดขึ้นจริง",
      ],
      en: [
        "You must read both clauses before choosing, so ask 'what does the second clause explain?'",
        "เนื่องจาก introduces a cause; ดังนั้น introduces a result or conclusion — they can't swap jobs.",
        "เพื่อให้ states only a purpose; it doesn't prove the result really happened.",
      ],
    },
    hook: {
      th: "จำสูตร ‘เนื่องจาก = เพราะ’ กับ ‘ดังนั้น = เลยต้อง’ ไว้: ระบบขัดข้อง ‘ดังนั้น’ จึงต้องขอไฟล์ใหม่",
      en: "Remember: เนื่องจาก = 'because', ดังนั้น = 'so'. The system failed, ดังนั้น we must request a new file.",
    },
  },
  "english-exp-lesson-timeline": {
    simple: {
      th: "Present perfect คือการเล่าเรื่องอดีตที่ ‘ยังโยงมาถึงตอนนี้’ — ใช้ have/has + กริยาช่อง 3",
      en: "The present perfect tells a past story that 'still reaches into now' — have/has + past participle.",
    },
    why: {
      th: [
        "เพราะ present perfect เชื่อมอดีตกับปัจจุบัน ‘She has worked here since May’ จึงแปลว่ายังทำอยู่",
        "‘She worked here in May’ ใช้ past simple เพราะพฤษภาคมจบไปแล้ว ไม่ยืนยันว่ายังทำอยู่",
        "since บอกจุดเริ่มต้น (since May) ส่วน for บอกระยะเวลา (for two years)",
      ],
      en: [
        "The present perfect links past to present, so 'She has worked here since May' means she still works there.",
        "'She worked here in May' uses past simple because May is finished — it says nothing about now.",
        "Since marks a starting point; for marks a duration.",
      ],
    },
    hook: {
      th: "จำ since May กับ in May ไว้: since คือ ‘ตั้งแต่พฤษภา (ถึงตอนนี้)’ ส่วน in คือ ‘ในเดือนพฤษภา (จบแล้ว)’",
      en: "Remember since May vs in May: since means 'from May until now', in means 'inside May, finished'.",
    },
  },
  "english-exp-lesson-passive": {
    simple: {
      th: "Passive คือการย้าย ‘สิ่งที่ถูกกระทำ’ มาขึ้นต้นประโยค — ใช้ be + กริยาช่อง 3 และเวลาเดิมไม่เปลี่ยน",
      en: "The passive moves 'the thing acted on' to the front — be + past participle, with the same time as before.",
    },
    why: {
      th: [
        "เพราะ passive เน้นสิ่งที่เกิดขึ้นมากกว่าคนทำ ‘The messages were sent’ จึงเหมาะเมื่อคนทำไม่สำคัญ",
        "be ต้องตรงกับประธานใหม่และเวลา: messages เป็นพหูพจน์ในอดีตจึงใช้ were",
        "หลัง be ต้องเป็นกริยาช่อง 3 เท่านั้น: was sent ถูก แต่ was send ผิด",
      ],
      en: [
        "The passive foregrounds what happened, not who did it — 'The messages were sent' fits when the actor doesn't matter.",
        "Be must match the new subject and time: plural messages in the past take were.",
        "After be comes only the past participle: was sent is right, was send is wrong.",
      ],
    },
    hook: {
      th: "จำ ‘The messages were sent yesterday’ ไว้: ข้อความถูกส่ง — ถามว่า ‘ใครเป็นประธานใหม่’ แล้วเลือก be ให้ตรง",
      en: "Remember 'The messages were sent yesterday': ask 'who is the new subject?' then match be to it.",
    },
  },
  "english-exp-lesson-read-inference": {
    simple: {
      th: "การอนุมานคือการถามว่า ‘ข้อความนี้พิสูจน์ได้แค่ไหน’ — suggests แค่บอกแนวโน้ม แต่ proves ต้องการหลักฐานแน่นกว่ามาก",
      en: "Inference asks 'how much does this really prove?' — suggests only hints at a trend, but proves needs far stronger evidence.",
    },
    why: {
      th: [
        "เพราะ suggests เปิดช่องให้คำอธิบายอื่น ส่วน proves ปิดช่องนั้น คำสองคำนี้จึงแรงไม่เท่ากัน",
        "เวลารอลดลงหลังติดป้ายใหม่ ‘และ’ เพิ่มพนักงานพร้อมกัน ข้อมูลไม่ได้แยกผลของป้ายออกจากพนักงาน",
        "คำแรงอย่าง all, never, only, guaranteed ต้องมีหลักฐานครอบคลุมจริง ไม่ใช่ข้อมูลวันเดียวหรือที่เดียว",
      ],
      en: [
        "Suggests leaves room for other explanations; proves closes that room — the two words carry different weight.",
        "Waiting time fell after a new sign AND more staff arrived together, so the data can't separate the sign's effect.",
        "Strong words like all, never, only and guaranteed need evidence that truly covers everything — not one day or one site.",
      ],
    },
    hook: {
      th: "จำป้ายกับพนักงานไว้: สองอย่างเปลี่ยนพร้อมกัน ห้ามสรุปว่าอย่างใดอย่างหนึ่งเป็นสาเหตุ — ต้องแยกตัวแปรก่อน",
      en: "Remember the sign and the staff: when two things change together, never blame just one — separate the variables first.",
    },
  },
  "saraban-guide-priority": {
    simple: {
      th: "ชั้นความเร็วคือป้ายบอกว่า ‘หนังสือฉบับนี้ต้องทำเร็วแค่ไหน’ — มี 4 ระดับ และแต่ละระดับสั่งงานต่างกัน",
      en: "An urgency marking is a label saying 'how fast must this letter move?' — four levels, each ordering a different speed.",
    },
    why: {
      th: [
        "เพราะระเบียบข้อ 28 แยกถ้อยคำไว้ชัด: ด่วนที่สุดคือเริ่มทันที ด่วนมากคือโดยเร็ว ด่วนคือเร็วกว่าปกติเท่าที่ทำได้",
        "ด่วนภายในต่างจากเพื่อน เพราะมันบอก ‘วันและเวลาที่หนังสือต้องถึงผู้รับ’ ไม่ใช่แค่ความเร็ว",
        "ชั้นความเร็วเป็นคนละเรื่องกับชั้นความลับ — อย่าปนกัน",
      ],
      en: [
        "Clause 28 separates the wording precisely: ด่วนที่สุด means act immediately, ด่วนมาก promptly, ด่วน faster than normal as far as feasible.",
        "ด่วนภายใน is different: it names the exact date and time the letter must reach the addressee.",
        "Urgency and secrecy are separate markings — never mix them.",
      ],
    },
    hook: {
      th: "จำบันได 4 ขั้นไว้: ทันที → โดยเร็ว → เร็วกว่าปกติ → ถึงภายในวันเวลาที่กำหนด — ถ้ามีวันเวลาชัดเจน ตอบด่วนภายในเสมอ",
      en: "Remember the four-rung ladder: immediately → promptly → faster than normal → by a named date and time. A specific deadline always means ด่วนภายใน.",
    },
  },
  "saraban-guide-electronic": {
    simple: {
      th: "สารบรรณอิเล็กทรอนิกส์คือการส่งหนังสือผ่านระบบทางการแทนกระดาษ — หลักคือ ‘ใช้ระบบเป็นหลัก เก็บไว้ตลอดไป สำรองอีกชุด’",
      en: "Electronic records mean sending letters through the official system instead of paper — the rule is 'system first, keep forever, back up separately'.",
    },
    why: {
      th: [
        "เพราะข้อ 29 ให้ใช้ระบบอิเล็กทรอนิกส์เป็นหลัก หนังสือจึงเดินทางผ่านช่องทางกลางของหน่วยงาน ไม่ใช่แชตส่วนตัว",
        "เวลารับ-ส่งใช้เวลาจากระบบ ถ้าส่งไม่สำเร็จให้ใช้เวลาส่งครั้งแรกเป็นหลักฐาน",
        "หนังสืออิเล็กทรอนิกส์ปกติเก็บตลอดไป ต่างจากกระดาษที่มีกำหนดอายุตามข้อ 57",
      ],
      en: [
        "Clause 29 makes the electronic system the default, so letters travel through the agency's central channel — never personal chat.",
        "Receipt and dispatch times come from the system; a failed send keeps the first attempt's timestamp as evidence.",
        "Electronic letters are normally kept indefinitely, unlike paper, which follows clause 57 retention periods.",
      ],
    },
    hook: {
      th: "จำ ‘89/1 ถึง 89/5’ ไว้: ช่องทางกลาง → รับส่ง → เวลา → สำรอง → เก็บตลอดไป — หนังสืออิเล็กทรอนิกส์ไม่มีวันหมดอายุเอง",
      en: "Remember clauses 89/1 to 89/5: central channel → processing → timestamps → backup → keep forever. An electronic letter never expires on its own.",
    },
  },
  "saraban-guide-police-submission": {
    simple: {
      th: "เรื่องเสนอผู้บังคับบัญชาคือจดหมาย 5 ตอน: ‘เรื่องเดิม ข้อเท็จจริง ระเบียบ ข้อพิจารณา ข้อเสนอ’ — เรียงแบบนี้เสมอ",
      en: "A decision brief is a five-part letter: background, facts, rules, analysis, proposal — always in that order.",
    },
    why: {
      th: [
        "เพราะผู้บังคับบัญชาต้องตัดสินใจเร็ว การแยก 5 ส่วนจึงทำให้อ่านแล้วรู้ทันทีว่าขออะไร",
        "ข้อเท็จจริงคือ ‘สิ่งที่พบ’ ส่วนข้อพิจารณาคือ ‘การชั่งน้ำหนัก’ — ใส่ความเห็นในช่องข้อเท็จจริงทำให้แยกหลักฐานยาก",
        "ข้อเสนอต้องบอกชัดว่าต้องการให้อนุมัติ สั่งการ หรือดำเนินการอย่างไร และต้องเชื่อมกับข้อพิจารณา",
      ],
      en: [
        "A superior must decide fast, so five separate parts show at a glance what is being asked.",
        "Facts are 'what was found'; analysis is 'weighing it up' — opinions in the facts section blur the evidence.",
        "The proposal must state plainly whether approval, direction or action is sought, and link back to the analysis.",
      ],
    },
    hook: {
      th: "จำ 5 ตอนด้วยนิ้วมือ: เดิม-จริง-ระเบียบ-คิด-เสนอ — ถ้าเล่าทางเลือกสองทางพร้อมข้อดีข้อเสีย นั่นคือข้อพิจารณา",
      en: "Count the five parts on your fingers: background, facts, rules, analysis, proposal — weighing two options with pros and cons is always the analysis.",
    },
  },
  "law-guide-civil-validity": {
    simple: {
      th: "นิติกรรมคือการกระทำที่ตั้งใจให้เกิดผลทางกฎหมาย — ถ้าผิดตรงไหน ผลจะออกมา 2 แบบ: ‘โมฆะ’ (เสียตั้งแต่เกิด) หรือ ‘โมฆียะ’ (บอกล้างได้)",
      en: "A juristic act is an act meant to create a legal effect — when something is wrong, the result is either void (dead from birth) or voidable (can be cancelled).",
    },
    why: {
      th: [
        "เพราะมาตรา 149 ต้องการ ‘เจตนาโดยสมัครใจ’ การแสดงเจตนาที่ไม่ได้สมัครใจจึงมีปัญหาตั้งแต่ต้น",
        "วัตถุประสงค์ต้องห้าม (มาตรา 150) กับขาดแบบที่กฎหมายบังคับ (มาตรา 152) ทำให้เป็นโมฆะทันที",
        "ถูกหลอกจนยอมทำนิติกรรม (มาตรา 159) เป็นโมฆียะ — ใช้ได้จนกว่าจะบอกล้าง",
      ],
      en: [
        "Section 149 needs a voluntary intention, so an involuntary declaration is defective from the start.",
        "A prohibited purpose (section 150) or a missing mandatory form (section 152) makes the act void at once.",
        "Being tricked into the act (section 159) makes it voidable — valid until someone avoids it.",
      ],
    },
    hook: {
      th: "จำ 150-152-159 ไว้: 150 วัตถุประสงค์ต้องห้าม = โมฆะ, 152 ขาดแบบ = โมฆะ, 159 ถูกหลอก = โมฆียะ",
      en: "Remember 150-152-159: 150 forbidden purpose = void, 152 missing form = void, 159 fraud = voidable.",
    },
  },
  "law-guide-criminal-foundations": {
    simple: {
      th: "ก่อนลงโทษใครทางอาญา ต้องถาม 3 ข้อ: ‘มีกฎหมายห้ามตอนนั้นไหม เขาตั้งใจหรือประมาท และเขาอายุเท่าไร’",
      en: "Before punishing anyone criminally, ask three questions: 'was there a law against it then, did they mean it or were they careless, and how old were they?'",
    },
    why: {
      th: [
        "เพราะมาตรา 2 ต้องการกฎหมายที่กำหนดความผิดและโทษ ‘ขณะกระทำ’ การกระทำก่อนมีกฎหมายจึงลงโทษไม่ได้",
        "เจตนาคือรู้และประสงค์ต่อผล ส่วนประมาทคือขาดความระมัดระวัง — และประมาทรับโทษได้เฉพาะเมื่อกฎหมายบัญญัติไว้",
        "อายุไม่เกิน 12 ปี (มาตรา 73) กับกว่า 12 ถึง 15 ปี (มาตรา 74) ไม่ต้องรับโทษอาญา แต่กลไกที่ศาลใช้ต่างกัน",
      ],
      en: [
        "Section 2 needs a law defining the offence and penalty 'at the time of the act' — conduct before the law existed can't be punished.",
        "Intention means knowing and wanting the result; negligence means careless — and negligence is punishable only where the law says so.",
        "Ages up to 12 (section 73) and over 12 to 15 (section 74) escape criminal punishment, but the court uses different measures for each.",
      ],
    },
    hook: {
      th: "จำเลข 2-59-73-74 ไว้: 2 ไม่มีกฎหมายไม่มีโทษ, 59 เจตนากับประมาท, 73 ไม่เกิน 12, 74 สิบสองถึงสิบห้า",
      en: "Remember 2-59-73-74: 2 no law, no punishment; 59 intention and negligence; 73 up to 12; 74 twelve to fifteen.",
    },
  },
  "law-guide-privacy-basis": {
    simple: {
      th: "ข้อมูลส่วนบุคคลคือข้อมูลที่ ‘ชี้ตัวคนได้’ — ก่อนเก็บต้องถามว่า ‘เก็บทำไม ฐานกฎหมายอะไร บอกเจ้าของข้อมูลหรือยัง’",
      en: "Personal data is any information that 'can identify a person' — before collecting it, ask 'why, on what legal basis, and have we told the person?'",
    },
    why: {
      th: [
        "เพราะมาตรา 21 ผูกการใช้ไว้กับวัตถุประสงค์ที่แจ้ง การใช้ต่างวัตถุประสงค์จึงต้องเข้าข้อยกเว้น",
        "มาตรา 22 ให้เก็บเท่าที่จำเป็น — แบบจองคิวไม่ควรถามข้อมูลครอบครัวที่ไม่เกี่ยวกับการจอง",
        "ข้อมูลอ่อนไหวอย่างสุขภาพหรือประวัติอาชญากรรมอยู่มาตรา 26 โดยหลักต้องมีความยินยอมโดยชัดแจ้ง",
      ],
      en: [
        "Section 21 ties use to the disclosed purpose, so a different purpose needs an exception.",
        "Section 22 allows only necessary data — a booking form shouldn't ask for unrelated family details.",
        "Sensitive data like health or criminal history falls under section 26 and generally needs explicit consent.",
      ],
    },
    hook: {
      th: "จำ 21-22-23-24-26 ไว้: 21 ตามวัตถุประสงค์, 22 เท่าที่จำเป็น, 23 แจ้งก่อนเก็บ, 24 ฐานกฎหมาย, 26 ข้อมูลอ่อนไหว",
      en: "Remember 21-22-23-24-26: 21 purpose, 22 necessity, 23 notice, 24 lawful basis, 26 sensitive data.",
    },
  },
};
