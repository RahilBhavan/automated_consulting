import { NextResponse } from "next/server";
import { getProspectById, getPipelineEntryByProspectId } from "@/lib/db";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const prospect = await getProspectById(id);
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }
    const entry = await getPipelineEntryByProspectId(id);
    return NextResponse.json({ prospect, pipelineEntry: entry ?? null });
  } catch (e) {
    console.error("GET /api/prospects/[id]", e);
    return NextResponse.json(
      { error: "Failed to load prospect" },
      { status: 500 }
    );
  }
}
