import { describe, it, expect } from "vitest";
import { generatePlay, generateTrainingPlan } from "../src/generator/play-generator.js";
import { validatePlay } from "../src/schema/play.js";

describe("Play Generator", () => {
  it("generates a valid play from a football prompt", () => {
    const play = generatePlay(
      "QB takes snap, fakes handoff to RB, throws deep to WR1 on a go route"
    );

    expect(play.id).toBeTruthy();
    expect(play.sport).toBe("football");
    expect(play.roles.length).toBeGreaterThan(0);
    expect(play.steps.length).toBeGreaterThan(0);
    expect(play.triggers.length).toBeGreaterThan(0);
    expect(play.fallbacks.length).toBeGreaterThan(0);

    // Must pass schema validation
    const result = validatePlay(play);
    expect(result.valid).toBe(true);
  });

  it("detects basketball from keywords", () => {
    const play = generatePlay(
      "Point guard dribbles to the top, power forward sets a screen, PG drives to the hoop"
    );
    expect(play.sport).toBe("basketball");
  });

  it("detects soccer from keywords", () => {
    const play = generatePlay(
      "Midfielder passes to winger on the right, winger crosses to striker in the penalty area"
    );
    expect(play.sport).toBe("soccer");
  });

  it("detects futsal from keywords", () => {
    const play = generatePlay(
      "Fixo passa para ala direita, ala conduz e toca para pivô"
    );
    expect(play.sport).toBe("futsal");
  });

  it("respects explicit sport override", () => {
    const play = generatePlay("Run a play", "volleyball");
    expect(play.sport).toBe("volleyball");
  });

  it("generates schema-valid play for any input", () => {
    const play = generatePlay("just do something cool");
    const result = validatePlay(play);
    expect(result.valid).toBe(true);
  });

  it("extracts tags from prompt", () => {
    const play = generatePlay(
      "Quick screen pass to the RB behind a power block"
    );
    expect(play.tags).toContain("quick");
    expect(play.tags).toContain("screen");
    expect(play.tags).toContain("power");
  });
});

describe("Training Plan Generator", () => {
  it("generates a training plan from a play", () => {
    const play = generatePlay(
      "QB takes snap, throws to WR1 on a slant route"
    );
    const plan = generateTrainingPlan(play);

    expect(plan.playId).toBe(play.id);
    expect(plan.warmup.length).toBeGreaterThan(0);
    expect(plan.walkthrough.length).toBeGreaterThan(0);
    expect(plan.fullSpeed.length).toBeGreaterThan(0);
    expect(plan.coachingCues.length).toBeGreaterThan(0);
    expect(plan.duration).toMatch(/~\d+ min/);
  });
});
