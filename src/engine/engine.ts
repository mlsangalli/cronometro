import type { Play, EngineResponse, EngineValidationResult, Improvement } from "../schema/play.js";

/**
 * Abstract engine interface. Implementations connect to real tactical
 * analysis engines (or use a mock for development).
 */
export interface TacticalEngine {
  readonly name: string;
  validate(play: Play): Promise<EngineResponse>;
}

/**
 * Configuration for engine calls (timeout, retries, fallback).
 */
export interface EngineConfig {
  timeoutMs: number;
  maxRetries: number;
  retryDelayMs: number;
}

const DEFAULT_CONFIG: EngineConfig = {
  timeoutMs: 15_000,
  maxRetries: 2,
  retryDelayMs: 1_000,
};

/**
 * Calls the engine with timeout + retry, then derives actionable improvements.
 */
export async function validateWithEngine(
  play: Play,
  engine: TacticalEngine,
  config: EngineConfig = DEFAULT_CONFIG
): Promise<EngineValidationResult> {
  let lastError: Error | undefined;

  for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
    try {
      const engineResponse = await callWithTimeout(
        () => engine.validate(play),
        config.timeoutMs
      );

      const improvements = deriveImprovements(play, engineResponse);
      const overallAssessment = buildAssessment(engineResponse, improvements);

      return { engineResponse, improvements, overallAssessment };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < config.maxRetries) {
        await sleep(config.retryDelayMs * (attempt + 1));
      }
    }
  }

  // All retries exhausted — return fallback assessment
  return buildFallbackResult(play, lastError);
}

// ── Timeout wrapper ────────────────────────────────────────────────

function callWithTimeout<T>(fn: () => Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Engine timeout after ${ms}ms`)), ms);
    fn()
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ── Improvement derivation ─────────────────────────────────────────

function deriveImprovements(play: Play, response: EngineResponse): Improvement[] {
  const improvements: Improvement[] = [];

  // High-probability adversary reactions → suggest countermeasures
  const highProbReactions = response.adversaryReactions.filter((r) => r.probability >= 0.6);
  for (const reaction of highProbReactions) {
    improvements.push({
      area: "variations",
      priority: "high",
      suggestion: `Add variation to counter: "${reaction.scenario}"`,
      reason: `Adversary likely responds this way (${(reaction.probability * 100).toFixed(0)}% probability): ${reaction.description}`,
    });
  }

  // Vulnerabilities → suggest step/trigger adjustments
  for (const vuln of response.vulnerabilities) {
    improvements.push({
      area: "steps",
      priority: "high",
      suggestion: `Address vulnerability: ${vuln}`,
      reason: "Engine identified this as a structural weakness",
    });
  }

  // Low strength → suggest more fallbacks
  if (response.strengthScore < 50) {
    improvements.push({
      area: "fallbacks",
      priority: "medium",
      suggestion: "Add additional fallback options — play has below-average resilience",
      reason: `Strength score: ${response.strengthScore}/100`,
    });
  }

  // Missing triggers for likely scenarios
  if (highProbReactions.length > play.triggers.length) {
    improvements.push({
      area: "triggers",
      priority: "medium",
      suggestion: "Add more read triggers to cover likely adversary reactions",
      reason: `${highProbReactions.length} likely scenarios but only ${play.triggers.length} triggers defined`,
    });
  }

  // Role coverage
  if (play.roles.length < 4) {
    improvements.push({
      area: "roles",
      priority: "low",
      suggestion: "Consider defining more roles for better coverage",
      reason: "Fewer roles may leave gaps in execution assignments",
    });
  }

  return improvements;
}

function buildAssessment(response: EngineResponse, improvements: Improvement[]): string {
  const highCount = improvements.filter((i) => i.priority === "high").length;
  const score = response.strengthScore;

  if (score >= 75 && highCount === 0) {
    return `Strong play (${score}/100). No critical issues found. ${improvements.length} minor suggestions available.`;
  }
  if (score >= 50) {
    return `Decent play (${score}/100). ${highCount} high-priority improvements recommended. Address adversary counters to strengthen.`;
  }
  return `Play needs work (${score}/100). ${highCount} critical improvements needed. Review vulnerabilities and add counters before game use.`;
}

function buildFallbackResult(play: Play, error?: Error): EngineValidationResult {
  return {
    engineResponse: {
      adversaryReactions: [],
      vulnerabilities: [],
      strengthScore: -1,
      rawData: { error: error?.message ?? "Unknown engine failure" },
    },
    improvements: [
      {
        area: "steps",
        priority: "medium",
        suggestion: "Engine unavailable — manually review play structure against scouting report",
        reason: error?.message ?? "Engine connection failed after retries",
      },
    ],
    overallAssessment: `Engine validation unavailable (${error?.message ?? "unknown error"}). Play structure is valid — recommend manual review before game use.`,
  };
}
