import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { downloadFile } from "@/lib/drive";

export const maxDuration = 60;

/** Downloads Google Docs/Slides as PDF (Drive's direct link can't export them). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const file = await prisma.lessonFile.findUnique({ where: { driveId: id } });
  if (!file) return new NextResponse("Not found", { status: 404 });

  const { data, mimeType } = await downloadFile(file.driveId, file.mimeType);
  const base = file.title.split(" / ").pop() || "file";
  const name = mimeType === "application/pdf" && !base.toLowerCase().endsWith(".pdf") ? `${base}.pdf` : base;

  return new NextResponse(new Uint8Array(data), {
    headers: {
      "content-type": mimeType,
      "content-disposition": `attachment; filename*=UTF-8''${encodeURIComponent(name)}`,
      "cache-control": "public, max-age=3600",
    },
  });
}
