// Local, zero-dependency symptom triage engine — the fallback used when no
// LLM API key is configured. This is deliberately NOT a machine-learned
// model: it's the same keyword/red-flag approach real clinical triage
// protocols use (Manchester Triage System, Emergency Severity Index) —
// explainable, deterministic, and needs no training data or network call.
//
// Shape of the output matches `PreVisitSummarySchema` in llm.ts exactly, so
// callers can't tell which engine produced it without checking `aiSource`.

export type Urgency = "Low" | "Medium" | "High";

export type TriageResult = {
  urgency: Urgency;
  chiefComplaint: string;
  suggestedQuestions: string[];
};

type SymptomRule = {
  id: string;
  label: string; // fragment used to build the chief complaint, e.g. "chest pain"
  // Each entry is either a single phrase (matches if that phrase is present)
  // or an array of words that must ALL be present somewhere in the text
  // (order-independent) — e.g. ["throat", "swelling"] catches "my throat is
  // swelling up" without needing every possible exact phrasing spelled out.
  keywords: (string | string[])[];
  urgency: Urgency; // baseline urgency when this symptom is present alone
  redFlag?: boolean; // forces overall urgency to High regardless of anything else
  questions: string[];
};

const RULES: SymptomRule[] = [
  // ── Cardiac / circulatory ──────────────────────────────────────────────
  { id: "chest-pain", label: "chest pain", keywords: ["chest pain", "chest pressure", "chest tightness", "pain in my chest"], urgency: "High", redFlag: true,
    questions: ["When did the chest pain start, and does it come and go or stay constant?", "Does the pain spread to your arm, jaw, or back?", "Are you also short of breath, sweating, or nauseated?"] },
  { id: "palpitations", label: "heart palpitations", keywords: ["palpitations", "heart racing", "heart pounding", "irregular heartbeat"], urgency: "Medium",
    questions: ["How long do the episodes last?", "Do they happen at rest or only with activity?", "Have you had any chest pain or dizziness with them?"] },

  // ── Respiratory ─────────────────────────────────────────────────────────
  { id: "cant-breathe", label: "severe difficulty breathing", keywords: ["can't breathe", "cannot breathe", "unable to breathe", "gasping for air"], urgency: "High", redFlag: true,
    questions: ["Did this come on suddenly?", "Is your breathing getting worse right now?", "Do you have chest pain, blue lips, or swelling with it?"] },
  { id: "shortness-of-breath", label: "shortness of breath", keywords: ["shortness of breath", "short of breath", "breathless", "difficulty breathing", "trouble breathing"], urgency: "High",
    questions: ["Does it happen at rest or only on exertion?", "Have you had chest pain, cough, or leg swelling as well?", "Do you have a history of asthma, COPD, or heart disease?"] },
  { id: "wheezing", label: "wheezing", keywords: ["wheezing", "wheeze"], urgency: "Medium",
    questions: ["Do you have a known history of asthma or allergies?", "Have you used an inhaler, and did it help?", "Is it worse at night or with exercise?"] },
  { id: "cough", label: "cough", keywords: ["cough", "coughing"], urgency: "Low",
    questions: ["How long have you had the cough?", "Is it dry or bringing up phlegm — and what color?", "Any fever, chest pain, or shortness of breath with it?"] },

  // ── Neurological ────────────────────────────────────────────────────────
  { id: "stroke-signs", label: "possible stroke symptoms", keywords: ["face drooping", "slurred speech", "one side weak", "one-sided weakness", "can't move one side", "sudden confusion"], urgency: "High", redFlag: true,
    questions: ["When exactly did this start?", "Is the weakness or numbness on one side of the body or face?", "Is anyone with you who can get you to urgent care right away?"] },
  { id: "worst-headache", label: "sudden severe headache", keywords: ["worst headache of my life", "sudden severe headache", "thunderclap headache"], urgency: "High", redFlag: true,
    questions: ["Did this headache start suddenly and reach maximum intensity within seconds to minutes?", "Do you have neck stiffness, vision changes, or vomiting?", "Have you ever had a headache like this before?"] },
  { id: "headache", label: "headache", keywords: ["headache", "migraine", "head pain"], urgency: "Medium",
    questions: ["When did the headache start, and has it changed recently?", "Where exactly is the pain, and how would you rate its severity?", "Are you taking any medication for it currently?"] },
  { id: "dizziness", label: "dizziness", keywords: ["dizziness", "dizzy", "lightheaded", "light-headed", "vertigo"], urgency: "Medium",
    questions: ["Does it feel like the room is spinning, or more like you might faint?", "Is it worse when you stand up quickly?", "Have you had any fainting, chest pain, or palpitations?"] },
  { id: "seizure", label: "seizure activity", keywords: ["seizure", "convulsion", "fit"], urgency: "High", redFlag: true,
    questions: ["How long did the episode last?", "Is this the first seizure, or do you have a known seizure disorder?", "Have you fully returned to your normal alertness now?"] },
  { id: "fainting", label: "fainting or loss of consciousness", keywords: ["fainted", "fainting", "passed out", "lost consciousness", "blacked out"], urgency: "High",
    questions: ["Did you lose consciousness completely, and for how long?", "Did you injure yourself when you fell?", "Any chest pain, palpitations, or warning signs beforehand?"] },
  { id: "numbness", label: "numbness or tingling", keywords: ["numbness", "tingling", "pins and needles"], urgency: "Medium",
    questions: ["Where exactly is the numbness located?", "Did it come on suddenly or gradually?", "Is it affecting one side of your body?"] },

  // ── Gastrointestinal ────────────────────────────────────────────────────
  { id: "abdominal-pain-severe", label: "severe abdominal pain", keywords: ["severe abdominal pain", "worst stomach pain", "unbearable stomach pain"], urgency: "High",
    questions: ["Where exactly is the pain, and does it move anywhere?", "Is the pain constant or does it come in waves?", "Have you had fever, vomiting, or blood in your stool?"] },
  { id: "abdominal-pain", label: "abdominal pain", keywords: ["abdominal pain", "stomach pain", "stomach ache", "belly pain", "tummy pain"], urgency: "Medium",
    questions: ["When did the pain start and where is it located?", "Does anything make it better or worse (eating, movement, pressure)?", "Any nausea, vomiting, fever, or changes in bowel habits?"] },
  { id: "blood-in-stool", label: "blood in stool", keywords: ["blood in my stool", "blood in stool", "bloody stool", "rectal bleeding"], urgency: "High", redFlag: true,
    questions: ["How much blood, and what color is it (bright red or dark/black)?", "How long has this been happening?", "Are you feeling dizzy, weak, or unusually tired?"] },
  { id: "vomiting-blood", label: "vomiting blood", keywords: ["vomiting blood", "throwing up blood", "blood in vomit"], urgency: "High", redFlag: true,
    questions: ["How much blood, and what color was it?", "Do you have abdominal pain or black, tarry stools as well?", "Do you have a history of ulcers or liver disease?"] },
  { id: "nausea-vomiting", label: "nausea and vomiting", keywords: ["nausea", "vomiting", "throwing up", "feel sick"], urgency: "Medium",
    questions: ["How long has this been going on, and how often are you vomiting?", "Are you able to keep any fluids down?", "Any fever, abdominal pain, or recent travel or food that might explain it?"] },
  { id: "diarrhea", label: "diarrhea", keywords: ["diarrhea", "diarrhoea", "loose stools"], urgency: "Low",
    questions: ["How long has this been going on, and how frequent is it?", "Any blood, fever, or signs of dehydration?", "Have you traveled recently or eaten anything unusual?"] },
  { id: "constipation", label: "constipation", keywords: ["constipation", "constipated", "can't pass stool"], urgency: "Low",
    questions: ["How long has it been since your last bowel movement?", "Any abdominal pain, bloating, or vomiting?", "Any recent changes in diet, activity, or medication?"] },

  // ── Fever / infection ───────────────────────────────────────────────────
  { id: "high-fever", label: "high fever", keywords: ["high fever", "very high temperature", "burning up"], urgency: "Medium",
    questions: ["What's the highest temperature you've measured, and when?", "How long has the fever lasted?", "Any rash, stiff neck, confusion, or difficulty breathing with it?"] },
  { id: "fever", label: "fever", keywords: ["fever", "chills", "high temperature"], urgency: "Medium",
    questions: ["When did the fever begin?", "Has the fever changed recently (higher, lower, come and go)?", "Are you taking any medication for it?"] },
  { id: "night-sweats", label: "night sweats", keywords: ["night sweats", "drenching sweats"], urgency: "Low",
    questions: ["How long has this been happening?", "Any unexplained weight loss or fatigue alongside it?", "Any fever or other new symptoms recently?"] },

  // ── Musculoskeletal / injury ────────────────────────────────────────────
  { id: "severe-bleeding", label: "severe bleeding", keywords: ["severe bleeding", "won't stop bleeding", "heavy bleeding", "bleeding a lot"], urgency: "High", redFlag: true,
    questions: ["Where is the bleeding, and are you applying firm pressure to it?", "How long has it been bleeding?", "Do you feel lightheaded, weak, or unusually cold?"] },
  { id: "head-injury", label: "head injury", keywords: ["head injury", "hit my head", "head trauma", "concussion"], urgency: "High",
    questions: ["Did you lose consciousness at any point?", "Any vomiting, confusion, or worsening headache since?", "How did the injury happen?"] },
  { id: "fracture", label: "possible fracture", keywords: ["broken bone", "fracture", "think it's broken"], urgency: "Medium",
    questions: ["Can you move or bear weight on the area at all?", "Is there visible deformity, swelling, or bruising?", "How did the injury happen?"] },
  { id: "burn", label: "burn injury", keywords: ["burn", "burned myself", "scald"], urgency: "Medium",
    questions: ["How large is the burned area, and where is it?", "Are there blisters or is the skin charred/white?", "What caused the burn, and when did it happen?"] },
  { id: "back-pain", label: "back pain", keywords: ["back pain", "backache"], urgency: "Low",
    questions: ["When did the pain start, and did it follow an injury?", "Does it radiate down either leg, or cause numbness/weakness?", "Any loss of bladder or bowel control?"] },
  { id: "joint-pain", label: "joint pain", keywords: ["joint pain", "knee pain", "shoulder pain", "hip pain", "ankle pain"], urgency: "Low",
    questions: ["Which joint, and did it start after an injury or gradually?", "Is there swelling, redness, or warmth over the joint?", "Does it limit your ability to move or bear weight?"] },

  // ── Skin / allergy ──────────────────────────────────────────────────────
  { id: "anaphylaxis", label: "possible severe allergic reaction", urgency: "High", redFlag: true,
    keywords: [
      "throat closing", "swelling of my throat", "can't swallow", "cannot swallow", "difficulty swallowing",
      ["throat", "closing"], ["throat", "swelling"], ["throat", "tight"], ["face", "swelling"], ["face", "swollen"],
      ["tongue", "swelling"], ["tongue", "swollen"], ["lips", "swelling"], ["lips", "swollen"],
    ],
    questions: ["Do you have any difficulty breathing along with the swelling?", "Have you been exposed to a known allergen (food, medication, insect sting)?", "Do you carry an epinephrine auto-injector?"] },
  { id: "allergic-reaction", label: "allergic reaction", keywords: ["allergic reaction", "hives", "rash and swelling"], urgency: "Medium",
    questions: ["What do you think triggered it?", "Any difficulty breathing or swallowing?", "Have you taken any antihistamine, and did it help?"] },
  { id: "rash", label: "skin rash", keywords: ["rash", "skin irritation", "itchy skin", "hives"], urgency: "Low",
    questions: ["When did the rash appear, and has it spread?", "Any new soaps, foods, or medications recently?", "Is it itchy, painful, or associated with fever?"] },

  // ── ENT / eyes ──────────────────────────────────────────────────────────
  { id: "sore-throat", label: "sore throat", keywords: ["sore throat", "throat pain", "throat hurts"], urgency: "Low",
    questions: ["How long have you had the sore throat?", "Any fever, difficulty swallowing, or swollen glands?", "Any cough or runny nose alongside it?"] },
  { id: "ear-pain", label: "ear pain", keywords: ["ear pain", "earache", "ear ache"], urgency: "Low",
    questions: ["Is the pain in one ear or both?", "Any fever, discharge, or hearing changes?", "Any recent cold, water exposure, or air travel?"] },
  { id: "vision-loss", label: "sudden vision changes", keywords: ["can't see", "vision loss", "lost my vision", "blurry vision suddenly"], urgency: "High", redFlag: true,
    questions: ["Did this happen suddenly, and in one eye or both?", "Any eye pain, headache, or recent injury?", "Do you have any flashing lights or a curtain-like shadow in your vision?"] },
  { id: "eye-pain", label: "eye pain or redness", keywords: ["eye pain", "red eye", "eye irritation"], urgency: "Low",
    questions: ["Is it in one eye or both?", "Any discharge, vision changes, or light sensitivity?", "Do you wear contact lenses?"] },

  // ── Urinary ─────────────────────────────────────────────────────────────
  { id: "blood-in-urine", label: "blood in urine", keywords: ["blood in my urine", "blood in urine", "bloody urine"], urgency: "Medium",
    questions: ["Is this the first time you've noticed this?", "Any pain with urination or in your back/side?", "Any fever or recent injury?"] },
  { id: "painful-urination", label: "painful urination", keywords: ["painful urination", "burning when i pee", "burning urination", "pain when urinating"], urgency: "Low",
    questions: ["How long has this been going on?", "Any fever, back pain, or blood in the urine?", "Are you urinating more frequently than usual?"] },

  // ── Mental health ───────────────────────────────────────────────────────
  { id: "suicidal", label: "expressed thoughts of self-harm", keywords: ["suicidal", "want to end my life", "hurt myself", "kill myself"], urgency: "High", redFlag: true,
    questions: ["Are you safe right now, and do you have a specific plan?", "Is there someone with you or nearby who can support you?", "Have you had thoughts like this before, and have you told anyone?"] },
  { id: "panic-attack", label: "panic attack", keywords: ["panic attack", "panic attacks", "anxiety attack"], urgency: "Medium",
    questions: ["How long do the episodes typically last?", "Do you have chest pain, shortness of breath, or a racing heart with them?", "Is there a clear trigger, or do they happen unexpectedly?"] },
  { id: "anxiety-low-mood", label: "anxiety or low mood", keywords: ["anxious", "anxiety", "depressed", "depression", "low mood", "feeling down"], urgency: "Low",
    questions: ["How long have you been feeling this way?", "Is it affecting your sleep, appetite, or daily activities?", "Do you have support around you that you can talk to?"] },

  // ── Pregnancy ───────────────────────────────────────────────────────────
  { id: "pregnancy-bleeding", label: "bleeding during pregnancy", keywords: ["pregnant and bleeding", "pregnancy bleeding", "bleeding while pregnant"], urgency: "High", redFlag: true,
    questions: ["How many weeks pregnant are you?", "How heavy is the bleeding, and do you have abdominal pain?", "Are you feeling the baby move normally (if applicable)?"] },
  { id: "pregnancy-general", label: "pregnancy-related concern", keywords: ["pregnant", "pregnancy"], urgency: "Low",
    questions: ["How many weeks pregnant are you?", "Are you having any pain, bleeding, or reduced fetal movement?", "Are you currently seeing an OB/midwife for this pregnancy?"] },

  // ── Pediatric ───────────────────────────────────────────────────────────
  { id: "infant-fever", label: "fever in an infant", keywords: ["baby has a fever", "infant fever", "my baby is burning up"], urgency: "High",
    questions: ["How old is the baby, and what's the exact temperature?", "Is the baby feeding normally and acting alert?", "Any rash, difficulty breathing, or unusual sleepiness?"] },
  { id: "child-wont-stop-crying", label: "inconsolable crying in a child", keywords: ["won't stop crying", "inconsolable", "crying non-stop"], urgency: "Medium",
    questions: ["How long has this been going on?", "Any fever, vomiting, or signs of pain when touched?", "Has anything unusual happened recently (fall, new food, injury)?"] },

  // ── General / fatigue ───────────────────────────────────────────────────
  { id: "fatigue", label: "fatigue", keywords: ["fatigue", "very tired", "exhausted", "no energy", "feeling weak", "weakness"], urgency: "Low",
    questions: ["How long have you been feeling this way?", "Is it affecting your ability to do daily activities?", "Any other symptoms like fever, weight change, or poor sleep?"] },
  { id: "weight-loss", label: "unexplained weight loss", keywords: ["losing weight", "weight loss", "lost weight without trying"], urgency: "Medium",
    questions: ["How much weight, and over what period of time?", "Have you had any changes in appetite, energy, or bowel habits?", "Any fever or night sweats alongside it?"] },
  { id: "swelling", label: "swelling", keywords: ["swelling", "swollen leg", "swollen ankle", "leg is swollen"], urgency: "Medium",
    questions: ["Is the swelling in one limb or both?", "Any pain, redness, or warmth over the area?", "Any recent long travel, surgery, or immobility?"] },
];

// Words that, alongside any matched symptom, indicate it's more severe than
// the symptom's baseline urgency would suggest on its own.
const INTENSIFIERS = ["severe", "extreme", "unbearable", "excruciating", "worst", "sudden", "suddenly", "can't move", "can't stand"];

const GENERIC_QUESTIONS = [
  "When did this start, and has it changed since then?",
  "Is there anything that makes it better or worse?",
  "Are you currently taking any medications for this?",
];

const URGENCY_RANK: Record<Urgency, number> = { Low: 0, Medium: 1, High: 2 };

function bumpUrgency(u: Urgency): Urgency {
  return u === "Low" ? "Medium" : "High";
}

/** Whole-word/phrase match — avoids "pain" matching inside "painting". */
function matchesWord(text: string, word: string): boolean {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pattern = word.includes(" ") ? new RegExp(escaped) : new RegExp(`\\b${escaped}\\b`);
  return pattern.test(text);
}

/** A rule keyword entry: a single phrase, or a set of words that must ALL appear. */
function matchesKeywordEntry(text: string, entry: string | string[]): boolean {
  if (Array.isArray(entry)) return entry.every((w) => matchesWord(text, w));
  return matchesWord(text, entry);
}

function extractDuration(text: string): string | null {
  const match = text.match(
    /\bfor\s+(a|an|one|two|three|four|five|six|\d+)\s*(day|days|week|weeks|hour|hours|month|months)\b/i
  );
  return match ? match[0].trim() : null;
}

export function runLocalTriage(symptoms: string): TriageResult {
  const text = symptoms.toLowerCase();

  const matched = RULES.filter((rule) => rule.keywords.some((k) => matchesKeywordEntry(text, k)));

  if (matched.length === 0) {
    return {
      urgency: "Low",
      chiefComplaint: symptoms.trim().slice(0, 160),
      suggestedQuestions: GENERIC_QUESTIONS,
    };
  }

  const hasIntensifier = INTENSIFIERS.some((w) => text.includes(w));
  const hasRedFlag = matched.some((r) => r.redFlag);

  let urgency: Urgency = matched.reduce<Urgency>(
    (acc, r) => (URGENCY_RANK[r.urgency] > URGENCY_RANK[acc] ? r.urgency : acc),
    "Low"
  );
  if (hasRedFlag) urgency = "High";
  else if (hasIntensifier) urgency = bumpUrgency(urgency);

  // Highest-severity matches first, then in order of appearance, for the
  // chief complaint and for picking which symptom's questions lead.
  const ranked = [...matched].sort((a, b) => URGENCY_RANK[b.urgency] - URGENCY_RANK[a.urgency]);

  const labels = Array.from(new Set(ranked.map((r) => r.label))).slice(0, 3);
  const duration = extractDuration(text);
  const chiefComplaint =
    labels.length === 1
      ? capitalize(labels[0]) + (duration ? ` ${duration}` : "")
      : capitalize(joinWithAnd(labels)) + (duration ? ` ${duration}` : "");

  const questions: string[] = [];
  for (const rule of ranked) {
    for (const q of rule.questions) {
      if (questions.length >= 3) break;
      if (!questions.includes(q)) questions.push(q);
    }
    if (questions.length >= 3) break;
  }
  while (questions.length < 3) {
    const filler = GENERIC_QUESTIONS.find((q) => !questions.includes(q));
    if (!filler) break;
    questions.push(filler);
  }

  return { urgency, chiefComplaint, suggestedQuestions: questions.slice(0, 3) };
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function joinWithAnd(items: string[]): string {
  if (items.length <= 1) return items.join("");
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}
