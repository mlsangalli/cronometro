import { nanoid } from "nanoid";
import type { Play, TrainingPlan } from "../schema/play.js";

/**
 * Parses a natural-language play description into a structured Play object.
 *
 * Uses heuristic NLP (keyword extraction, sentence segmentation) to build
 * the play structure. Designed to be replaced/augmented by an LLM call
 * while keeping the same interface.
 */
export function generatePlay(prompt: string, sport?: string): Play {
  const now = new Date().toISOString();
  const id = nanoid(12);
  const detectedSport = sport ?? detectSport(prompt);
  const name = extractPlayName(prompt);
  const roles = extractRoles(prompt, detectedSport);
  const steps = extractSteps(prompt, roles);
  const triggers = extractTriggers(prompt);
  const variations = extractVariations(prompt);
  const fallbacks = extractFallbacks(prompt);
  const coachingPoints = extractCoachingPoints(prompt, steps);

  return {
    id,
    name,
    version: 1,
    sport: detectedSport,
    category: detectCategory(prompt),
    description: prompt,
    roles,
    steps,
    triggers,
    variations,
    fallbacks,
    coachingPoints,
    createdAt: now,
    updatedAt: now,
    tags: extractTags(prompt),
    sourcePrompt: prompt,
  };
}

// ── Training plan generation ───────────────────────────────────────

export function generateTrainingPlan(play: Play): TrainingPlan {
  const walkthrough = play.steps.map(
    (s) => `Step ${s.order}: ${s.actor} — ${s.action}${s.detail ? ` (${s.detail})` : ""}`
  );

  const warmup = [
    `Review roles: ${play.roles.map((r) => r.name).join(", ")}`,
    "Dynamic stretching / sport-specific warm-up",
    "Walk through formation at half speed",
  ];

  const fullSpeed = [
    "Run play at full speed vs. scout team",
    ...play.variations.map((v) => `Variation drill: ${v.name} — ${v.description}`),
    ...play.fallbacks.map((f) => `Fallback rep: on "${f.trigger}" → ${f.action}`),
  ];

  const coachingCues = [
    ...play.coachingPoints,
    ...play.triggers.map((t) => `Trigger "${t.name}": when ${t.condition} → ${t.response}`),
  ];

  return {
    playId: play.id,
    playName: play.name,
    warmup,
    walkthrough,
    fullSpeed,
    coachingCues,
    duration: estimateDuration(play),
  };
}

// ── Internal helpers ───────────────────────────────────────────────

const SPORT_KEYWORDS: Record<string, string[]> = {
  football: ["quarterback", "qb", "receiver", "wr", "running back", "rb", "offensive line", "linebacker", "snap", "handoff", "pass", "blitz", "end zone", "touchdown", "football"],
  basketball: ["point guard", "pg", "shooting guard", "sg", "center", "forward", "pick", "screen", "dribble", "layup", "three-pointer", "basketball", "court", "hoop"],
  soccer: ["goalkeeper", "gk", "striker", "midfielder", "defender", "winger", "corner kick", "free kick", "offside", "penalty", "soccer", "football pitch", "goal kick"],
  volleyball: ["setter", "libero", "hitter", "blocker", "serve", "spike", "dig", "volleyball", "rotation"],
  futsal: ["fixo", "ala", "pivô", "goleiro", "futsal", "quadra"],
};

function detectSport(prompt: string): string {
  const lower = prompt.toLowerCase();
  let best = "football";
  let bestScore = 0;
  for (const [sport, keywords] of Object.entries(SPORT_KEYWORDS)) {
    const score = keywords.filter((k) => lower.includes(k)).length;
    if (score > bestScore) {
      bestScore = score;
      best = sport;
    }
  }
  return best;
}

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  offense: ["attack", "offense", "offensive", "scoring", "ataque", "ofensiv"],
  defense: ["defense", "defensive", "defend", "block", "defesa", "defensiv"],
  transition: ["transition", "counter", "fast break", "transição", "contra-ataque"],
  "special teams": ["special teams", "kickoff", "punt", "field goal"],
  "set piece": ["set piece", "corner", "free kick", "jogada ensaiada", "bola parada"],
};

function detectCategory(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [cat, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) return cat;
  }
  return "offense";
}

function extractPlayName(prompt: string): string {
  // Use first sentence or first 60 chars as name
  const firstSentence = prompt.split(/[.!?\n]/)[0].trim();
  if (firstSentence.length <= 60) return firstSentence;
  return firstSentence.substring(0, 57) + "...";
}

interface RoleEntry {
  id: string;
  name: string;
  position: string;
  responsibility: string;
}

const DEFAULT_ROLES: Record<string, RoleEntry[]> = {
  football: [
    { id: "qb", name: "Quarterback", position: "QB", responsibility: "Read defense and execute pass/handoff" },
    { id: "wr1", name: "Wide Receiver 1", position: "WR", responsibility: "Run route and create separation" },
    { id: "wr2", name: "Wide Receiver 2", position: "WR", responsibility: "Run complementary route" },
    { id: "rb", name: "Running Back", position: "RB", responsibility: "Block or run route from backfield" },
    { id: "ol", name: "Offensive Line", position: "OL", responsibility: "Pass/run protection" },
  ],
  basketball: [
    { id: "pg", name: "Point Guard", position: "PG", responsibility: "Initiate play and distribute" },
    { id: "sg", name: "Shooting Guard", position: "SG", responsibility: "Off-ball movement and scoring" },
    { id: "sf", name: "Small Forward", position: "SF", responsibility: "Cut and space the floor" },
    { id: "pf", name: "Power Forward", position: "PF", responsibility: "Set screens and roll" },
    { id: "c", name: "Center", position: "C", responsibility: "Post presence and rim protection" },
  ],
  soccer: [
    { id: "gk", name: "Goalkeeper", position: "GK", responsibility: "Start build-up and distribute" },
    { id: "cb", name: "Center Back", position: "CB", responsibility: "Hold defensive line" },
    { id: "mid", name: "Midfielder", position: "MF", responsibility: "Link play and control tempo" },
    { id: "wing", name: "Winger", position: "WG", responsibility: "Provide width and crosses" },
    { id: "st", name: "Striker", position: "ST", responsibility: "Finish and press high" },
  ],
  volleyball: [
    { id: "setter", name: "Setter", position: "S", responsibility: "Set the ball for attackers" },
    { id: "oh", name: "Outside Hitter", position: "OH", responsibility: "Primary attack option" },
    { id: "mb", name: "Middle Blocker", position: "MB", responsibility: "Quick attack and block" },
    { id: "opp", name: "Opposite", position: "OPP", responsibility: "Right-side attack" },
    { id: "libero", name: "Libero", position: "L", responsibility: "Defensive specialist and reception" },
  ],
  futsal: [
    { id: "goleiro", name: "Goleiro", position: "GK", responsibility: "Defesa do gol e reposição" },
    { id: "fixo", name: "Fixo", position: "FX", responsibility: "Organizar defesa e iniciar jogada" },
    { id: "ala1", name: "Ala Direita", position: "AD", responsibility: "Movimentação e finalização" },
    { id: "ala2", name: "Ala Esquerda", position: "AE", responsibility: "Movimentação e finalização" },
    { id: "pivo", name: "Pivô", position: "PV", responsibility: "Referência no ataque e pivoteamento" },
  ],
};

function extractRoles(prompt: string, sport: string): RoleEntry[] {
  const defaults = DEFAULT_ROLES[sport] ?? DEFAULT_ROLES.football;
  const lower = prompt.toLowerCase();

  // Try to find mentioned roles, fall back to defaults
  const mentioned = defaults.filter(
    (r) =>
      lower.includes(r.name.toLowerCase()) ||
      lower.includes(r.position.toLowerCase()) ||
      lower.includes(r.id)
  );

  return mentioned.length >= 2 ? mentioned : defaults;
}

function extractSteps(prompt: string, roles: RoleEntry[]): Array<{
  order: number;
  action: string;
  actor: string;
  detail?: string;
  timing?: string;
}> {
  const sentences = prompt
    .split(/[.!?\n]/)
    .map((s) => s.trim())
    .filter((s) => s.length > 5);

  // Action verbs that indicate steps
  const actionVerbs = [
    "pass", "run", "cut", "screen", "block", "shoot", "dribble",
    "handoff", "roll", "fade", "cross", "move", "set", "pick",
    "receive", "throw", "catch", "sprint", "flare", "curl",
    "passa", "corre", "corta", "bloqueia", "chuta", "dribla",
    "recebe", "lança", "arremessa",
  ];

  const steps: Array<{
    order: number;
    action: string;
    actor: string;
    detail?: string;
    timing?: string;
  }> = [];

  let order = 1;
  for (const sentence of sentences) {
    const lower = sentence.toLowerCase();
    const hasAction = actionVerbs.some((v) => lower.includes(v));
    if (!hasAction && order > 1) continue;

    // Find which role is the actor
    let actor = roles[0].id;
    for (const role of roles) {
      if (
        lower.includes(role.name.toLowerCase()) ||
        lower.includes(role.id.toLowerCase())
      ) {
        actor = role.id;
        break;
      }
    }

    steps.push({
      order,
      action: sentence,
      actor,
    });
    order++;
  }

  // Ensure at least 3 steps
  if (steps.length === 0) {
    const defaultSteps = [
      { order: 1, action: "Formation setup", actor: roles[0].id, timing: "pre-snap" },
      { order: 2, action: "Initial action on signal", actor: roles[0].id, timing: "on signal" },
      { order: 3, action: "Execute primary option", actor: roles[1]?.id ?? roles[0].id },
    ];
    return defaultSteps;
  }

  return steps;
}

function extractTriggers(prompt: string): Array<{
  name: string;
  condition: string;
  response: string;
}> {
  const lower = prompt.toLowerCase();
  const triggers: Array<{ name: string; condition: string; response: string }> = [];

  const triggerPatterns = [
    { keyword: "if", name: "Conditional read" },
    { keyword: "when", name: "Situational trigger" },
    { keyword: "se ", name: "Leitura condicional" },
    { keyword: "quando", name: "Gatilho situacional" },
  ];

  const sentences = prompt.split(/[.!?\n]/).map((s) => s.trim());
  for (const sentence of sentences) {
    const sentLower = sentence.toLowerCase();
    for (const pattern of triggerPatterns) {
      if (sentLower.startsWith(pattern.keyword) || sentLower.includes(` ${pattern.keyword} `)) {
        triggers.push({
          name: pattern.name,
          condition: sentence,
          response: "Adjust based on read",
        });
        break;
      }
    }
  }

  // Default trigger if none found
  if (triggers.length === 0) {
    triggers.push({
      name: "Base read",
      condition: "Defense shows expected alignment",
      response: "Execute primary play as designed",
    });
  }

  return triggers;
}

function extractVariations(prompt: string): Array<{
  name: string;
  description: string;
}> {
  const lower = prompt.toLowerCase();
  const variations: Array<{ name: string; description: string }> = [];

  // Look for explicit variations
  const variationKeywords = ["variation", "option", "alternative", "variação", "opção", "alternativa"];
  const sentences = prompt.split(/[.!?\n]/).map((s) => s.trim());

  for (const sentence of sentences) {
    const sentLower = sentence.toLowerCase();
    if (variationKeywords.some((k) => sentLower.includes(k))) {
      variations.push({ name: `Option: ${sentence.substring(0, 40)}`, description: sentence });
    }
  }

  // Default variation
  if (variations.length === 0) {
    variations.push({
      name: "Mirror",
      description: "Run the same play mirrored to the opposite side",
    });
  }

  return variations;
}

function extractFallbacks(prompt: string): Array<{
  trigger: string;
  action: string;
  detail?: string;
}> {
  const lower = prompt.toLowerCase();
  const fallbacks: Array<{ trigger: string; action: string; detail?: string }> = [];

  const fallbackKeywords = ["fallback", "bail out", "safety", "emergency", "abort", "escape", "segurança", "emergência"];
  const sentences = prompt.split(/[.!?\n]/).map((s) => s.trim());

  for (const sentence of sentences) {
    const sentLower = sentence.toLowerCase();
    if (fallbackKeywords.some((k) => sentLower.includes(k))) {
      fallbacks.push({ trigger: "Play breaks down", action: sentence });
    }
  }

  if (fallbacks.length === 0) {
    fallbacks.push({
      trigger: "Primary option covered / play breaks down",
      action: "Reset to safe position or take best available option",
      detail: "Communicate loudly, protect possession",
    });
  }

  return fallbacks;
}

function extractCoachingPoints(
  prompt: string,
  steps: Array<{ order: number; action: string; actor: string }>
): string[] {
  const points: string[] = [];

  points.push(`Key timing: execute steps in sequence (${steps.length} steps total)`);

  if (steps.length > 3) {
    points.push("Rehearse steps 1-3 first before adding the full sequence");
  }

  points.push("Communication is critical — call out reads and adjustments loudly");
  points.push("On breakdown, execute fallback immediately — don't freelance");

  return points;
}

function extractTags(prompt: string): string[] {
  const tags: string[] = [];
  const lower = prompt.toLowerCase();

  const tagMap: Record<string, string[]> = {
    "quick": ["quick", "fast", "rápid"],
    "power": ["power", "strong", "força"],
    "misdirection": ["fake", "misdirection", "trick", "finta"],
    "screen": ["screen", "pick", "bloqueio"],
    "zone": ["zone", "zona"],
    "man": ["man-to-man", "individual", "homem-a-homem"],
  };

  for (const [tag, keywords] of Object.entries(tagMap)) {
    if (keywords.some((k) => lower.includes(k))) tags.push(tag);
  }

  return tags;
}

function estimateDuration(play: Play): string {
  const base = 15; // minutes for warmup
  const perStep = 3;
  const perVariation = 5;
  const total = base + play.steps.length * perStep + play.variations.length * perVariation;
  return `~${total} min`;
}
