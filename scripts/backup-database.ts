import "dotenv/config";
import { prisma } from "../src/lib/prisma";
import * as fs from "fs";
import * as path from "path";

async function backup() {
  console.log("=== Starting Database & Document Backup ===");
  const backupDir = path.join(process.cwd(), "backups");
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
  }

  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `backup-${timestamp}.json`;
  const filepath = path.join(backupDir, filename);

  const [semesters, subjects, lessons, files, mcqs, cases, syncRuns] = await Promise.all([
    prisma.semester.findMany({ include: { subjects: { include: { lessons: { include: { files: true, mcqs: true, cases: true } } } } } }),
    prisma.subject.findMany(),
    prisma.lesson.findMany({ include: { files: true, mcqs: true, cases: true } }),
    prisma.lessonFile.findMany(),
    prisma.mcq.findMany(),
    prisma.clinicalCase.findMany(),
    prisma.syncRun.findMany(),
  ]);

  const data = {
    timestamp: new Date().toISOString(),
    counts: {
      semesters: semesters.length,
      subjects: subjects.length,
      lessons: lessons.length,
      files: files.length,
      mcqs: mcqs.length,
      clinicalCases: cases.length,
      syncRuns: syncRuns.length,
    },
    semesters,
    lessons,
    files,
    syncRuns,
  };

  const jsonString = JSON.stringify(data, (_, v) => typeof v === 'bigint' ? v.toString() : v, 2);
  fs.writeFileSync(filepath, jsonString, "utf-8");
  console.log(`Backup successfully created at: ${filepath}`);
  console.log(`Backed up ${data.counts.semesters} semesters, ${data.counts.lessons} lessons, and ${data.counts.files} files.`);
}

backup()
  .then(() => prisma.$disconnect())
  .catch((err) => {
    console.error("Backup failed:", err);
    prisma.$disconnect();
    process.exit(1);
  });
