import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LessonTabs from "@/components/LessonTabs";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await prisma.lesson.findUnique({ where: { id: (await params).id }, include: { subject: true } });
  if (!l) return { title: "Lesson", description: "Lesson materials" };
  const hasFolder = l.title.includes(" - ");
  const [folderName, ...topicParts] = hasFolder ? l.title.split(" - ") : ["", l.title];
  const cleanTitle = hasFolder ? topicParts.join(" - ") : l.title;
  const title = hasFolder ? `${cleanTitle} (${folderName}) — ${l.subject.title}` : `${cleanTitle} — ${l.subject.title}`;
  return {
    title,
    description: `Lecture PDFs, summary, mind map, video, 30 MCQs and 30 clinical cases for ${cleanTitle}.`,
  };
}

export default async function LessonPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const lesson = await prisma.lesson.findUnique({
    where: { id },
    include: {
      subject: { include: { semester: true } },
      files: { orderBy: { title: "asc" } },
      mcqs: { orderBy: { order: "asc" } },
      cases: { orderBy: { order: "asc" } },
    },
  });
  if (!lesson) notFound();

  const { subject } = lesson;
  const hasFolder = lesson.title.includes(" - ");
  const [folderName, ...topicParts] = hasFolder ? lesson.title.split(" - ") : ["", lesson.title];
  const cleanTitle = hasFolder ? topicParts.join(" - ") : lesson.title;

  return (
    <>
      <nav className="crumbs">
        <Link href="/">Library</Link> / <Link href={`/semester/${subject.semester.id}`}>{subject.semester.title}</Link> /{" "}
        <Link href={`/subject/${subject.id}`}>{subject.title}</Link> /{" "}
        {hasFolder && (
          <>
            <Link href={`/subject/${subject.id}?folder=${encodeURIComponent(folderName)}`}>{folderName}</Link> /{" "}
          </>
        )}
        <span>{cleanTitle}</span>
      </nav>
      <h1 className="page-title" style={{ marginBottom: hasFolder ? ".35rem" : "1.5rem" }}>{cleanTitle}</h1>
      {hasFolder && (
        <div style={{ display: "flex", gap: ".6rem", alignItems: "center", marginBottom: "1.5rem" }}>
          <Link href={`/subject/${subject.id}?folder=${encodeURIComponent(folderName)}`} className="badge" style={{ color: "var(--accent)", textDecoration: "none" }}>
            📁 {folderName}
          </Link>
          <span style={{ color: "var(--muted)", fontSize: ".85rem" }}>{subject.title}</span>
        </div>
      )}
      <LessonTabs
        status={lesson.status}
        lastError={lesson.lastError}
        files={lesson.files.map((f) => ({
          id: f.id, driveId: f.driveId, title: f.title, kind: f.kind, mimeType: f.mimeType, sizeBytes: f.sizeBytes ? Number(f.sizeBytes) : null,
          viewUrl: f.viewUrl, downloadUrl: f.downloadUrl,
        }))}
        summary={lesson.summary}
        mindMap={lesson.mindMap}
        slides={(lesson.video as { slides?: Slide[] } | null)?.slides ?? []}
        mcqs={lesson.mcqs.map(({ id, question, options, correctIndex, explanation, difficulty }) => ({ id, question, options, correctIndex, explanation, difficulty }))}
        cases={lesson.cases.map(({ id, scenario, question, options, correctIndex, explanation, difficulty }) => ({ id, scenario, question, options, correctIndex, explanation, difficulty }))}
      />
    </>
  );
}

type Slide = { title: string; bullets: string[]; narration: string };
