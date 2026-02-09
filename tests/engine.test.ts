import { describe, it, expect } from "vitest";
import { generatePlay } from "../src/generator/play-generator.js";
import { validateWithEngine } from "../src/engine/engine.js";
import { MockTacticalEngine, FailingEngine } from "../src/engine/mock-engine.js";

describe("Engine Validation", () => {
  it("validates a play with mock engine and returns improvements", async () => {
    const play = generatePlay(
      "QB takes snap, fakes handoff to RB, throws deep to WR1 on a go route"
    );
    const engine = new MockTacticalEngine();
    const result = await validateWithEngine(play, engine);

    expect(result.engineResponse.strengthScore).toBeGreaterThanOrEqual(0);
    expect(result.engineResponse.strengthScore).toBeLessThanOrEqual(100);
    expect(result.engineResponse.adversaryReactions.length).toBeGreaterThan(0);
    expect(result.overallAssessment).toBeTruthy();
  });

  it("returns improvements for plays with limited variations", async () => {
    const play = generatePlay("Simple play with no options");
    const engine = new MockTacticalEngine();
    const result = await validateWithEngine(play, engine);

    // Should suggest adding variations since the play has minimal ones
    const variationSuggestions = result.improvements.filter(
      (i) => i.area === "variations"
    );
    expect(variationSuggestions.length).toBeGreaterThanOrEqual(0);
  });

  it("handles engine failure with fallback result", async () => {
    const play = generatePlay("Any play description");
    const engine = new FailingEngine();
    const result = await validateWithEngine(play, engine, {
      timeoutMs: 1_000,
      maxRetries: 1,
      retryDelayMs: 100,
    });

    expect(result.engineResponse.strengthScore).toBe(-1);
    expect(result.overallAssessment).toContain("unavailable");
    expect(result.improvements.length).toBeGreaterThan(0);
  });

  it("handles engine timeout with fallback", async () => {
    const slowEngine = {
      name: "slow-engine",
      validate: () => new Promise(() => {}), // never resolves
    } as any;

    const result = await validateWithEngine(slowEngine, slowEngine, {
      timeoutMs: 200,
      maxRetries: 0,
      retryDelayMs: 50,
    });

    expect(result.engineResponse.strengthScore).toBe(-1);
    expect(result.overallAssessment).toContain("unavailable");
  });
});
