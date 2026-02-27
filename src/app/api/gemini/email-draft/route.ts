import { NextResponse } from "next/server";
import { readProspects } from "@/lib/db";
import { generateEmailDraft } from "@/lib/gemini/router";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { prospectId } = body as { prospectId?: string };
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

    const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "GEMINI_API_KEY or GOOGLE_API_KEY not configured" },
        { status: 503 }
      );
    }

    const result = await generateEmailDraft(prospect);
    return NextResponse.json(result);
  } catch (e) {
    console.error("POST /api/gemini/email-draft", e);
    return NextResponse.json(
      { error: "Failed to generate email draft", details: String(e) },
      { status: 500 }
    );
  }
}
