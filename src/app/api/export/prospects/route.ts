import { NextResponse } from "next/server";
import { readProspects } from "@/lib/db";

/**
 * GET /api/export/prospects?format=csv — CSV export of current prospects.
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") ?? "json";
    const prospects = await readProspects();

    if (format === "csv") {
      const header =
        "id,name,slug,category,tvl,mcap,painScore,treasuryGated,signals,lastUpdated";
      const rows = prospects.map((p) => {
        const signals = p.painSignals.map((s) => `${s.key}:${s.points}`).join("; ");
        return [
          p.id,
          `"${(p.name ?? "").replace(/"/g, '""')}"`,
          p.slug,
          `"${(p.category ?? "").replace(/"/g, '""')}"`,
          p.tvl,
          p.mcap ?? "",
          p.painScore,
          p.treasuryGated ? "1" : "0",
          `"${signals.replace(/"/g, '""')}"`,
          p.lastUpdated,
        ].join(",");
      });
      const csv = [header, ...rows].join("\n");
      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="prospects-${new Date().toISOString().slice(0, 10)}.csv"`,
        },
      });
    }

    return NextResponse.json(prospects);
  } catch (e) {
    console.error("GET /api/export/prospects", e);
    return NextResponse.json(
      { error: "Export failed" },
      { status: 500 }
    );
  }
}
