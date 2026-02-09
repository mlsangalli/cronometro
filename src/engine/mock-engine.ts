import type { Play, EngineResponse } from "../schema/play.js";
import type { TacticalEngine } from "./engine.js";

/**
 * Mock engine for development and testing.
 * Produces deterministic-ish responses based on play structure analysis.
 */
export class MockTacticalEngine implements TacticalEngine {
  readonly name = "mock-tactical-v1";

  async validate(play: Play): Promise<EngineResponse> {
    // Simulate latency
    await new Promise((r) => setTimeout(r, 50 + Math.random() * 100));

    const adversaryReactions = generateReactions(play);
    const vulnerabilities = findVulnerabilities(play);
    const strengthScore = computeStrength(play, vulnerabilities);

    return {
      adversaryReactions,
      vulnerabilities,
      strengthScore,
    };
  }
}

/**
 * A mock engine that always fails — used for testing fallback behavior.
 */
export class FailingEngine implements TacticalEngine {
  readonly name = "failing-engine";

  async validate(_play: Play): Promise<EngineResponse> {
    throw new Error("Simulated engine failure");
  }
}

// ── Internal helpers ───────────────────────────────────────────────

function generateReactions(play: Play): EngineResponse["adversaryReactions"] {
  const reactions: EngineResponse["adversaryReactions"] = [];

  // Generic reactions based on play category
  if (play.category === "offense") {
    reactions.push({
      scenario: "Zone coverage adjustment",
      probability: 0.65,
      description: "Defense shifts to zone coverage to contain primary routes/movements",
    });
    reactions.push({
      scenario: "Blitz / high press",
      probability: 0.35,
      description: "Aggressive pressure to disrupt timing before play develops",
    });
  } else if (play.category === "defense") {
    reactions.push({
      scenario: "Quick release / short passing",
      probability: 0.55,
      description: "Offense opts for quick short options to beat defensive pressure",
    });
  }

  // More reactions based on step count (complexity)
  if (play.steps.length > 4) {
    reactions.push({
      scenario: "Disruption at transition point",
      probability: 0.5,
      description: "Opponent targets the handoff/transition between steps 3-4 where timing is critical",
    });
  }

  // If few variations, opponent can key in
  if (play.variations.length <= 1) {
    reactions.push({
      scenario: "Pattern recognition",
      probability: 0.7,
      description: "With limited variations, opponents can predict and pre-rotate to counter",
    });
  }

  return reactions;
}

function findVulnerabilities(play: Play): string[] {
  const vulns: string[] = [];

  if (play.fallbacks.length < 2) {
    vulns.push("Limited fallback options — if primary breaks down, recovery is difficult");
  }

  if (play.triggers.length < 2) {
    vulns.push("Insufficient read triggers — may not adapt well to different defensive looks");
  }

  const uniqueActors = new Set(play.steps.map((s) => s.actor));
  if (uniqueActors.size < play.roles.length * 0.5) {
    vulns.push("Ball/action concentrated in few roles — easier to scout and key on");
  }

  if (play.steps.length > 6) {
    vulns.push("High step count increases execution complexity and breakdown risk");
  }

  return vulns;
}

function computeStrength(play: Play, vulnerabilities: string[]): number {
  let score = 60; // base

  // Positive factors
  score += Math.min(play.variations.length * 5, 15);
  score += Math.min(play.triggers.length * 5, 10);
  score += Math.min(play.fallbacks.length * 5, 10);
  score += play.coachingPoints.length >= 3 ? 5 : 0;

  // Negative factors
  score -= vulnerabilities.length * 8;
  if (play.steps.length > 6) score -= 5;
  if (play.roles.length < 3) score -= 10;

  return Math.max(0, Math.min(100, score));
}
