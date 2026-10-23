import { syncDrive } from "../src/lib/sync";
import { prisma } from "../src/lib/prisma";

async function main() {
  console.log("=== CHECKING GOOGLE DRIVE ===");
  const start = Date.now();
  const stats = await syncDrive();
  console.log(`\nDrive Sync Completed in ${((Date.now() - start) / 1000).toFixed(1)}s`);
  console.log("Sync Stats:", JSON.stringify(stats, null, 2));

  const [semesters, subjects, lessons, files, statusCounts] = await Promise.all([
    prisma.semester.count(),
    prisma.subject.count(),
    prisma.lesson.count(),
    prisma.lessonFile.count(),
    prisma.lesson.groupBy({ by: ["status"], _count: { id: true } }),
  ]);

  console.log("\nDatabase Totals:");
  console.log(JSON.stringify({ semesters, subjects, lessons, files, statusCounts }, null, 2));

  if (stats.changedLessons > 0) {
    const changed = await prisma.lesson.findMany({
      where: { status: "PENDING" },
      select: { title: true, subject: { select: { title: true } } },
      take: 10,
    });
    console.log("\nPending/Updated Lessons (sample):", JSON.stringify(changed, null, 2));
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Error during sync:", err);
    prisma.$disconnect();
    process.exit(1);
  });
