import type { Play, TrainingPlan, EngineValidationResult } from "../schema/play.js";

/**
 * Generates a 1-page text-based field card for quick reference during
 * training or pre-game. Designed to fit on one printed page.
 */
export function generateFieldCard(
  play: Play,
  plan: TrainingPlan,
  validation?: EngineValidationResult
): string {
  const lines: string[] = [];
  const divider = "═".repeat(60);
  const thinDivider = "─".repeat(60);

  // Header
  lines.push(divider);
  lines.push(center(`⬛ ${play.name.toUpperCase()} ⬛`));
  lines.push(center(`${play.sport.toUpperCase()} | ${play.category.toUpperCase()} | v${play.version}`));
  if (play.tags.length > 0) {
    lines.push(center(`Tags: ${play.tags.join(", ")}`));
  }
  lines.push(divider);

  // Roles
  lines.push("");
  lines.push("ROLES:");
  for (const role of play.roles) {
    lines.push(`  [${role.position}] ${role.name} — ${role.responsibility}`);
  }

  // Steps
  lines.push("");
  lines.push(thinDivider);
  lines.push("EXECUTION STEPS:");
  for (const step of play.steps) {
    const timing = step.timing ? ` (${step.timing})` : "";
    const detail = step.detail ? ` → ${step.detail}` : "";
    lines.push(`  ${step.order}. [${step.actor}] ${step.action}${timing}${detail}`);
  }

  // Triggers
  lines.push("");
  lines.push(thinDivider);
  lines.push("READS / TRIGGERS:");
  for (const trigger of play.triggers) {
    lines.push(`  ▸ ${trigger.name}: ${trigger.condition}`);
    lines.push(`    → ${trigger.response}`);
  }

  // Variations
  lines.push("");
  lines.push(thinDivider);
  lines.push("VARIATIONS:");
  for (const variation of play.variations) {
    lines.push(`  ◆ ${variation.name}: ${variation.description}`);
  }

  // Fallbacks
  lines.push("");
  lines.push(thinDivider);
  lines.push("FALLBACKS:");
  for (const fb of play.fallbacks) {
    lines.push(`  ⚠ On: ${fb.trigger}`);
    lines.push(`    → ${fb.action}`);
    if (fb.detail) lines.push(`      (${fb.detail})`);
  }

  // Coaching Points
  lines.push("");
  lines.push(thinDivider);
  lines.push("COACHING POINTS:");
  for (const point of play.coachingPoints) {
    lines.push(`  • ${point}`);
  }

  // Training plan summary
  lines.push("");
  lines.push(thinDivider);
  lines.push(`TRAINING PLAN (${plan.duration}):`);
  lines.push("  Warmup:");
  for (const w of plan.warmup) lines.push(`    - ${w}`);
  lines.push("  Walkthrough:");
  for (const w of plan.walkthrough) lines.push(`    - ${w}`);
  lines.push("  Full Speed:");
  for (const f of plan.fullSpeed) lines.push(`    - ${f}`);

  // Engine validation (if available)
  if (validation) {
    lines.push("");
    lines.push(thinDivider);
    lines.push("ENGINE ASSESSMENT:");
    lines.push(`  ${validation.overallAssessment}`);

    if (validation.engineResponse.strengthScore >= 0) {
      lines.push("");
      lines.push("  Likely adversary reactions:");
      for (const reaction of validation.engineResponse.adversaryReactions) {
        lines.push(`    ${(reaction.probability * 100).toFixed(0)}% — ${reaction.scenario}: ${reaction.description}`);
      }
    }

    const highImprovements = validation.improvements.filter((i) => i.priority === "high");
    if (highImprovements.length > 0) {
      lines.push("");
      lines.push("  Priority improvements:");
      for (const imp of highImprovements) {
        lines.push(`    ★ [${imp.area}] ${imp.suggestion}`);
        lines.push(`      Reason: ${imp.reason}`);
      }
    }
  }

  lines.push("");
  lines.push(divider);
  lines.push(center(`Generated: ${new Date().toISOString().split("T")[0]} | Play ID: ${play.id}`));
  lines.push(divider);

  return lines.join("\n");
}

function center(text: string, width = 60): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2));
  return " ".repeat(pad) + text;
}
