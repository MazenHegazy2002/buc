import "dotenv/config";
import { processLesson } from "../src/lib/ai";
import { prisma } from "../src/lib/prisma";

const CONCURRENCY = 6;

async function main() {
  console.log(`=== CONCURRENT BATCH RUNNER STARTED (Concurrency: ${CONCURRENCY}) ===`);
  const startTotal = Date.now();
  let completed = 0;
  let failed = 0;

  // Reset any lessons that previously failed or were interrupted in processing
  await prisma.lesson.updateMany({
    where: { status: { in: ["FAILED", "PROCESSING"] } },
    data: { status: "PENDING", attempts: 0, lastError: null },
  });

  async function runWorker(workerId: number) {
    while (true) {
      // Atomically find and claim the next pending lesson using Postgres SKIP LOCKED
      const claimed = await prisma.$queryRaw<Array<{ id: string }>>`
        UPDATE "Lesson"
        SET "status" = 'PROCESSING'::"ProcessStatus", "attempts" = "attempts" + 1
        WHERE "id" = (
          SELECT "id" FROM "Lesson"
          WHERE "status" = 'PENDING'::"ProcessStatus"
          ORDER BY "order" ASC
          FOR UPDATE SKIP LOCKED
          LIMIT 1
        )
        RETURNING "id"
      `;

      if (!claimed || claimed.length === 0) {
        break;
      }

      const nextLesson = await prisma.lesson.findUnique({
        where: { id: claimed[0].id },
        include: { subject: true, files: true },
      });

      if (!nextLesson) {
        break;
      }

      console.log(
        `\n[Worker ${workerId}] >>> STARTING: "${nextLesson.title}" (${nextLesson.subject.title}) - Files: ${nextLesson.files.length}`
      );

      const lessonStart = Date.now();
      try {
        await processLesson(nextLesson.id);
        completed++;
        const duration = ((Date.now() - lessonStart) / 1000).toFixed(1);
        console.log(
          `[Worker ${workerId}] >>> SUCCESS: "${nextLesson.title}" completed in ${duration}s. (Total completed: ${completed})`
        );
      } catch (err: unknown) {
        failed++;
        const duration = ((Date.now() - lessonStart) / 1000).toFixed(1);
        const msg = err instanceof Error ? err.message : String(err);
        console.error(
          `[Worker ${workerId}] >>> FAILED: "${nextLesson.title}" after ${duration}s: ${msg}`
        );
        await prisma.lesson.update({
          where: { id: nextLesson.id },
          data: {
            status: "FAILED",
            lastError: msg.slice(0, 1000),
          },
        });
      }
    }
  }

  while (true) {
    // Run the concurrent worker pool
    await Promise.all(Array.from({ length: CONCURRENCY }, (_, i) => runWorker(i + 1)));

    // Check for any retryable failures
    const retryable = await prisma.lesson.findMany({
      where: { status: "FAILED", attempts: { lt: 3 } },
    });
    if (retryable.length > 0) {
      console.log(`\nRetrying ${retryable.length} failed lessons with attempts < 3...`);
      await prisma.lesson.updateMany({
        where: { id: { in: retryable.map((r) => r.id) } },
        data: { status: "PENDING" },
      });
      continue;
    }
    break;
  }

  const [finalReady, finalMcqs, finalCases] = await Promise.all([
    prisma.lesson.count({ where: { status: "READY" } }),
    prisma.mcq.count(),
    prisma.clinicalCase.count(),
  ]);

  const totalTimeMin = ((Date.now() - startTotal) / 60000).toFixed(1);
  console.log(`\n========================================`);
  console.log(`ALL LESSONS PROCESSED IN ${totalTimeMin} minutes!`);
  console.log(`Completed in this run: ${completed} | Failed: ${failed}`);
  console.log(`READY Lessons: ${finalReady}`);
  console.log(`Total MCQs: ${finalMcqs}`);
  console.log(`Total Clinical Cases: ${finalCases}`);
  console.log(`========================================\n`);
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Fatal runner error:", err);
    prisma.$disconnect();
    process.exit(1);
  });
