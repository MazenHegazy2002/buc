import { NextResponse, after } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncDrive } from "@/lib/sync";
import { isAuthorized, kickWorker } from "@/lib/worker";

export const maxDuration = 300;

/** Daily at 8:00 PM Cairo (see vercel.json). Mirrors Drive, then starts the AI worker. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const run = await prisma.syncRun.create({ data: {} });
  try {
    const stats = await syncDrive();
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: true, stats },
    });
    after(() => kickWorker(new URL(req.url).origin));
    return NextResponse.json({ ok: true, stats });
  } catch (e) {
    const error = e instanceof Error ? e.message : String(e);
    await prisma.syncRun.update({
      where: { id: run.id },
      data: { finishedAt: new Date(), ok: false, error },
    });
    return NextResponse.json({ ok: false, error }, { status: 500 });
  }
}
