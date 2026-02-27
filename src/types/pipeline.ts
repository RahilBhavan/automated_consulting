/**
 * Pipeline / CRM types for outreach tracking.
 */

export const PIPELINE_STATUSES = [
  "Uncontacted",
  "HookBuilding",
  "HookSent",
  "Replied",
  "DemoBuilt",
  "Converted",
] as const;

export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export type PipelineEntry = {
  prospectId: string;
  status: PipelineStatus;
  contactedAt?: string;
  notes?: string;
  followUpAt?: string;
  estimatedValue?: number;
  revenue?: number;
  updatedAt: string;
};
