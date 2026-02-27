/**
 * Claude API router — email draft and deliverable spec via structured tool use.
 * Uses tool (function) calling so responses are valid JSON; no regex parsing.
 */

import Anthropic from "@anthropic-ai/sdk";
import type { Prospect } from "@/types/prospect";

const client = new Anthropic();

export type EmailDraftResult = { emailBody: string; subject?: string };
export type DeliverableSpecResult = {
  spec: string;
  techStack: string;
  hours: string;
  priceRange: string;
  proofOfWorkParagraph: string;
};

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

const EMAIL_TOOL = {
  name: "submit_email_draft",
  description: "Submit the final outreach email draft.",
  input_schema: {
    type: "object" as const,
    properties: {
      emailBody: { type: "string", description: "The email body text (2-4 sentences)." },
      subject: { type: "string", description: "Optional subject line." },
    },
    required: ["emailBody"],
    additionalProperties: false,
  },
};

const DELIVERABLE_SPEC_TOOL = {
  name: "submit_deliverable_spec",
  description: "Submit the deliverable spec and proof-of-work paragraph.",
  input_schema: {
    type: "object" as const,
    properties: {
      techStack: { type: "string", description: "e.g. React, Streamlit, Python" },
      hours: { type: "string", description: "Estimated build hours (number as string)" },
      priceRange: { type: "string", description: "e.g. $2,500–$5,000" },
      proofOfWorkParagraph: { type: "string", description: "2-4 sentence proof-of-work email paragraph" },
    },
    required: ["techStack", "hours", "priceRange", "proofOfWorkParagraph"],
    additionalProperties: false,
  },
};

export async function generateEmailDraft(prospect: Prospect): Promise<EmailDraftResult> {
  const context = buildContext(prospect);
  const { content } = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools: [{ ...EMAIL_TOOL, strict: true }],
    tool_choice: { type: "tool", name: EMAIL_TOOL.name },
    system: "You are a freelance financial dashboard consultant. Write a short, professional cold outreach email.",
    messages: [
      {
        role: "user",
        content: `Using this prospect context, write ONE short outreach email (2-4 sentences). The email should:
1. Cite one specific pain signal from the list that fits this project.
2. Include a placeholder like "[Link to 30-min proof-of-work: e.g. Figma wireframe / Loom / data insight]" for the Tier 1 Hook.
3. End with a soft pitch for a full interactive dashboard.

Prospect context:
${context}

Call the submit_email_draft tool with your email body (and optional subject).`,
      },
    ],
  });

  const toolUse = content.find((c) => c.type === "tool_use") as { type: "tool_use"; name: string; input: unknown } | undefined;
  if (toolUse?.name === EMAIL_TOOL.name && toolUse.input && typeof toolUse.input === "object") {
    const i = toolUse.input as { emailBody?: string; subject?: string };
    return {
      emailBody: typeof i.emailBody === "string" ? i.emailBody : "Could not generate draft.",
      subject: typeof i.subject === "string" ? i.subject : undefined,
    };
  }
  const text = content.find((c) => c.type === "text");
  const emailBody = text && "text" in text ? String(text.text) : "Could not generate draft.";
  return { emailBody };
}

export async function generateDeliverableSpec(
  prospect: Prospect,
  deliverableTitle: string
): Promise<DeliverableSpecResult> {
  const context = buildContext(prospect);
  const { content } = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 1024,
    tools: [{ ...DELIVERABLE_SPEC_TOOL, strict: true }],
    tool_choice: { type: "tool", name: DELIVERABLE_SPEC_TOOL.name },
    system: "You are a freelance financial dashboard consultant. Output structured deliverable specs.",
    messages: [
      {
        role: "user",
        content: `Prospect context:
${context}

Deliverable type: ${deliverableTitle}

Suggest: (1) tech stack, (2) estimated build hours, (3) suggested price range, (4) one short paragraph (2-4 sentences) for a "proof of work" email template personalized to this project and deliverable. Call the submit_deliverable_spec tool with these four fields.`,
      },
    ],
  });

  const toolUse = content.find((c) => c.type === "tool_use") as { type: "tool_use"; name: string; input: unknown } | undefined;
  if (toolUse?.name === DELIVERABLE_SPEC_TOOL.name && toolUse.input && typeof toolUse.input === "object") {
    const i = toolUse.input as {
      techStack?: string;
      hours?: string;
      priceRange?: string;
      proofOfWorkParagraph?: string;
    };
    return {
      spec: "",
      techStack: typeof i.techStack === "string" ? i.techStack : "—",
      hours: typeof i.hours === "string" ? i.hours : "—",
      priceRange: typeof i.priceRange === "string" ? i.priceRange : "—",
      proofOfWorkParagraph: typeof i.proofOfWorkParagraph === "string" ? i.proofOfWorkParagraph : "",
    };
  }
  return {
    spec: "",
    techStack: "—",
    hours: "—",
    priceRange: "—",
    proofOfWorkParagraph: "Structured output unavailable.",
  };
}
