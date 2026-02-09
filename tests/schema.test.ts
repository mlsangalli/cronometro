import { describe, it, expect } from "vitest";
import { validatePlay, type Play } from "../src/schema/play.js";

function makeValidPlay(overrides: Partial<Play> = {}): Play {
  return {
    id: "test-123",
    name: "Test Play",
    version: 1,
    sport: "football",
    category: "offense",
    description: "A test play",
    roles: [
      { id: "qb", name: "Quarterback", position: "QB", responsibility: "Throw" },
      { id: "wr", name: "Wide Receiver", position: "WR", responsibility: "Catch" },
    ],
    steps: [
      { order: 1, action: "Snap the ball", actor: "qb" },
      { order: 2, action: "Throw to WR", actor: "qb" },
    ],
    triggers: [{ name: "Base read", condition: "LB drops", response: "Throw slant" }],
    variations: [{ name: "Mirror", description: "Run to the left side" }],
    fallbacks: [{ trigger: "Breakdown", action: "Scramble right" }],
    coachingPoints: ["Stay calm in the pocket"],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    tags: ["quick"],
    sourcePrompt: "A test play",
    ...overrides,
  };
}

describe("Play Schema Validation", () => {
  it("accepts a valid play", () => {
    const result = validatePlay(makeValidPlay());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("rejects play with no roles", () => {
    const result = validatePlay(makeValidPlay({ roles: [] }));
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it("rejects play with no steps", () => {
    const result = validatePlay(makeValidPlay({ steps: [] }));
    expect(result.valid).toBe(false);
  });

  it("rejects play with missing required fields", () => {
    const result = validatePlay({ id: "test", name: "Incomplete" });
    expect(result.valid).toBe(false);
  });

  it("rejects non-object input", () => {
    const result = validatePlay("just a string");
    expect(result.valid).toBe(false);
  });
});
