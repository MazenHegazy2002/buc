import Link from "next/link";
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export default async function Home() {
  await connection();
  const [semesters, lessons, ready, files, lastRun] = await Promise.all([
    prisma.semester.findMany({
      orderBy: { order: "asc" },
      include: { _count: { select: { subjects: true } }, subjects: { select: { _count: { select: { lessons: true } } } } },
    }),
    prisma.lesson.count(),
    prisma.lesson.count({ where: { status: "READY" } }),
    prisma.lessonFile.count(),
    prisma.syncRun.findFirst({ where: { ok: true }, orderBy: { startedAt: "desc" } }),
  ]);

  return (
    <>
      <section className="hero">
        <span className="eyebrow">⚕ Medical study platform</span>
        <h1>
          Every lecture. <span className="grad-text">Summarised, mapped & examined.</span>
        </h1>
        <p>
          Lecture and CPL PDFs for every lesson, with AI summaries, mind maps, video walkthroughs, 30 MCQs and 30
          clinical cases, refreshed from Google Drive every evening.
        </p>
        <div className="stats">
          <div className="stat"><b>{semesters.length}</b><span>Semesters</span></div>
          <div className="stat"><b>{lessons}</b><span>Lessons</span></div>
          <div className="stat"><b>{files}</b><span>PDFs & files</span></div>
          <div className="stat"><b>{ready * 60}</b><span>Exam questions</span></div>
          <div className="stat">
            <b>{lastRun ? lastRun.startedAt.toLocaleDateString("en-GB", { day: "numeric", month: "short" }) : "—"}</b>
            <span>Last sync</span>
          </div>
        </div>
      </section>

      {semesters.length === 0 ? (
        <div className="notice">
          <h3>No content yet</h3>
          The first Drive sync hasn&apos;t run. It runs automatically at 8:00 PM, or trigger it from <code>/api/cron/sync</code>.
        </div>
      ) : (
        <div className="grid">
          {semesters.map((s, i) => {
            const lessonCount = s.subjects.reduce((n, x) => n + x._count.lessons, 0);
            return (
              <Link key={s.id} href={`/semester/${s.id}`} className="card" id={`semester-${s.id}`} style={{ animationDelay: `${i * 60}ms` }}>
                <div className="card-icon">🎓</div>
                <h3>{s.title}</h3>
                <p>{s._count.subjects} subjects · {lessonCount} lessons</p>
                <div className="card-foot"><span /> <span className="arrow">→</span></div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
