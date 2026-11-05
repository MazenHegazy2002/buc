"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useMemo, useState } from "react";
import FolderIcon from "./FolderIcon";

export type TreeSemester = {
  id: string; title: string;
  subjects: { id: string; title: string; lessons: { id: string; title: string }[] }[];
};

export default function FolderTree({ tree }: { tree: TreeSemester[] }) {
  const pathname = usePathname();
  const [query, setQuery] = useState("");
  const [menuOpen, setMenuOpen] = useState(false);
  const currentId = pathname.split("/")[2];

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return tree
      .flatMap((s) => s.subjects.flatMap((x) => x.lessons.map((l) => ({ ...l, where: `${s.title} / ${x.title}` }))))
      .filter((l) => `${l.title} ${l.where}`.toLowerCase().includes(q))
      .slice(0, 30);
  }, [query, tree]);

  return (
    <nav className="tree" aria-label="Drive folders">
      <label className="tree-search">
        <span className="sr-only">Search lessons</span>
        <input type="search" id="lesson-search" placeholder="Search lessons" value={query} onChange={(e) => setQuery(e.target.value)} />
      </label>

      <button className="btn tree-toggle" aria-expanded={menuOpen} onClick={() => setMenuOpen(!menuOpen)}>
        {menuOpen ? "Hide folders" : "Show folders"}
      </button>

      {query.trim() ? (
        matches.length ? (
          matches.map((l) => (
            <Link key={l.id} href={`/lesson/${l.id}`} className="tree-row tree-match" onClick={() => setQuery("")}>
              <b>{l.title}</b>
              <span>{l.where}</span>
            </Link>
          ))
        ) : (
          <p className="tree-empty">No lessons found</p>
        )
      ) : (
        <div className={menuOpen ? "tree-list open" : "tree-list"} onClick={() => setMenuOpen(false)}>
          <div className="tree-label">Drive folders</div>
          {tree.map((s) => {
            const open = s.id === currentId || s.subjects.some((x) => x.id === currentId || x.lessons.some((l) => l.id === currentId));
            return (
              <div key={s.id}>
                <Link href={`/semester/${s.id}`} className="tree-row" aria-current={s.id === currentId ? "page" : undefined}>
                  <FolderIcon size={16} /> {s.title}
                </Link>
                {open &&
                  s.subjects.map((x) => {
                    const subOpen = x.id === currentId || x.lessons.some((l) => l.id === currentId);
                    return (
                      <div key={x.id}>
                        <Link href={`/subject/${x.id}`} className="tree-row depth-1" aria-current={x.id === currentId ? "page" : undefined}>
                          {x.title}
                        </Link>
                        {subOpen && (() => {
                          // Check if lessons have folder prefix
                          const folderGroups = new Map<string, typeof x.lessons>();
                          const flat: typeof x.lessons = [];

                          for (const l of x.lessons) {
                            if (l.title.includes(" - ")) {
                              const [fName] = l.title.split(" - ");
                              const list = folderGroups.get(fName) || [];
                              list.push(l);
                              folderGroups.set(fName, list);
                            } else {
                              flat.push(l);
                            }
                          }

                          if (folderGroups.size > 1) {
                            return (
                              <>
                                {Array.from(folderGroups.entries()).map(([fName, fLessons]) => {
                                  const folderHasActiveLesson = fLessons.some((l) => l.id === currentId);
                                  return (
                                    <div key={fName}>
                                      <Link
                                        href={`/subject/${x.id}?folder=${encodeURIComponent(fName)}`}
                                        className="tree-row depth-2"
                                        style={{ fontWeight: 600, color: "var(--fg)" }}
                                      >
                                        <FolderIcon size={14} /> {fName}
                                      </Link>
                                      {folderHasActiveLesson &&
                                        fLessons.map((l) => (
                                          <Link
                                            key={l.id}
                                            href={`/lesson/${l.id}`}
                                            className="tree-row depth-3"
                                            aria-current={l.id === currentId ? "page" : undefined}
                                          >
                                            {l.title.replace(`${fName} - `, "")}
                                          </Link>
                                        ))}
                                    </div>
                                  );
                                })}
                                {flat.map((l) => (
                                  <Link
                                    key={l.id}
                                    href={`/lesson/${l.id}`}
                                    className="tree-row depth-2"
                                    aria-current={l.id === currentId ? "page" : undefined}
                                  >
                                    {l.title}
                                  </Link>
                                ))}
                              </>
                            );
                          }

                          return x.lessons.map((l) => (
                            <Link key={l.id} href={`/lesson/${l.id}`} className="tree-row depth-2" aria-current={l.id === currentId ? "page" : undefined}>
                              {l.title}
                            </Link>
                          ));
                        })()}
                      </div>
                    );
                  })}
              </div>
            );
          })}
        </div>
      )}
    </nav>
  );
}
