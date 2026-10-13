import { GoogleGenAI, Type, createPartFromUri, type Part, type Schema } from "@google/genai";
import { prisma } from "./prisma";
import { downloadFile, EXPORTABLE } from "./drive";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const READABLE = new Set(["application/pdf", ...Object.keys(EXPORTABLE)]);
const INLINE_LIMIT = 15 * 1024 * 1024; // keep total inline payload under Gemini's 20MB cap

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const SYSTEM = `You are a senior medical professor and examiner writing high-yield study material
for medical students. Use ONLY the attached lecture / CPL material as the source of truth; you may add
widely accepted clinical knowledge where it clarifies the material. Be precise, clinically accurate,
and exam-oriented.`;

// ---------- Schemas ----------
const question = (withScenario: boolean): Schema => ({
  type: Type.OBJECT,
  properties: {
    ...(withScenario && { scenario: { type: Type.STRING, description: "Realistic patient vignette: age/sex, complaint, history, exam, investigations" } }),
    question: { type: Type.STRING },
    options: { type: Type.ARRAY, items: { type: Type.STRING }, minItems: "4", maxItems: "4" },
    correctIndex: { type: Type.INTEGER, description: "0-3" },
    explanation: { type: Type.STRING, description: "Why the answer is correct and why each distractor is wrong" },
  },
  required: [...(withScenario ? ["scenario"] : []), "question", "options", "correctIndex", "explanation"],
});

const tiered = (withScenario: boolean): Schema => ({
  type: Type.OBJECT,
  properties: {
    easy: { type: Type.ARRAY, items: question(withScenario), minItems: "5", maxItems: "5" },
    medium: { type: Type.ARRAY, items: question(withScenario), minItems: "5", maxItems: "5" },
    hard: { type: Type.ARRAY, items: question(withScenario), minItems: "20", maxItems: "20" },
  },
  required: ["easy", "medium", "hard"],
});

const overviewSchema: Schema = {
  type: Type.OBJECT,
  properties: {
    summary: { type: Type.STRING, description: "Markdown summary" },
    mindMap: { type: Type.STRING, description: "Mermaid mindmap code" },
    slides: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          bullets: { type: Type.ARRAY, items: { type: Type.STRING } },
          narration: { type: Type.STRING, description: "What the teacher says aloud for this slide, 60-120 words" },
        },
        required: ["title", "bullets", "narration"],
      },
    },
  },
  required: ["summary", "mindMap", "slides"],
};

// ---------- Prompts ----------
const OVERVIEW_PROMPT = `From the attached material produce:
1. "summary": a comprehensive high-yield summary in Markdown (headings, bullet points, tables for
   comparisons, bold key terms, a "High-yield / exam pearls" section at the end).
2. "mindMap": a Mermaid **mindmap** diagram. Start with the line "mindmap", then "  root((Lesson topic))",
   indent children with 2 spaces per level, 3-4 levels deep, max ~40 nodes. Node text must be short and
   must NOT contain parentheses, brackets, braces, quotes or colons.
3. "slides": 8-15 slides for an explanatory video lesson that walks through the whole topic in a logical
   teaching order (intro → core concepts → clinical relevance → recap). Each slide has a title, 3-5 short
   bullets, and a spoken narration.`;

const MCQ_PROMPT = `Write exactly 30 single-best-answer MCQs covering the whole attached material:
5 easy (recall), 5 medium (understanding/application), 20 hard (multi-step reasoning, integration,
USMLE/board style). 4 options each, one clearly correct answer, plausible distractors, no "all of the above".
Vary the position of the correct answer.`;

const CASE_PROMPT = `Write exactly 30 clinical case scenarios based on the attached material:
5 easy, 5 medium, 20 hard. Each has a realistic patient vignette (demographics, presenting complaint,
history, examination, relevant investigations with values), then one question (diagnosis, next best step,
mechanism, management, or interpretation) with 4 options. Hard cases should require integrating several
findings and excluding close differentials. Vary the position of the correct answer.`;

// ---------- Helpers ----------
async function buildFileParts(lessonId: string): Promise<Part[]> {
  const files = await prisma.lessonFile.findMany({ where: { lessonId }, orderBy: { title: "asc" } });
  const readable = files.filter((f) => READABLE.has(f.mimeType));
  const parts: Part[] = [];
  let inlineBytes = 0;

  for (const f of readable) {
    const { data, mimeType } = await downloadFile(f.driveId, f.mimeType);
    parts.push({ text: `--- File (${f.kind}): ${f.title} ---` });
    if (inlineBytes + data.length <= INLINE_LIMIT) {
      inlineBytes += data.length;
      parts.push({ inlineData: { mimeType, data: data.toString("base64") } });
    } else {
      const up = await ai.files.upload({
        file: new Blob([new Uint8Array(data)], { type: mimeType }),
        config: { mimeType, displayName: f.title.slice(0, 100) },
      });
      parts.push(createPartFromUri(up.uri!, up.mimeType!));
    }
  }
  return parts;
}

async function generate<T>(fileParts: Part[], prompt: string, schema: Schema): Promise<T> {
  const res = await ai.models.generateContent({
    model: MODEL,
    contents: [{ role: "user", parts: [...fileParts, { text: prompt }] }],
    config: {
      systemInstruction: SYSTEM,
      responseMimeType: "application/json",
      responseSchema: schema,
      temperature: 0.6,
    },
  });
  const text = res.text;
  if (!text) throw new Error(`Empty response from ${MODEL}`);
  return JSON.parse(text) as T;
}

type Q = { scenario?: string; question: string; options: string[]; correctIndex: number; explanation: string };
type Tiered = { easy: Q[]; medium: Q[]; hard: Q[] };

function flatten(t: Tiered) {
  const valid = (q: Q) => Array.isArray(q.options) && q.options.length === 4 && q.correctIndex >= 0 && q.correctIndex <= 3;
  return [
    ...t.easy.slice(0, 5).map((q) => ({ ...q, difficulty: "EASY" as const })),
    ...t.medium.slice(0, 5).map((q) => ({ ...q, difficulty: "MEDIUM" as const })),
    ...t.hard.slice(0, 20).map((q) => ({ ...q, difficulty: "HARD" as const })),
  ]
    .filter(valid)
    .map((q, order) => ({ ...q, order }));
}

/** Generate all AI assets for one lesson and replace the old ones atomically. */
export async function processLesson(lessonId: string) {
  const fileParts = await buildFileParts(lessonId);
  if (!fileParts.length) {
    await prisma.lesson.update({ where: { id: lessonId }, data: { status: "EMPTY" } });
    return;
  }

  const [overview, mcqs, cases] = await Promise.all([
    generate<{ summary: string; mindMap: string; slides: unknown[] }>(fileParts, OVERVIEW_PROMPT, overviewSchema),
    generate<Tiered>(fileParts, MCQ_PROMPT, tiered(false)),
    generate<Tiered>(fileParts, CASE_PROMPT, tiered(true)),
  ]);

  const mcqRows = flatten(mcqs);
  const caseRows = flatten(cases);

  await prisma.$transaction([
    prisma.mcq.deleteMany({ where: { lessonId } }),
    prisma.clinicalCase.deleteMany({ where: { lessonId } }),
    prisma.lesson.update({
      where: { id: lessonId },
      data: {
        summary: overview.summary,
        mindMap: overview.mindMap,
        video: { slides: overview.slides } as object,
        status: "READY",
        lastError: null,
        generatedAt: new Date(),
        mcqs: {
          create: mcqRows.map(({ scenario: _s, ...q }) => q),
        },
        cases: {
          create: caseRows.map((q) => ({ ...q, scenario: q.scenario ?? "" })),
        },
      },
    }),
  ]);
}
