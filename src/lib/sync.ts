import { createHash } from "crypto";
import { prisma } from "./prisma";
import { listChildren, listFilesDeep, isFolder, naturalCompare, EXPORTABLE, type DriveItem } from "./drive";
import type { FileKind } from "@prisma/client";

export const OFFICE_MIMES: Record<string, string> = {
  "application/vnd.openxmlformats-officedocument.presentationml.presentation": "pptx",
  "application/vnd.ms-powerpoint": "ppt",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": "docx",
  "application/msword": "doc",
  "text/plain": "txt",
};

const READABLE = new Set([
  "application/pdf",
  ...Object.keys(EXPORTABLE),
  ...Object.keys(OFFICE_MIMES),
]);

function classify(name: string, path: string[]): FileKind {
  const s = [...path, name].join("/").toLowerCase();
  if (/\bcpl\b|clinical|practical/.test(s)) return "CPL";
  if (/lect|lecture|lec\b|slides?/.test(s)) return "LECTURE";
  return "OTHER";
}

const sorted = (items: DriveItem[]) =>
  items.filter(isFolder).sort((a, b) => naturalCompare(a.name, b.name));

/**
 * Mirror the Drive tree (Semester → Subject → Lesson → files) into the DB.
 * Fast: metadata only. Lessons whose files changed are marked PENDING so the
 * AI worker picks them up. Deleted folders/files are removed.
 */
export async function syncDrive() {
  const root = process.env.GOOGLE_ROOT_FOLDER_ID!;
  const stats = { semesters: 0, subjects: 0, lessons: 0, files: 0, changedLessons: 0, removed: 0 };

  const seen = { sem: new Set<string>(), sub: new Set<string>(), les: new Set<string>(), file: new Set<string>() };

  const semesters = sorted(await listChildren(root));
  for (const [si, sem] of semesters.entries()) {
    seen.sem.add(sem.id);
    const semester = await prisma.semester.upsert({
      where: { driveId: sem.id },
      update: { title: sem.name, order: si },
      create: { title: sem.name, driveId: sem.id, order: si },
    });
    stats.semesters++;

    const subjects = sorted(await listChildren(sem.id));
    for (const [ji, sub] of subjects.entries()) {
      seen.sub.add(sub.id);
      const subject = await prisma.subject.upsert({
        where: { driveId: sub.id },
        update: { title: sub.name, order: ji, semesterId: semester.id },
        create: { title: sub.name, driveId: sub.id, order: ji, semesterId: semester.id },
      });
      stats.subjects++;

      const lessons = sorted(await listChildren(sub.id));
      for (const [li, les] of lessons.entries()) {
        seen.les.add(les.id);
        const files = (await listFilesDeep(les.id)).sort((a, b) => naturalCompare(a.name, b.name));

        const hash = createHash("sha1")
          .update(files.map((f) => `${f.id}:${f.modifiedTime}`).sort().join("|"))
          .digest("hex");

        const existing = await prisma.lesson.findUnique({ where: { driveId: les.id } });
        const changed = !existing || existing.contentHash !== hash;
        const hasReadable = files.some((f) => READABLE.has(f.mimeType));

        const lesson = await prisma.lesson.upsert({
          where: { driveId: les.id },
          update: {
            title: les.name,
            order: li,
            subjectId: subject.id,
            ...(changed && {
              contentHash: hash,
              status: hasReadable ? "PENDING" : "EMPTY",
              attempts: 0,
              lastError: null,
            }),
          },
          create: {
            title: les.name,
            driveId: les.id,
            order: li,
            subjectId: subject.id,
            contentHash: hash,
            status: hasReadable ? "PENDING" : "EMPTY",
          },
        });
        stats.lessons++;
        if (changed) stats.changedLessons++;

        for (const f of files) {
          seen.file.add(f.id);
          const data = {
            title: f.path.length ? `${f.path.join(" / ")} / ${f.name}` : f.name,
            mimeType: f.mimeType,
            kind: classify(f.name, f.path),
            sizeBytes: f.size !== undefined && f.size !== null ? BigInt(f.size) : null,
            modifiedTime: new Date(f.modifiedTime),
            viewUrl: f.webViewLink ?? `https://drive.google.com/file/d/${f.id}/view`,
            downloadUrl: EXPORTABLE[f.mimeType]
              ? `/api/files/${f.id}/download`
              : `https://drive.google.com/uc?export=download&id=${f.id}`,
            lessonId: lesson.id,
          };
          await prisma.lessonFile.upsert({
            where: { driveId: f.id },
            update: data,
            create: { ...data, driveId: f.id },
          });
          stats.files++;
        }
      }
    }
  }

  // Remove things that disappeared from Drive.
  const r = await prisma.$transaction([
    prisma.lessonFile.deleteMany({ where: { driveId: { notIn: [...seen.file] } } }),
    prisma.lesson.deleteMany({ where: { driveId: { notIn: [...seen.les] } } }),
    prisma.subject.deleteMany({ where: { driveId: { notIn: [...seen.sub] } } }),
    prisma.semester.deleteMany({ where: { driveId: { notIn: [...seen.sem] } } }),
  ]);
  stats.removed = r.reduce((n, x) => n + x.count, 0);

  return stats;
}
