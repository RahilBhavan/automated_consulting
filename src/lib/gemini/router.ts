/**
 * Gemini API router — email draft and deliverable spec.
 * Same result types as Claude router so the UI can use either provider.
 */

import { GoogleGenAI } from "@google/genai";
import type { Prospect } from "@/types/prospect";

export type EmailDraftResult = { emailBody: string; subject?: string };
export type DeliverableSpecResult = {
  spec: string;
  techStack: string;
  hours: string;
  priceRange: string;
  proofOfWorkParagraph: string;
};

function getClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY ?? process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GEMINI_API_KEY or GOOGLE_API_KEY is required for Gemini");
  return new GoogleGenAI({ apiKey });
}

function buildContext(prospect: Prospect): string {
  const signals = prospect.painSignals
    .filter((s) => s.points > 0)
    .map((s) => `- ${s.key}: ${s.explanation}`)
    .join("\n");
  return `
Project: ${prospect.name}
Category: ${prospect.category}
TVL: $${(prospect.tvl / 1e6).toFixed(2)}M
Pain signals:
${signals}
`.trim();
}

/** Extract JSON object from a string that may contain markdown code blocks or surrounding text. */
function parseJsonFromText(text: string): Record<string, unknown> | null {
  const trimmed = text.trim();
  const codeBlock = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = codeBlock ? codeBlock[1].trim() : trimmed;
  try {
    const parsed = JSON.parse(raw) as unknown;
    return typeof parsed === "object" && parsed !== null ? (parsed as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}

export async function generateEmailDraft(prospect: Prospect): Promise<EmailDraftResult> {
  const context = buildContext(prospect);
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are a freelance financial dashboard consultant. Write a short, professional cold outreach email.

Using this prospect context, write ONE short outreach email (2-4 sentences). The email should:
1. Cite one specific pain signal from the list that fits this project.
2. Include a placeholder like "[Link to 30-min proof-of-work: e.g. Figma wireframe / Loom / data insight]" for the Tier 1 Hook.
3. End with a soft pitch for a full interactive dashboard.

Prospect context:
${context}

Respond with a JSON object only, no other text, with this exact shape:
{"emailBody": "your email body text", "subject": "optional subject line"}`,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  });

  const text = response.text ?? "";
  const obj = parseJsonFromText(text);
  if (obj && typeof obj.emailBody === "string") {
    return {
      emailBody: obj.emailBody,
      subject: typeof obj.subject === "string" ? obj.subject : undefined,
    };
  }
  return { emailBody: text || "Could not generate draft." };
}

export async function generateDeliverableSpec(
  prospect: Prospect,
  deliverableTitle: string
): Promise<DeliverableSpecResult> {
  const context = buildContext(prospect);
  const ai = getClient();
  const response = await ai.models.generateContent({
    model: "gemini-2.0-flash",
    contents: `You are a freelance financial dashboard consultant. Output structured deliverable specs.

Prospect context:
${context}

Deliverable type: ${deliverableTitle}

Suggest: (1) tech stack, (2) estimated build hours, (3) suggested price range, (4) one short paragraph (2-4 sentences) for a "proof of work" email template personalized to this project and deliverable.

Respond with a JSON object only, no other text, with this exact shape:
{"techStack": "e.g. React, Streamlit, Python", "hours": "estimated hours as string", "priceRange": "e.g. $2,500–$5,000", "proofOfWorkParagraph": "2-4 sentence paragraph"}`,
    config: {
      maxOutputTokens: 1024,
      temperature: 0.7,
    },
  });

  const text = response.text ?? "";
  const obj = parseJsonFromText(text);
  if (obj && typeof obj.techStack === "string" && typeof obj.proofOfWorkParagraph === "string") {
    return {
      spec: "",
      techStack: obj.techStack,
      hours: typeof obj.hours === "string" ? obj.hours : "—",
      priceRange: typeof obj.priceRange === "string" ? obj.priceRange : "—",
      proofOfWorkParagraph: obj.proofOfWorkParagraph,
    };
  }
  return {
    spec: "",
    techStack: "—",
    hours: "—",
    priceRange: "—",
    proofOfWorkParagraph: text || "Structured output unavailable.",
  };
}
