import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import LessonTabs from "@/components/LessonTabs";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const l = await prisma.lesson.findUnique({ where: { id: (await params).id }, include: { subject: true } });
  return {
    title: l ? `${l.title} — ${l.subject.title}` : "Lesson",
    description: `Lecture PDFs, summary, mind map, video, 30 MCQs and 30 clinical cases for ${l?.title}.`,
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
  return (
    <>
      <nav className="crumbs">
        <Link href="/">Home</Link> / <Link href={`/semester/${subject.semester.id}`}>{subject.semester.title}</Link> /{" "}
        <Link href={`/subject/${subject.id}`}>{subject.title}</Link> / <span>{lesson.title}</span>
      </nav>
      <h1 className="page-title">{lesson.title}</h1>
      <LessonTabs
        status={lesson.status}
        lastError={lesson.lastError}
        files={lesson.files.map((f) => ({
          id: f.id, title: f.title, kind: f.kind, mimeType: f.mimeType, sizeBytes: f.sizeBytes,
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
