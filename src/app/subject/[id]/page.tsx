import Link from "next/link";
import { notFound } from "next/navigation";
import { connection } from "next/server";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import FolderIcon from "@/components/FolderIcon";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{ folder?: string }>;
};

const STATUS_LABEL = { READY: "Ready", PENDING: "Queued", PROCESSING: "Generating…", FAILED: "Failed", EMPTY: "No Docs" } as const;

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { id } = await params;
  const s = await prisma.subject.findUnique({ where: { id } });
  const sp = searchParams ? await searchParams : undefined;
  const folder = sp?.folder ? decodeURIComponent(sp.folder) : undefined;
  const title = folder && s ? `${folder} — ${s.title}` : s?.title ?? "Subject";
  return { title, description: `Lessons, summaries and exams for ${title}.` };
}

export default async function SubjectPage({ params, searchParams }: Props) {
  await connection();
  const { id } = await params;
  const sp = searchParams ? await searchParams : undefined;
  const selectedFolder = sp?.folder ? decodeURIComponent(sp.folder) : undefined;

  const subject = await prisma.subject.findUnique({
    where: { id },
    include: {
      semester: true,
      lessons: { orderBy: { order: "asc" }, include: { _count: { select: { files: true } } } },
    },
  });
  if (!subject) notFound();

  // Group lessons by folder if they have "Folder - Topic" naming
  const folderMap = new Map<string, typeof subject.lessons>();
  const flatLessons: typeof subject.lessons = [];

  for (const l of subject.lessons) {
    if (l.title.includes(" - ")) {
      const [fName] = l.title.split(" - ");
      const list = folderMap.get(fName) || [];
      list.push(l);
      folderMap.set(fName, list);
    } else {
      flatLessons.push(l);
    }
  }

  const hasFolderGroups = folderMap.size > 1;

  // Single folder drill-down view
  if (selectedFolder && folderMap.has(selectedFolder)) {
    const lessonsToShow = folderMap.get(selectedFolder)!;
    return (
      <>
        <nav className="crumbs">
          <Link href="/">Library</Link> /{" "}
          <Link href={`/semester/${subject.semester.id}`}>{subject.semester.title}</Link> /{" "}
          <Link href={`/subject/${subject.id}`}>{subject.title}</Link> /{" "}
          <span>{selectedFolder}</span>
        </nav>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "1rem", marginTop: ".5rem", marginBottom: "1.5rem" }}>
          <div>
            <h1 className="page-title" style={{ margin: 0 }}>{selectedFolder}</h1>
            <p style={{ color: "var(--muted)", fontSize: ".95rem", marginTop: ".35rem" }}>
              Folder inside {subject.title} • {lessonsToShow.length} lessons
            </p>
          </div>
          <Link href={`/subject/${subject.id}`} className="btn">
            ← All folders in {subject.title}
          </Link>
        </div>
        <div className="grid">
          {lessonsToShow.map((l, i) => (
            <Link key={l.id} href={`/lesson/${l.id}`} className="card" id={`lesson-${l.id}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="card-icon"><FolderIcon /></div>
              <h3>{l.title.replace(`${selectedFolder} - `, "")}</h3>
              <p>{l._count.files} files</p>
              <div className="card-foot">
                <span className={`badge s-${l.status}`}>{STATUS_LABEL[l.status]}</span>
              </div>
            </Link>
          ))}
        </div>
      </>
    );
  }

  return (
    <>
      <nav className="crumbs">
        <Link href="/">Library</Link> / <Link href={`/semester/${subject.semester.id}`}>{subject.semester.title}</Link> / <span>{subject.title}</span>
      </nav>
      <h1 className="page-title">{subject.title}</h1>

      {hasFolderGroups ? (
        <>
          <p style={{ color: "var(--muted)", fontSize: "1rem", marginTop: "-1rem", marginBottom: "1.5rem" }}>
            {folderMap.size} folders • {subject.lessons.length} lessons
          </p>

          {/* Folder overview cards */}
          <div className="grid">
            {Array.from(folderMap.entries()).map(([fName, fLessons], i) => {
              const ready = fLessons.filter((l) => l.status === "READY").length;
              const totalFiles = fLessons.reduce((acc, l) => acc + l._count.files, 0);
              return (
                <Link
                  key={fName}
                  href={`/subject/${subject.id}?folder=${encodeURIComponent(fName)}`}
                  className="card folder-card"
                  style={{ animationDelay: `${i * 50}ms` }}
                >
                  <div className="card-icon" style={{ background: "hsl(172 72% 48% / .18)", borderColor: "hsl(172 72% 48% / .35)" }}>
                    <FolderIcon />
                  </div>
                  <h3>{fName}</h3>
                  <p>{fLessons.length} lessons · {totalFiles} files</p>
                  <div className="card-foot">
                    <span className={`badge ${ready === fLessons.length && ready > 0 ? "s-READY" : "s-PENDING"}`}>
                      {ready}/{fLessons.length} ready
                    </span>
                    <span className="arrow">Open folder →</span>
                  </div>
                </Link>
              );
            })}

            {flatLessons.map((l, i) => (
              <Link key={l.id} href={`/lesson/${l.id}`} className="card" id={`lesson-${l.id}`} style={{ animationDelay: `${(folderMap.size + i) * 40}ms` }}>
                <div className="card-icon"><FolderIcon /></div>
                <h3>{l.title}</h3>
                <p>{l._count.files} files</p>
                <div className="card-foot">
                  <span className={`badge s-${l.status}`}>{STATUS_LABEL[l.status]}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      ) : (
        <div className="grid">
          {subject.lessons.map((l, i) => (
            <Link key={l.id} href={`/lesson/${l.id}`} className="card" id={`lesson-${l.id}`} style={{ animationDelay: `${i * 40}ms` }}>
              <div className="card-icon"><FolderIcon /></div>
              <h3>{l.title}</h3>
              <p>{l._count.files} files</p>
              <div className="card-foot">
                <span className={`badge s-${l.status}`}>{STATUS_LABEL[l.status]}</span>
              </div>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
