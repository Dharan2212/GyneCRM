// ── COLORS ────────────────────────────────────────────────────────────────
export const C = {
  m:"#7B1F3A", mB:"#A63252", mL:"#F4E0E6", mP:"#FDF5F7",
  t:"#1A6B6B", tL:"#D4EEEE", tP:"#F0FAFA",
  p:"#6B35A0", pL:"#EDE0F8", pP:"#F9F5FE",
  s:"#D4720A", sL:"#FDE8D0",
  g:"#B8940A", gL:"#FBF3D8",
  k:"#1A1828", kB:"#42405A", kS:"#8A87A0",
  bd:"#E6E1F0", bg:"#F6F4FB", w:"#FFFFFF",
  ok:"#2A7A50", okL:"#D0EEE0",
  wn:"#C47008", wnL:"#FEF0D0",
  er:"#B83020", erL:"#FAE0DC",
}

// ── CATEGORY MAP ──────────────────────────────────────────────────────────
export const CAT = {
  Pregnancy:   { c:C.t, l:C.tL, p:C.tP, label:"Pregnancy",   icon:"[P]", grad:`linear-gradient(135deg,${C.t},#145858)` },
  Infertility: { c:C.p, l:C.pL, p:C.pP, label:"IVF",         icon:"[I]", grad:`linear-gradient(135deg,${C.p},#4A1A7A)` },
  Gynac:       { c:C.m, l:C.mL, p:C.mP, label:"Gynac",        icon:"[G]", grad:`linear-gradient(135deg,${C.m},${C.mB})` },
}

export const IVF_STAGES = ["Pre-workup","Stimulation","Monitoring","Egg Retrieval","Fertilization","Embryo Culture","Transfer","Two-Week Wait","Result"]

// ── DATE ENGINE ───────────────────────────────────────────────────────────
export const addDays = (s, n) => { const d = new Date(s); d.setDate(d.getDate() + n); return d }
export const fmt = d => d.toLocaleDateString("en-IN", { day:"2-digit", month:"short", year:"numeric" })

export function calcPreg(lmp) {
  const base = new Date(lmp), edd = addDays(lmp, 280), today = new Date()
  const days = Math.max(0, Math.floor((today - base) / 86400000))
  const wks = Math.floor(days / 7), dr = days % 7
  const ms = [8,12,16,20,24,28,32,36,38,40].map(w => {
    const d = addDays(lmp, w * 7)
    return { w, date: fmt(d), past: d < today }
  })
  return { edd: fmt(edd), wks, dr, ms }
}

export function calcIVF(s) {
  return [
    {d:1,  t:"Baseline Scan + Start Stimulation"},
    {d:3,  t:"Day 3 Monitoring + E2"},
    {d:6,  t:"Day 6 Follicle Monitoring"},
    {d:8,  t:"Day 8 Follicle Check + E2"},
    {d:11, t:"Trigger Injection"},
    {d:13, t:"Egg Retrieval (OPU)"},
    {d:14, t:"Fertilization Report"},
    {d:18, t:"Blastocyst Transfer"},
    {d:26, t:"Progesterone + E2 Check"},
    {d:33, t:"Beta hCG - RESULT"},
  ].map(x => { const dt = addDays(s, x.d - 1); return { ...x, date: fmt(dt), past: dt < new Date() } })
}

export function calcGynac(s) {
  return [
    {off:0,   t:"Initial Consultation + Examination"},
    {off:14,  t:"Report Review + Diagnosis"},
    {off:30,  t:"1-Month Follow-up"},
    {off:90,  t:"3-Month Scan + Assessment"},
    {off:180, t:"6-Month Follow-up + Pap Smear"},
    {off:365, t:"Annual Well-Woman Check"},
  ].map(x => { const dt = addDays(s, x.off); return { ...x, date: fmt(dt), past: dt < new Date() } })
}

// ── INITIAL PATIENTS ──────────────────────────────────────────────────────
export const INIT_PATIENTS = [
  {
    id:"JH-0060", name:"Meera Joshi", age:27, phone:"9812345670",
    status:"new", cat:null, firstVisitDate:"2026-03-11", regDate:"2026-03-11",
    chiefComplaint:"Missed period 6 weeks. Irregular cycles since 3 months.",
    av:"MJ", avI:3, tests:[], consultations:[],
  },
  {
    id:"JH-0041", name:"Anita Patil", age:28, blood:"O+", phone:"9876543210",
    status:"active", cat:"Pregnancy", lmp:"2025-12-11", gpa:"G2 P0 A1", highRisk:false,
    firstVisitDate:"2025-12-18", pregnancyDates:calcPreg("2025-12-11"),
    av:"AP", avI:0,
    tests:[
      {id:"T001", name:"CBC + HbA1c", orderedDate:"2026-02-11", status:"reviewed",
       result:"Hb 11.4 g/dL. WBC normal.", file:"cbc.pdf", sentToPatient:true, doctorNotes:"Iron low - increased dose."},
      {id:"T002", name:"NT Scan + Double Marker", orderedDate:"2026-03-08", dueDate:"2026-03-15",
       status:"ordered", result:"", file:"", sentToPatient:false, doctorNotes:""},
    ],
    consultations:[
      {date:"2026-02-11", bp:"112/72", weight:60, fhr:148,
       notes:"Early pregnancy confirmed. FHR 148 bpm. Started supplements.",
       rx:["Folic Acid 5mg OD","Ferrous Sulphate BD","Progesterone 200mg HS"]},
    ],
  },
  {
    id:"JH-0038", name:"Kavita Rao", age:32, blood:"A+", phone:"9765432101",
    status:"active", cat:"Pregnancy", lmp:"2025-10-15", gpa:"G1 P0 A0", highRisk:false,
    firstVisitDate:"2025-10-20", pregnancyDates:calcPreg("2025-10-15"),
    av:"KR", avI:1,
    tests:[
      {id:"T005", name:"Anomaly Scan", orderedDate:"2026-02-10",
       status:"sent-to-patient", result:"Normal fetal anatomy. BPD 48mm.",
       file:"anomaly.pdf", sentToPatient:true, doctorNotes:"All clear."},
    ],
    consultations:[
      {date:"2026-02-12", bp:"118/76", weight:66, fhr:152,
       notes:"Anomaly scan normal. GTT at week 28.", rx:["Folic Acid OD","Iron BD","Calcium BD"]},
    ],
  },
  {
    id:"JH-0035", name:"Sunita Desai", age:35, blood:"B+", phone:"9543210987",
    status:"active", cat:"Pregnancy", lmp:"2025-07-04", gpa:"G3 P1 A1", highRisk:true,
    firstVisitDate:"2025-07-10", pregnancyDates:calcPreg("2025-07-04"),
    av:"SD", avI:2,
    tests:[
      {id:"T006", name:"NST + BPP", orderedDate:"2026-03-08", dueDate:"2026-03-11",
       status:"uploaded", urgency:"Urgent", result:"NST reactive. BPP 8/8. AFI 12cm.",
       file:"nst.pdf", sentToPatient:false, doctorNotes:""},
    ],
    consultations:[
      {date:"2026-03-08", bp:"150/95", weight:78, fhr:144,
       notes:"BP elevated. Gestational hypertension. NST every 3 days.",
       rx:["Labetalol 100mg BD","Folic Acid OD"]},
    ],
  },
  {
    id:"JH-0052", name:"Priya Kulkarni", age:31, blood:"B+", phone:"9712345678",
    status:"active", cat:"Infertility", ivfCycleStart:"2026-03-01", ivfCycleNum:2,
    ivfStage:"Stimulation", amh:2.1, afc:14, firstVisitDate:"2026-02-01",
    ivfDates:calcIVF("2026-03-01"), av:"PK", avI:3,
    tests:[
      {id:"T008", name:"Day 2 Hormone Panel", orderedDate:"2026-03-01",
       status:"sent-to-patient", result:"FSH 6.2. LH 4.1. AMH 2.1. AFC 14.",
       file:"hormones.pdf", sentToPatient:true, doctorNotes:"Good reserve. Standard protocol."},
      {id:"T009", name:"Day 8 Follicle Scan", orderedDate:"2026-03-08",
       status:"uploaded", result:"R: 18,16,15mm. L: 17,15,14mm. E2: 1840 pg/mL.",
       file:"scan_d8.pdf", sentToPatient:false, doctorNotes:""},
    ],
    consultations:[
      {date:"2026-02-01", bp:"118/74", weight:64,
       notes:"IVF workup complete. AMH 2.1 - good reserve. Cycle 2 planned.",
       rx:["Folic Acid 5mg OD","Vitamin D3 weekly"]},
    ],
  },
  {
    id:"JH-0048", name:"Rekha Naik", age:38, blood:"O-", phone:"9843210987",
    status:"active", cat:"Gynac", complaint:"Uterine Fibroid 4.2cm", gpa:"G2 P1 A0",
    firstVisitDate:"2026-01-15", gynacDates:calcGynac("2026-01-15"),
    av:"RN", avI:0,
    tests:[
      {id:"T011", name:"Pelvic Ultrasound (TVS)", orderedDate:"2026-01-15",
       status:"sent-to-patient", result:"Intramural fibroid 4.2x3.8cm. No adnexal mass.",
       file:"tvs.pdf", sentToPatient:true, doctorNotes:"Medical management. Repeat scan April."},
      {id:"T012", name:"CA-125 + CBC", orderedDate:"2026-01-15", dueDate:"2026-01-20",
       status:"ordered", result:"", file:"", sentToPatient:false, doctorNotes:""},
    ],
    consultations:[
      {date:"2026-01-15", bp:"124/80", weight:70,
       notes:"Symptomatic fibroid. Medical management started.",
       rx:["Tranexamic Acid 500mg TDS","Norethisterone 5mg BD","Iron BD"]},
    ],
  },
  {
    id:"JH-0055", name:"Meena Joshi", age:29, blood:"O+", phone:"9823456789",
    status:"active", cat:"Infertility", ivfCycleStart:"2026-02-20", ivfCycleNum:1,
    ivfStage:"Egg Retrieval", amh:1.4, afc:9, firstVisitDate:"2026-02-10",
    ivfDates:calcIVF("2026-02-20"), av:"MJ2", avI:1,
    tests:[
      {id:"T010", name:"HSG - Tubal Patency", orderedDate:"2026-02-10",
       status:"reviewed", result:"Right tube patent. Left tube blocked.",
       file:"hsg.pdf", sentToPatient:true, doctorNotes:"Left tubal block - IVF indicated."},
    ],
    consultations:[
      {date:"2026-02-10", bp:"116/72", weight:61,
       notes:"Primary infertility 3 years. Left tubal block on HSG. IVF recommended.",
       rx:["Folic Acid 5mg OD","Vitamin D3 weekly"]},
    ],
  },
]

// ── WORKFLOWS ─────────────────────────────────────────────────────────────
export const WORKFLOWS = [
  {cat:"All",        name:"Appointment Confirmation",    desc:"Auto WhatsApp on booking",               on:true,  sent:147},
  {cat:"All",        name:"24-Hour Reminder",            desc:"Day before appointment",                  on:true,  sent:134},
  {cat:"All",        name:"2-Hour Final Reminder",       desc:"2 hours before slot",                     on:true,  sent:128},
  {cat:"Pregnancy",  name:"Pregnancy Milestones",        desc:"Weeks 8,12,20,28,36 from LMP",            on:true,  sent:87},
  {cat:"Infertility",name:"IVF Cycle Day Alerts",        desc:"Per-day stimulation alerts",              on:true,  sent:42},
  {cat:"Gynac",      name:"Gynac 6-Month Recall",        desc:"Auto at 6-month follow-up date",          on:true,  sent:18},
  {cat:"All",        name:"Missed Appointment Recovery", desc:"2h after no-show - reschedule nudge",     on:true,  sent:9},
  {cat:"All",        name:"Test / Scan Reminder",        desc:"3 days before test + prep instructions",  on:true,  sent:56},
  {cat:"All",        name:"Bill Payment Reminder",       desc:"Pending bills after 3 days",              on:false, sent:14},
  {cat:"Infertility",name:"IVF Result Day Support",      desc:"Beta hCG day emotional support",          on:true,  sent:6},
  {cat:"Pregnancy",  name:"Weekly Pregnancy Tips",       desc:"Week-specific tips every Monday 8 AM",    on:true,  sent:312},
  {cat:"All",        name:"Post-Consultation Follow-up", desc:"2 days before follow-up date",            on:true,  sent:43},
  {cat:"All",        name:"Test Report Notification",    desc:"WhatsApp when report sent to patient",    on:true,  sent:38},
]
