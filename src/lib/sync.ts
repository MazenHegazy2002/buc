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

function isComponentFolder(name: string): boolean {
  const clean = name.trim().toLowerCase().replace(/^[\d\.\-_\s]+/, "");
  return /^(lecture|lectures|cbl|cbls|cpl|cbl\s*&\s*short\s*cases?|checklist|checklists|history|skill\s*labs?|evaluation\s*tools?|practical|quizzes|short\s*cases?|osce|writing)$/i.test(
    clean
  );
}

interface DiscoveredLesson {
  driveId: string;
  title: string;
  folderId?: string;
  directFile?: DriveItem;
}

/**
 * Recursively inspect folders under a subject. Container folders whose subfolders
 * represent distinct topics/lectures are un-bundled into individual lessons.
 */
async function discoverLessons(
  folderId: string,
  prefix: string,
  subName: string,
  depth: number = 0
): Promise<DiscoveredLesson[]> {
  const children = await listChildren(folderId);
  const folders = children.filter(isFolder).sort((a, b) => naturalCompare(a.name, b.name));
  const files = children.filter((c) => !isFolder(c)).sort((a, b) => naturalCompare(a.name, b.name));

  const results: DiscoveredLesson[] = [];

  for (const f of folders) {
    const fTitle = prefix ? `${prefix} - ${f.name}` : f.name;
    const fChildren = await listChildren(f.id);
    const subFolders = fChildren.filter(isFolder).sort((a, b) => naturalCompare(a.name, b.name));
    const nonComp = subFolders.filter((sf) => !isComponentFolder(sf.name));

    if (nonComp.length > 0 && !subName.toLowerCase().includes("old") && depth < 2) {
      const subLessons = await discoverLessons(f.id, fTitle, subName, depth + 1);
      results.push(...subLessons);
    } else {
      results.push({
        driveId: f.id,
        title: fTitle,
        folderId: f.id,
      });
    }
  }

  for (const df of files) {
    const clean = df.name
      .replace(/\.(pdf|pptx|ppt|docx|doc|mp4|mov|txt|html|xlsx|xls)$/i, "")
      .replace(/\.(docx|pdf)$/i, "")
      .trim();
    const title = prefix ? `${prefix} - ${clean}` : clean;
    results.push({
      driveId: `file_les_${df.id}`,
      title,
      directFile: df,
    });
  }

  return results;
}

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

  console.log(`Connecting to Google Drive root folder: ${root}`);
  const semesters = sorted(await listChildren(root));
  console.log(`Found ${semesters.length} semesters.`);
  for (const [si, sem] of semesters.entries()) {
    console.log(`[Semester ${si + 1}/${semesters.length}] ${sem.name}`);
    seen.sem.add(sem.id);
    const semester = await prisma.semester.upsert({
      where: { driveId: sem.id },
      update: { title: sem.name, order: si },
      create: { title: sem.name, driveId: sem.id, order: si },
    });
    stats.semesters++;

    const subjects = sorted(await listChildren(sem.id));
    console.log(`  Found ${subjects.length} subjects in ${sem.name}.`);
    for (const [ji, sub] of subjects.entries()) {
      console.log(`  [Subject ${ji + 1}/${subjects.length}] ${sub.name}`);
      seen.sub.add(sub.id);
      const subject = await prisma.subject.upsert({
        where: { driveId: sub.id },
        update: { title: sub.name, order: ji, semesterId: semester.id },
        create: { title: sub.name, driveId: sub.id, order: ji, semesterId: semester.id },
      });
      stats.subjects++;

      const lessons = await discoverLessons(sub.id, "", sub.name);

      for (const [li, item] of lessons.entries()) {
        seen.les.add(item.driveId);

        let files: {
          id: string;
          name: string;
          mimeType: string;
          size?: string | number | null;
          modifiedTime: string;
          webViewLink?: string;
          path: string[];
        }[] = [];

        if (item.folderId) {
          files = (await listFilesDeep(item.folderId)).sort((a, b) => naturalCompare(a.name, b.name));
        } else if (item.directFile) {
          files = [
            {
              id: item.directFile.id,
              name: item.directFile.name,
              mimeType: item.directFile.mimeType,
              size: item.directFile.size,
              modifiedTime: item.directFile.modifiedTime,
              webViewLink: item.directFile.webViewLink,
              path: [],
            },
          ];
        }

        const hash = createHash("sha1")
          .update(files.map((f) => `${f.id}:${f.modifiedTime}`).sort().join("|"))
          .digest("hex");

        const existing = await prisma.lesson.findUnique({ where: { driveId: item.driveId } });
        const changed = !existing || existing.contentHash !== hash;
        const hasReadable = files.some((f) => READABLE.has(f.mimeType));
        if (changed) {
          console.log(`    >>> [CHANGED] Lesson: "${item.title}" (${sub.name}) -> ${hasReadable ? "PENDING" : "EMPTY"}`);
        }

        const lesson = await prisma.lesson.upsert({
          where: { driveId: item.driveId },
          update: {
            title: item.title,
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
            title: item.title,
            driveId: item.driveId,
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
