import { esc, icon } from "./views.mjs";
import { EXAM_SOURCE } from "./core.mjs";

const dimensions = [
  ["บุคลิกภาพ", "Composure and presentation"],
  ["การสื่อสารและควบคุมอารมณ์", "Communication and self-control"],
  ["คุณธรรมและจริยธรรม", "Integrity and ethics"],
  ["ปฏิภาณและไหวพริบ", "Judgment and initiative"],
  ["ทัศนคติต่ออาชีพตำรวจ", "Attitude to policing"],
];

// Original interview exercises mapped to Annex ฉ, part 3.
const cases = [
  [0, "แนะนำตัวในหนึ่งนาที ให้เห็นว่าประสบการณ์ของคุณเชื่อมกับงานอำนวยการอย่างไร",
    "Introduce yourself in one minute and connect your experience to administrative support.",
    "บอกจุดแข็งหนึ่งอย่าง ยกเหตุการณ์จริงที่ใช้จุดแข็งนั้น แล้วเชื่อมกับงานเอกสารหรือบริการประชาชน",
    "Name one strength, give a real example of using it, then connect it to records or public service.",
    "ผลลัพธ์ที่ตรวจสอบได้คืออะไร", "What result could someone verify?"],
  [0, "เล่าครั้งหนึ่งที่คุณได้รับคำแนะนำตรงไปตรงมาและนำไปปรับวิธีทำงาน",
    "Describe a time you received direct feedback and changed how you work.",
    "บอกคำแนะนำที่ได้ วิธีที่คุณทดลองปรับ และสิ่งที่เปลี่ยนไป ใช้ตัวอย่างที่เป็นจริง",
    "Explain the feedback, the change you tried and what improved. Use a real example.",
    "ถ้าได้รับคำแนะนำแบบเดียวกันอีก คุณจะทำอะไรต่างออกไป", "What would you do differently next time?"],
  [1, "ผู้มาติดต่อรอนานและเริ่มหงุดหงิด คุณจะคุยอย่างไร",
    "A visitor has waited a long time and is frustrated. How would you speak with them?",
    "รับฟังและยอมรับความไม่สะดวก ตรวจคิว ให้ข้อมูลที่ยืนยันได้ และบอกว่าจะแจ้งความคืบหน้าเมื่อไร",
    "Acknowledge the inconvenience, check the queue, share verified information and give a realistic update time.",
    "ถ้ายังยืนยันเวลาที่แน่นอนไม่ได้ คุณจะใช้คำพูดว่าอย่างไร", "What would you say if you cannot give an exact time?"],
  [1, "คุณต้องแจ้งว่าคำขอขาดเอกสารหนึ่งฉบับ โดยผู้ยื่นมาจากต่างจังหวัด",
    "A visitor travelled from another province and is missing one document. What would you say?",
    "อธิบายว่าเอกสารใดขาด ตรวจช่องทางที่ใช้ส่งเพิ่มเติมได้ แล้วสรุปขั้นตอนให้ชัดเจน",
    "Identify the missing document, check whether there is an approved way to provide it and summarise the next steps.",
    "คุณจะตรวจอย่างไรว่าผู้ยื่นเข้าใจขั้นตอนถัดไป", "How would you check that the visitor understands the next step?"],
  [1, "เพื่อนร่วมงานกับคุณให้ข้อมูลผู้มาติดต่อไม่ตรงกันในเรื่องเดียวกัน",
    "You and a colleague gave a visitor different instructions for the same procedure.",
    "ตรวจคู่มือหรือสอบถามผู้รับผิดชอบ ยืนยันข้อมูลให้ตรงกัน แล้วแจ้งขั้นตอนที่ถูกต้องกับผู้มาติดต่อ",
    "Check the guidance with the process owner, agree on the verified information and update the visitor.",
    "คุณจะช่วยลดโอกาสที่เกิดข้อมูลไม่ตรงกันอีกได้อย่างไร", "How could you stop the inconsistency from recurring?"],
  [2, "คนรู้จักขอให้คุณเร่งคิวของเขาโดยใช้ความสนิทส่วนตัว",
    "An acquaintance asks you to move their request ahead through your personal relationship.",
    "ใช้เกณฑ์คิวเดียวกับทุกคน อธิบายช่องทางเร่งด่วนที่ประกาศไว้หากมี และตรวจสอบตามขั้นตอนของหน่วยงาน",
    "Apply the same queue rules to everyone, explain any published priority route and follow the office procedure.",
    "คุณจะแยกกรณีเร่งด่วนจริงออกจากความสนิทส่วนตัวอย่างไร", "How would you distinguish a genuine urgent case from a personal favour?"],
  [2, "พบรายการข้อมูลส่วนบุคคลแนบมากับไฟล์ที่กำลังจะส่งให้คนหลายกลุ่ม",
    "You notice personal information in a file about to go to several distribution lists.",
    "พักการส่ง ตรวจผู้มีสิทธิ์เข้าถึงและวัตถุประสงค์ แล้วปรึกษาผู้รับผิดชอบเพื่อแก้ไฟล์หรือจำกัดผู้รับ",
    "Pause the send, check access and purpose, and work with the responsible person to revise the file or limit recipients.",
    "คุณจะยืนยันได้อย่างไรว่าส่งเฉพาะข้อมูลที่จำเป็น", "How would you confirm that only the necessary information is sent?"],
  [2, "พบข้อผิดพลาดของตัวเองหลังส่งตารางสรุปไปแล้ว",
    "You spot your own mistake after distributing a summary spreadsheet.",
    "แจ้งผู้รับและผู้รับผิดชอบโดยเร็ว ออกฉบับแก้ที่แยกได้ชัด และระบุให้ผู้รับใช้ฉบับใด",
    "Inform the recipients and owner promptly, issue a clearly identifiable replacement and say which version to use.",
    "คุณจะเพิ่มจุดตรวจอะไรในครั้งต่อไป", "What check would you add next time?"],
  [3, "มีงานสามรายการเข้ามาพร้อมกัน คุณต้องจัดลำดับโดยแต่ละงานมีเส้นตายและผลกระทบต่างกัน",
    "Three tasks arrive together with different deadlines and consequences. How do you prioritise?",
    "ตรวจเส้นตาย ผลกระทบ และงานที่ต้องทำก่อน แจ้งลำดับกับผู้เกี่ยวข้องและขอความช่วยเหลือเมื่อจำเป็น",
    "Check deadlines, impact and dependencies. Share your priority order and ask for help when needed.",
    "ถ้าวันส่งงานเลื่อนขึ้นหนึ่งวัน คุณจะปรับอย่างไร", "What would you change if a deadline moved one day earlier?"],
  [3, "ระบบรับเรื่องหยุดทำงานตอนมีคนรอใช้บริการหลายคน",
    "The intake system stops working while several visitors are waiting.",
    "แจ้งเหตุและเวลาที่ทราบ ตรวจขั้นตอนสำรองที่ได้รับอนุญาต บันทึกข้อมูลที่จำเป็น แล้วตรวจการลงทะเบียนย้อนหลัง",
    "Report the issue, share what is known, use an approved fallback and reconcile any temporary records after recovery.",
    "วิธีใดช่วยป้องกันเรื่องตกหล่นระหว่างที่ระบบล่ม", "What would prevent requests from being lost during downtime?"],
  [3, "เจองานที่ทำซ้ำทุกสัปดาห์และมักใช้เวลานาน คุณจะเสนอปรับปรุงอย่างไร",
    "A recurring weekly task takes too long. How would you propose improving it?",
    "วัดเวลาและข้อผิดพลาดของวิธีเดิม เสนอการทดลองขนาดเล็ก ตั้งตัวชี้วัด และขออนุมัติก่อนใช้จริง",
    "Measure time and errors, propose a small pilot, define success and get the appropriate approval.",
    "คุณจะรู้ได้อย่างไรว่าการลดเวลาไม่ได้ลดความถูกต้อง", "How would you verify that time savings preserve accuracy?"],
  [4, "เหตุใดงานอำนวยการจึงสำคัญต่อประชาชน",
    "Why does administrative support matter to the public?",
    "เชื่อมความถูกต้องของเอกสาร การติดตามเรื่อง และการสื่อสารชัดเจนเข้ากับประสบการณ์ของผู้มาติดต่อ",
    "Connect accurate records, traceable workflow and clear communication to the visitor’s experience.",
    "ยกตัวอย่างงานหนึ่งอย่างที่ช่วยลดเวลาหรือความสับสน", "Give one example of work that could save time or reduce confusion."],
  [4, "ถ้าบทบาทแรกของคุณเป็นงานประจำที่ต้องทำซ้ำ คุณจะรักษามาตรฐานอย่างไร",
    "If your first assignment is repetitive office work, how will you maintain standards?",
    "ใช้รายการตรวจ ทบทวนข้อผิดพลาดและแบ่งช่วงงานอย่างเหมาะสม ให้ความสำคัญกับความถูกต้องในทุกครั้ง",
    "Use a checklist, review patterns in errors and organise work into sensible batches while protecting accuracy.",
    "คุณจะขอคำแนะนำหรือเรียนรู้เพิ่มเติมจากใคร", "Whom would you ask for coaching or additional training?"],
  [4, "คุณจะทำอย่างไรเมื่อได้รับงานที่ยังใช้โปรแกรมหรือระบบที่คุณไม่ถนัด",
    "How would you approach a task using a system you do not yet know well?",
    "ศึกษาคู่มือและฝึกด้วยข้อมูลตัวอย่าง ขอให้ผู้รับผิดชอบตรวจงานแรก แล้วบันทึกขั้นตอนที่ได้เรียนรู้",
    "Read the guidance, practise on sample data, ask the owner to review the first output and document what you learn.",
    "คุณจะเลือกเรียนรู้เรื่องใดก่อนและเพราะอะไร", "What would you learn first, and why?"],
];

export function interviewView(ctx) {
  const { t, lang } = ctx;
  const index = lang === "th" ? 0 : 1;
  return `<div class="intro"><p class="eyebrow">${t("ภาคความเหมาะสมกับตำแหน่ง", "Suitability interview")}</p>
    <h1>${t("ซ้อมสัมภาษณ์", "Interview practice")}</h1>
    <p class="lead">${t("ฝึกตอบ 60–90 วินาทีด้วยตัวอย่างจริงของตัวเอง แล้วเปิดดูแนวทบทวน", "Give yourself 60–90 seconds to answer from real experience, then check the reflection guide.")}</p></div>
    <section class="section plan"><h2>${t("วางคำตอบให้ชัด", "Structure your answer")}</h2>
    <p>${t("บอกสถานการณ์และหน้าที่ของคุณ อธิบายว่าคุณทำอะไร และสรุปผลหรือสิ่งที่เรียนรู้", "Describe the situation and your responsibility, explain what you did, and end with the result or what you learned.")}</p></section>
    <section class="section"><div class="section-head"><h2>${t("สถานการณ์ฝึก", "Practice scenarios")}</h2></div>
      ${cases.map(row => `<details class="review-item"><summary><strong>${esc(row[1 + index])}</strong></summary><p class="eyebrow">${esc(dimensions[row[0]][index])}</p>
        <p>${esc(row[3 + index])}</p><p class="subtle">${t("คำถามต่อยอด", "Follow-up")} · ${esc(row[5 + index])}</p></details>`).join("")}
    </section>
    <p class="subtle section">${t("สถานการณ์เหล่านี้ใช้ฝึกเล่าเรื่องตามองค์ประกอบที่ระบุในประกาศ", "These original scenarios practise the selection criteria described in the notice.")} <a class="link" href="${EXAM_SOURCE}" target="_blank" rel="noopener noreferrer">${t("ภาคผนวก ฉ", "Annex ฉ")}</a></p>
    <p class="section"><a class="act ghost" href="#practice">${icon("back")}${t("กลับสนามฝึก", "Back to practice")}</a></p>`;
}
