import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

const STATUS_LABEL = { READY: "Ready", PENDING: "Queued", PROCESSING: "Generating…", FAILED: "Failed", EMPTY: "No Docs" } as const;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await prisma.subject.findUnique({ where: { id: (await params).id } });
  return { title: s?.title ?? "Subject", description: `Lessons, summaries and exams for ${s?.title}.` };
}

export default async function SubjectPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      semester: true,
      lessons: { orderBy: { order: "asc" }, include: { _count: { select: { files: true } } } },
    },
  });
  if (!subject) notFound();

  return (
    <>
      <nav className="crumbs">
        <Link href="/">Home</Link> / <Link href={`/semester/${subject.semester.id}`}>{subject.semester.title}</Link> / <span>{subject.title}</span>
      </nav>
      <h1 className="page-title">{subject.title}</h1>
      <div className="grid">
        {subject.lessons.map((l, i) => (
          <Link key={l.id} href={`/lesson/${l.id}`} className="card" id={`lesson-${l.id}`} style={{ animationDelay: `${i * 40}ms` }}>
            <div className="card-icon">🩺</div>
            <h3>{l.title}</h3>
            <p>{l._count.files} files</p>
            <div className="card-foot">
              <span className={`badge s-${l.status}`}>{STATUS_LABEL[l.status]}</span>
              <span className="arrow">→</span>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
}
