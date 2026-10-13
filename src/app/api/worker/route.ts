import { NextResponse, after } from "next/server";
import { isAuthorized, kickWorker, runWorker } from "@/lib/worker";

export const maxDuration = 300;

/** Processes pending lessons, then re-invokes itself while work remains. */
export async function GET(req: Request) {
  if (!isAuthorized(req)) return new NextResponse("Unauthorized", { status: 401 });

  const result = await runWorker();
  if (result.remaining > 0 && result.done.length + result.failed.length > 0) {
    after(() => kickWorker(new URL(req.url).origin));
  }
  return NextResponse.json(result);
}
