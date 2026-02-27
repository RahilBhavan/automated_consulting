import { NextResponse } from "next/server";
import { readProspects } from "@/lib/db";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const minScore = searchParams.get("minScore");
    const category = searchParams.get("category");
    const limit = searchParams.get("limit");

    let list = await readProspects();

    if (minScore != null) {
      const n = parseFloat(minScore);
      if (!Number.isNaN(n)) list = list.filter((p) => p.painScore >= n);
    }
    if (category != null && category !== "") {
      list = list.filter(
        (p) => p.category?.toLowerCase() === category.toLowerCase()
      );
    }
    if (limit != null) {
      const n = parseInt(limit, 10);
      if (!Number.isNaN(n) && n > 0) list = list.slice(0, n);
    }

    return NextResponse.json(list);
  } catch (e) {
    console.error("GET /api/prospects", e);
    return NextResponse.json(
      { error: "Failed to load prospects" },
      { status: 500 }
    );
  }
}
