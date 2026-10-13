import { prisma } from "./prisma";
import { processLesson } from "./ai";

const MAX_ATTEMPTS = 3;

export function isAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  const header = req.headers.get("authorization");
  const q = new URL(req.url).searchParams.get("secret");
  return header === `Bearer ${secret}` || q === secret;
}

/** Atomically claim the next lesson needing AI work (or null). */
async function claimNext() {
  // Recover lessons stuck in PROCESSING (e.g. function was killed).
  await prisma.lesson.updateMany({
    where: { status: "PROCESSING", updatedAt: { lt: new Date(Date.now() - 15 * 60_000) } },
    data: { status: "PENDING" },
  });

  const candidates = await prisma.lesson.findMany({
    where: {
      OR: [{ status: "PENDING" }, { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } }],
    },
    orderBy: [{ attempts: "asc" }, { updatedAt: "asc" }],
    take: 5,
    select: { id: true, status: true },
  });

  for (const c of candidates) {
    const { count } = await prisma.lesson.updateMany({
      where: { id: c.id, status: c.status },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });
    if (count === 1) return c.id;
  }
  return null;
}

export async function pendingCount() {
  return prisma.lesson.count({
    where: { OR: [{ status: "PENDING" }, { status: "FAILED", attempts: { lt: MAX_ATTEMPTS } }] },
  });
}

/**
 * Process lessons until the time budget is used. Each lesson takes ~1-2 min,
 * so we stop starting new ones once less than `perLessonMs` remains.
 */
export async function runWorker(budgetMs = 50_000, perLessonMs = 45_000) {
  const start = Date.now();
  const done: string[] = [];
  const failed: { id: string; error: string }[] = [];

  while (Date.now() - start < budgetMs - perLessonMs) {
    const id = await claimNext();
    if (!id) break;
    try {
      await processLesson(id);
      done.push(id);
    } catch (e) {
      const error = e instanceof Error ? e.message : String(e);
      failed.push({ id, error });
      await prisma.lesson.update({
        where: { id },
        data: { status: "FAILED", lastError: error.slice(0, 4000) },
      });
    }
  }
  return { done, failed, remaining: await pendingCount() };
}

/** Fire-and-forget call to the worker so the next batch runs in a fresh function. */
export async function kickWorker(origin: string) {
  await fetch(`${origin}/api/worker`, {
    headers: { authorization: `Bearer ${process.env.CRON_SECRET}` },
    signal: AbortSignal.timeout(5000),
  }).catch(() => {
    /* timeout is expected: the worker keeps running on its own */
  });
}
