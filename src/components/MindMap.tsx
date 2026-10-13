"use client";

import { useEffect, useRef, useState } from "react";

/** Renders Mermaid code; falls back to the raw outline if the AI's syntax is invalid. */
export default function MindMap({ code }: { code: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const mermaid = (await import("mermaid")).default;
      mermaid.initialize({
        startOnLoad: false,
        theme: "dark",
        securityLevel: "strict",
        themeVariables: { fontFamily: "inherit", primaryColor: "#14b8a6", primaryTextColor: "#f1f5f9", lineColor: "#38bdf8" },
      });
      try {
        const clean = code.replace(/^```(?:mermaid)?\s*|```\s*$/g, "").trim();
        const { svg } = await mermaid.render(`mm-${Math.random().toString(36).slice(2)}`, clean);
        if (!cancelled && ref.current) ref.current.innerHTML = svg;
      } catch {
        if (!cancelled) setError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [code]);

  if (error)
    return (
      <div className="prose">
        <h3>Mind map outline</h3>
        <pre style={{ whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{code.replace(/^mindmap\s*/i, "")}</pre>
      </div>
    );

  return <div className="mindmap" ref={ref}>Rendering mind map…</div>;
}
