"use client";

import { useState } from "react";
import FolderIcon from "./FolderIcon";

export type FileRow = {
  id: string; driveId: string; title: string; kind: "LECTURE" | "CPL" | "OTHER"; mimeType: string;
  sizeBytes: number | null; viewUrl: string; downloadUrl: string;
};

const fmtSize = (b: number | null) => (b ? (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.round(b / 1e3)} KB`) : "");

/** Files keep their Drive subfolder as a "a / b / name" title; split it back into folders. */
function groupByFolder(files: FileRow[]) {
  const groups = new Map<string, (FileRow & { name: string })[]>();
  for (const f of files) {
    const parts = f.title.split(" / ");
    const name = parts.pop() ?? f.title;
    const folder = parts.join(" / ");
    groups.set(folder, [...(groups.get(folder) ?? []), { ...f, name }]);
  }
  return [...groups].sort(([a], [b]) => a.localeCompare(b, undefined, { numeric: true }));
}

export default function FileBrowser({ files }: { files: FileRow[] }) {
  const [open, setOpen] = useState<(FileRow & { name: string }) | null>(null);

  if (open) {
    return (
      <div className="viewer">
        <div className="viewer-bar">
          <button className="btn" id="viewer-back" onClick={() => setOpen(null)}>Back to files</button>
          <b title={open.name}>{open.name}</b>
          <a className="btn" href={open.viewUrl} target="_blank" rel="noreferrer">Open in Drive</a>
          <a className="btn btn-primary" href={open.downloadUrl}>Download</a>
        </div>
        <iframe title={open.name} src={`https://drive.google.com/file/d/${open.driveId}/preview`} allow="autoplay" />
      </div>
    );
  }

  return (
    <div className="file-groups">
      {groupByFolder(files).map(([folder, rows]) => (
        <section key={folder}>
          {folder && <h3 className="folder-title"><FolderIcon size={18} /> {folder}</h3>}
          <div className="files">
            {rows.map((f) => (
              <div className="file" key={f.id}>
                <span className="file-kind">{f.kind === "OTHER" ? "FILE" : f.kind}</span>
                <div className="file-name">
                  <b title={f.name}>{f.name}</b>
                  {fmtSize(f.sizeBytes) && <span>{fmtSize(f.sizeBytes)}</span>}
                </div>
                <button className="btn btn-primary" id={`view-${f.id}`} onClick={() => setOpen(f)}>View</button>
                <a className="btn" href={f.downloadUrl} id={`download-${f.id}`}>Download</a>
              </div>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
