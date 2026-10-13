"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import MindMap from "./MindMap";
import VideoLesson, { type Slide } from "./VideoLesson";
import Quiz, { type Question } from "./Quiz";

type FileRow = {
  id: string; title: string; kind: "LECTURE" | "CPL" | "OTHER"; mimeType: string;
  sizeBytes: number | null; viewUrl: string; downloadUrl: string;
};

type Props = {
  status: "PENDING" | "PROCESSING" | "READY" | "FAILED" | "EMPTY";
  lastError: string | null;
  files: FileRow[];
  summary: string | null;
  mindMap: string | null;
  slides: Slide[];
  mcqs: Question[];
  cases: Question[];
};

const TABS = [
  { key: "files", label: "📄 Files" },
  { key: "summary", label: "📝 Summary" },
  { key: "mindmap", label: "🧠 Mind map" },
  { key: "video", label: "🎬 Video" },
  { key: "mcq", label: "✅ MCQs" },
  { key: "cases", label: "🏥 Clinical cases" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

const KIND_ICON = { LECTURE: "📘", CPL: "🩻", OTHER: "📎" };
const fmtSize = (b: number | null) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`) : "");

function NotReady({ status, lastError }: Pick<Props, "status" | "lastError">) {
  const msg = {
    PENDING: ["Queued for generation", "This lesson will be processed shortly after the next sync."],
    PROCESSING: ["Generating now…", "The AI is reading the lecture files. Check back in a couple of minutes."],
    FAILED: ["Generation failed", lastError ?? "It will be retried automatically."],
    EMPTY: ["No readable materials", "Add PDF, PowerPoint (.pptx), Word (.docx), or Google Docs/Slides to this lesson folder."],
    READY: ["Not available", ""],
  }[status];
  return (
    <div className="notice">
      <h3>{msg[0]}</h3>
      {msg[1]}
    </div>
  );
}

export default function LessonTabs(p: Props) {
  const [tab, setTab] = useState<TabKey>("files");
  const ready = p.status === "READY";

  return (
    <>
      <div className="tabs" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.key}
            id={`tab-${t.key}`}
            role="tab"
            className="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
          >
            {t.label}
          </button>
        ))}
      </div>

      <section className="panel" key={tab} role="tabpanel">
        {tab === "files" &&
          (p.files.length ? (
            <div className="files">
              {p.files.map((f) => (
                <div className="file" key={f.id}>
                  <span style={{ fontSize: "1.5rem" }}>{KIND_ICON[f.kind]}</span>
                  <div className="file-name">
                    <b title={f.title}>{f.title}</b>
                    <span>{f.kind === "OTHER" ? "File" : f.kind === "CPL" ? "CPL" : "Lecture"} {fmtSize(f.sizeBytes) && `· ${fmtSize(f.sizeBytes)}`}</span>
                  </div>
                  <a className="btn" href={f.viewUrl} target="_blank" rel="noreferrer" id={`view-${f.id}`}>View</a>
                  <a className="btn btn-primary" href={f.downloadUrl} id={`download-${f.id}`}>Download ↓</a>
                </div>
              ))}
            </div>
          ) : (
            <div className="notice"><h3>No files</h3>This lesson folder is empty in Drive.</div>
          ))}

        {tab === "summary" &&
          (ready && p.summary ? (
            <article className="prose">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{p.summary}</ReactMarkdown>
            </article>
          ) : (
            <NotReady {...p} />
          ))}

        {tab === "mindmap" && (ready && p.mindMap ? <MindMap code={p.mindMap} /> : <NotReady {...p} />)}
        {tab === "video" && (ready && p.slides.length ? <VideoLesson slides={p.slides} /> : <NotReady {...p} />)}
        {tab === "mcq" && (ready && p.mcqs.length ? <Quiz items={p.mcqs} kind="mcq" /> : <NotReady {...p} />)}
        {tab === "cases" && (ready && p.cases.length ? <Quiz items={p.cases} kind="case" /> : <NotReady {...p} />)}
      </section>
    </>
  );
}
