import { z } from "zod";

// ── Core Play DSL ──────────────────────────────────────────────────

export const RoleSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: z.string(),
  responsibility: z.string(),
});

export const StepSchema = z.object({
  order: z.number().int().positive(),
  action: z.string(),
  actor: z.string(), // role id
  detail: z.string().optional(),
  timing: z.string().optional(), // e.g. "on snap", "2s after handoff"
});

export const TriggerSchema = z.object({
  name: z.string(),
  condition: z.string(),
  response: z.string(),
});

export const VariationSchema = z.object({
  name: z.string(),
  description: z.string(),
  stepOverrides: z.array(StepSchema).optional(),
});

export const FallbackSchema = z.object({
  trigger: z.string(),
  action: z.string(),
  detail: z.string().optional(),
});

export const PlaySchema = z.object({
  id: z.string(),
  name: z.string(),
  version: z.number().int().positive().default(1),
  sport: z.string(),
  category: z.string(), // e.g. "offense", "defense", "special teams"
  description: z.string(),
  roles: z.array(RoleSchema).min(1),
  steps: z.array(StepSchema).min(1),
  triggers: z.array(TriggerSchema),
  variations: z.array(VariationSchema),
  fallbacks: z.array(FallbackSchema),
  coachingPoints: z.array(z.string()),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  tags: z.array(z.string()).default([]),
  sourcePrompt: z.string(),
});

export type Role = z.infer<typeof RoleSchema>;
export type Step = z.infer<typeof StepSchema>;
export type Trigger = z.infer<typeof TriggerSchema>;
export type Variation = z.infer<typeof VariationSchema>;
export type Fallback = z.infer<typeof FallbackSchema>;
export type Play = z.infer<typeof PlaySchema>;

// ── Validation ─────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validatePlay(data: unknown): ValidationResult {
  const result = PlaySchema.safeParse(data);
  if (result.success) {
    return { valid: true, errors: [] };
  }
  return {
    valid: false,
    errors: result.error.issues.map(
      (i) => `${i.path.join(".")}: ${i.message}`
    ),
  };
}

// ── Engine types ───────────────────────────────────────────────────

export interface EngineResponse {
  adversaryReactions: Array<{
    scenario: string;
    probability: number; // 0-1
    description: string;
  }>;
  vulnerabilities: string[];
  strengthScore: number; // 0-100
  rawData?: unknown;
}

export interface Improvement {
  area: "steps" | "triggers" | "variations" | "fallbacks" | "roles";
  priority: "high" | "medium" | "low";
  suggestion: string;
  reason: string;
}

export interface EngineValidationResult {
  engineResponse: EngineResponse;
  improvements: Improvement[];
  overallAssessment: string;
}

// ── Feedback types ─────────────────────────────────────────────────

export interface FeedbackEntry {
  playId: string;
  playVersion: number;
  timestamp: string;
  clarity: number; // 1-5
  executionMatch: number; // 1-5
  edits: Array<{ field: string; before: string; after: string }>;
  notes: string;
}

export interface LearningMetrics {
  avgFlowTimeMs: number;
  exportSuccessRate: number;
  reuseRate: number;
  engineFailureRate: number;
  fallbackSuccessRate: number;
  totalPlaysGenerated: number;
  totalFeedbackEntries: number;
}

// ── Training plan types ────────────────────────────────────────────

export interface TrainingPlan {
  playId: string;
  playName: string;
  warmup: string[];
  walkthrough: string[];
  fullSpeed: string[];
  coachingCues: string[];
  duration: string;
}
