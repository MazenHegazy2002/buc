import "dotenv/config";
import { processLesson } from "../src/lib/ai";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== BATCH RUNNER STARTED ===");
  const startTotal = Date.now();
  let completed = 0;
  let failed = 0;

  // Reset any lessons that previously failed or were interrupted in processing
  await prisma.lesson.updateMany({
    where: { status: { in: ["FAILED", "PROCESSING"] } },
    data: { status: "PENDING", attempts: 0, lastError: null },
  });

  while (true) {
    const [pendingCount, failedCount, readyCount, emptyCount] = await Promise.all([
      prisma.lesson.count({ where: { status: "PENDING" } }),
      prisma.lesson.count({ where: { status: "FAILED" } }),
      prisma.lesson.count({ where: { status: "READY" } }),
      prisma.lesson.count({ where: { status: "EMPTY" } }),
    ]);

    console.log(
      `\n[STATUS] Ready: ${readyCount} | Pending: ${pendingCount} | Failed: ${failedCount} | Empty: ${emptyCount}`
    );

    if (pendingCount === 0) {
      if (failedCount > 0) {
        console.log(`Checking ${failedCount} failed lessons to see if any have attempts < 3...`);
        const retryable = await prisma.lesson.findMany({
          where: { status: "FAILED", attempts: { lt: 3 } },
        });
        if (retryable.length > 0) {
          console.log(`Resetting ${retryable.length} retryable failed lessons to PENDING...`);
          await prisma.lesson.updateMany({
            where: { id: { in: retryable.map((r) => r.id) } },
            data: { status: "PENDING" },
          });
          continue;
        }
      }
      console.log("No more PENDING lessons remaining. All done!");
      break;
    }

    // Pick the next pending lesson
    const nextLesson = await prisma.lesson.findFirst({
      where: { status: "PENDING" },
      orderBy: { order: "asc" },
      include: { subject: true, files: true },
    });

    if (!nextLesson) {
      console.log("No pending lesson returned by query. Exiting loop.");
      break;
    }

    console.log(
      `\n>>> [STARTING] Lesson: "${nextLesson.title}" (${nextLesson.subject.title}) - Files: ${nextLesson.files.length}`
    );

    // Atomically claim it
    await prisma.lesson.update({
      where: { id: nextLesson.id },
      data: { status: "PROCESSING", attempts: { increment: 1 } },
    });

    const lessonStart = Date.now();
    try {
      await processLesson(nextLesson.id);
      completed++;
      const duration = ((Date.now() - lessonStart) / 1000).toFixed(1);
      console.log(`>>> [SUCCESS] Lesson "${nextLesson.title}" completed in ${duration}s. (Total completed: ${completed})`);
    } catch (err: unknown) {
      failed++;
      const duration = ((Date.now() - lessonStart) / 1000).toFixed(1);
      const msg = err instanceof Error ? err.message : String(err);
      console.error(`>>> [FAILED] Lesson "${nextLesson.title}" failed after ${duration}s: ${msg}`);
      await prisma.lesson.update({
        where: { id: nextLesson.id },
        data: {
          status: "FAILED",
          lastError: msg.slice(0, 1000),
        },
      });
    }
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
