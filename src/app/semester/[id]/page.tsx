import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const s = await prisma.semester.findUnique({ where: { id: (await params).id } });
  return { title: s?.title ?? "Semester", description: `Subjects and lessons for ${s?.title}.` };
}

export default async function SemesterPage({ params }: Props) {
  await connection();
  const { id } = await params;
  const semester = await prisma.semester.findUnique({
    where: { id },
    include: {
      subjects: {
        orderBy: { order: "asc" },
        include: { lessons: { select: { status: true } } },
      },
    },
  });
  if (!semester) notFound();

  return (
    <>
      <nav className="crumbs"><Link href="/">Home</Link> / <span>{semester.title}</span></nav>
      <h1 className="page-title">{semester.title}</h1>
      <div className="grid">
        {semester.subjects.map((sub, i) => {
          const ready = sub.lessons.filter((l) => l.status === "READY").length;
          return (
            <Link key={sub.id} href={`/subject/${sub.id}`} className="card" id={`subject-${sub.id}`} style={{ animationDelay: `${i * 50}ms` }}>
              <div className="card-icon">📚</div>
              <h3>{sub.title}</h3>
              <p>{sub.lessons.length} lessons</p>
              <div className="card-foot">
                <span className={`badge ${ready === sub.lessons.length && ready > 0 ? "s-READY" : "s-PENDING"}`}>
                  {ready}/{sub.lessons.length} ready
                </span>
                <span className="arrow">→</span>
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}
