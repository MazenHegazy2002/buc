import OpenAI from "openai";
import pdfParse from "pdf-parse-fork";
import { parseOfficeAsync } from "officeparser";
import { prisma } from "./prisma";
import { downloadFile, EXPORTABLE } from "./drive";
import { OFFICE_MIMES } from "./sync";

const MODEL = process.env.AI_MODEL || "gemini 3.1 pro re";
const READABLE = new Set(["application/pdf", ...Object.keys(EXPORTABLE), ...Object.keys(OFFICE_MIMES)]);

const openai = new OpenAI({
  baseURL: process.env.AI_BASE_URL || "http://169.58.133.158:20128/v1",
  apiKey: process.env.AI_API_KEY || "sk-bdddf22ad7d5ac39-7caa13-4c1511ec",
});

const SYSTEM = `You are a senior medical professor and examiner creating high-yield study material for medical students.
Use the attached lecture / CPL materials as the core source of truth.
Be accurate, thorough, and strictly return pure, valid JSON with NO markdown code-blocks (no \`\`\`json).`;

const OVERVIEW_PROMPT = `Based on the provided medical text, produce a JSON object with:
1. "summary": A comprehensive, high-yield summary in Markdown (include headings, tables for comparisons, bold key pearls).
2. "mindMap": A valid Mermaid mindmap string. Start with "mindmap\\n  root((Topic))" with clean alphanumeric node text without quotes or parenthesis.
3. "slides": An array of 8-15 slides for a video lesson. Each slide has: "title" (string), "bullets" (array of 3-5 strings), and "narration" (spoken transcript string, 50-100 words).

Format required:
{"summary": "...", "mindMap": "...", "slides": [{"title": "...", "bullets": ["..."], "narration": "..."}]}`;

const MCQ_PROMPT = `Based on the provided medical text, write EXACTLY 30 Multiple Choice Questions (Single Best Answer):
- Exactly 5 EASY (direct recall/definition)
- Exactly 5 MEDIUM (application/understanding)
- Exactly 20 HARD (multi-step clinical reasoning / differential diagnosis)

Return a JSON object in this exact shape:
{
  "easy": [{"question": "...", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}],
  "medium": [...],
  "hard": [...]
}
Options must contain 4 items. correctIndex must be an integer between 0 and 3.`;

const CASE_PROMPT = `Based on the provided medical text, create EXACTLY 30 Clinical Case Vignettes:
- Exactly 5 EASY
- Exactly 5 MEDIUM
- Exactly 20 HARD

Return a JSON object in this exact shape:
{
  "easy": [{"scenario": "Patient vignette with history & exam...", "question": "What is the diagnosis/management?", "options": ["A", "B", "C", "D"], "correctIndex": 0, "explanation": "..."}],
  "medium": [...],
  "hard": [...]
}
Options must contain 4 items. correctIndex must be an integer between 0 and 3.`;

async function extractLessonText(lessonId: string): Promise<string> {
  const files = await prisma.lessonFile.findMany({ where: { lessonId }, orderBy: { title: "asc" } });
  const readable = files.filter((f) => READABLE.has(f.mimeType));
  let combined = "";

  for (const f of readable) {
    try {
      const { data, mimeType } = await downloadFile(f.driveId, f.mimeType);
      let text = "";

      if (mimeType === "application/pdf") {
        const parsed = await pdfParse(data);
        text = parsed.text;
      } else if (OFFICE_MIMES[mimeType] || mimeType.includes("presentation") || mimeType.includes("word")) {
        text = await parseOfficeAsync(data);
      } else if (mimeType === "text/plain") {
        text = data.toString("utf-8");
      }

      if (text.trim()) {
        combined += `\n\n--- Document: ${f.title} (${f.kind}) ---\n${text}\n`;
      }
    } catch (err) {
      console.error(`Failed to parse file ${f.title}:`, err);
    }
  }

  return combined.trim();
}

function cleanJson(text: string): string {
  return text
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();
}

async function callAI<T>(prompt: string, text: string): Promise<T> {
  // Truncate text to avoid token limits if very large
  const truncated = text.slice(0, 75000);

  const res = await openai.chat.completions.create({
    model: MODEL,
    messages: [
      { role: "system", content: SYSTEM },
      { role: "user", content: `${prompt}\n\n=== SOURCE STUDY MATERIAL ===\n${truncated}` },
    ],
    temperature: 0.5,
  });

  const content = res.choices[0]?.message?.content || "{}";
  return JSON.parse(cleanJson(content)) as T;
}

type Q = { scenario?: string; question: string; options: string[]; correctIndex: number; explanation: string };
type Tiered = { easy?: Q[]; medium?: Q[]; hard?: Q[] };

function flatten(t: Tiered) {
  const valid = (q: Q) => Array.isArray(q.options) && q.options.length === 4 && q.correctIndex >= 0 && q.correctIndex <= 3;
  const easy = (t.easy || []).slice(0, 5).map((q) => ({ ...q, difficulty: "EASY" as const }));
  const medium = (t.medium || []).slice(0, 5).map((q) => ({ ...q, difficulty: "MEDIUM" as const }));
  const hard = (t.hard || []).slice(0, 20).map((q) => ({ ...q, difficulty: "HARD" as const }));

  return [...easy, ...medium, ...hard]
    .filter(valid)
    .map((q, order) => ({ ...q, order }));
}

export async function processLesson(lessonId: string) {
  const text = await extractLessonText(lessonId);
  if (!text) {
    await prisma.lesson.update({ where: { id: lessonId }, data: { status: "EMPTY" } });
    return;
  }

  const [overview, mcqs, cases] = await Promise.all([
    callAI<{ summary: string; mindMap: string; slides: unknown[] }>(OVERVIEW_PROMPT, text),
    callAI<Tiered>(MCQ_PROMPT, text),
    callAI<Tiered>(CASE_PROMPT, text),
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
