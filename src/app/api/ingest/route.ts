import { NextResponse } from "next/server";

/**
 * Ingestion is run by GitHub Actions (see .github/workflows/ingest.yml), not by Vercel.
 * Serverless timeouts would cause this to fail. Use: bun run scripts/ingest.ts (with Supabase env).
 */
export async function POST() {
  return NextResponse.json(
    {
      error: "Ingestion is disabled on this host. Run via GitHub Actions or locally: bun run scripts/ingest.ts",
    },
    { status: 501 }
  );
}

export async function GET() {
  return NextResponse.json(
    {
      error: "Ingestion is disabled on this host. Run via GitHub Actions or locally: bun run scripts/ingest.ts",
    },
    { status: 501 }
  );
}
