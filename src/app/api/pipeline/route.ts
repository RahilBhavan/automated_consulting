import { NextResponse } from "next/server";
import { readPipeline, writePipeline } from "@/lib/db";
import type { PipelineEntry, PipelineStatus } from "@/types/pipeline";
import { PIPELINE_STATUSES } from "@/types/pipeline";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status");
    let list = await readPipeline();
    if (status != null && status !== "") {
      const s = status as PipelineStatus;
      if (PIPELINE_STATUSES.includes(s)) list = list.filter((e) => e.status === s);
    }
    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/pipeline", e);
    return NextResponse.json(
      { error: "Failed to load pipeline" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      prospectId,
      status,
      notes,
      contactedAt,
      followUpAt,
      estimatedValue,
      revenue,
    } = body as Partial<PipelineEntry> & { prospectId: string };

    if (!prospectId || typeof prospectId !== "string") {
      return NextResponse.json(
        { error: "prospectId is required" },
        { status: 400 }
      );
    }

    const entries = await readPipeline();
    const now = new Date().toISOString();
    const existing = entries.findIndex((e) => e.prospectId === prospectId);

    const newEntry: PipelineEntry = {
      prospectId,
      status: PIPELINE_STATUSES.includes(status as PipelineStatus) ? (status as PipelineStatus) : "Uncontacted",
      notes: notes ?? undefined,
      contactedAt: contactedAt ?? undefined,
      followUpAt: followUpAt ?? undefined,
      estimatedValue:
        typeof estimatedValue === "number" ? estimatedValue : undefined,
      revenue: typeof revenue === "number" ? revenue : undefined,
      updatedAt: now,
    };

    if (existing >= 0) {
      entries[existing] = { ...entries[existing], ...newEntry };
    } else {
      entries.push(newEntry);
    }

    await writePipeline(entries);
    return NextResponse.json(entries.find((e) => e.prospectId === prospectId));
  } catch (e) {
    console.error("POST /api/pipeline", e);
    return NextResponse.json(
      { error: "Failed to update pipeline" },
      { status: 500 }
    );
  }
}
