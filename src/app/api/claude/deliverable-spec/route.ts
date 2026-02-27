import { NextResponse } from "next/server";
import { readProspects } from "@/lib/db";
import { generateDeliverableSpec } from "@/lib/claude/router";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prospectId, deliverableId, deliverableTitle } = body as {
      prospectId?: string;
      deliverableId?: string;
      deliverableTitle?: string;
    };
    if (!prospectId || typeof prospectId !== "string") {
      return NextResponse.json(
        { error: "prospectId is required" },
        { status: 400 }
      );
    }

    const prospects = await readProspects();
    const prospect = prospects.find((p) => p.id === prospectId);
    if (!prospect) {
      return NextResponse.json({ error: "Prospect not found" }, { status: 404 });
    }

    let title = deliverableTitle;
    if (!title && deliverableId) {
      const rec = prospect.deliverableRecommendations.find(
        (r) => r.deliverableId === deliverableId
      );
      title = rec?.title ?? deliverableId;
    }
    if (!title) title = "Custom dashboard";

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json(
        { error: "ANTHROPIC_API_KEY not configured" },
        { status: 503 }
      );
    }

    const result = await generateDeliverableSpec(prospect, title);
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/claude/deliverable-spec", e);
    return NextResponse.json(
      { error: "Failed to generate deliverable spec", details: String(e) },
      { status: 500 }
    );
  }
}
