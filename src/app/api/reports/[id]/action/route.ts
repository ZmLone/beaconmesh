import { NextRequest, NextResponse } from "next/server";
import { appendReportUpdate, mutateReport } from "@/lib/store";

export async function POST(
  request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid alert ID." }, { status: 400 });
  }

  try {
    const body = await request.json();
    const action = String(body.action || "");

    if (action === "verify") {
      const updated = await mutateReport(id, (cur) => ({
        ...cur,
        verifications: cur.verifications + 1
      }));
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ report: updated });
    }

    if (action === "respond") {
      const updated = await mutateReport(id, (cur) => ({
        ...cur,
        respondersCount: (cur.respondersCount ?? 0) + 1
      }));
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ report: updated });
    }

    if (action === "resolve") {
      const updated = await mutateReport(id, (cur) => ({
        ...cur,
        resolved: true,
        expiresAt: Math.min(cur.expiresAt, Date.now() + 30 * 60 * 1000)
      }));
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ report: updated });
    }

    if (action === "flag") {
      const updated = await mutateReport(id, (cur) => {
        const nextFlags = (cur.flagsCount ?? 0) + 1;
        if (nextFlags >= 3) return null; // Auto-hide after 3 community flags
        return { ...cur, flagsCount: nextFlags };
      });
      return NextResponse.json({ report: updated, hidden: updated === null });
    }

    if (action === "comment") {
      const text = String(body.text || "").trim();
      const author = String(body.author || "Neighbor").trim();
      if (!text) {
        return NextResponse.json({ error: "Empty update" }, { status: 400 });
      }
      const updated = await appendReportUpdate(id, author, text);
      if (!updated) return NextResponse.json({ error: "Not found" }, { status: 404 });
      return NextResponse.json({ report: updated });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }
}
