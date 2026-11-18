import { NextRequest, NextResponse } from "next/server";
import { markReportResolved } from "@/lib/store";

export async function POST(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  const { id } = await context.params;
  if (!id || id.length > 64) {
    return NextResponse.json({ error: "Invalid report ID." }, { status: 400 });
  }

  const updated = await markReportResolved(id);
  if (!updated) {
    return NextResponse.json(
      { error: "Report not found or already expired." },
      { status: 404 }
    );
  }

  return NextResponse.json({ report: updated });
}
