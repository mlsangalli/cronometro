import { describe, it, expect, beforeEach } from "vitest";
import { rm, mkdir } from "node:fs/promises";
import { runPipeline } from "../src/pipeline/pipeline.js";
import { MockTacticalEngine, FailingEngine } from "../src/engine/mock-engine.js";

const TEST_DATA_DIR = "data/test-pipeline";

describe("Full Pipeline", () => {
  beforeEach(async () => {
    await rm(TEST_DATA_DIR, { recursive: true, force: true });
    await mkdir(`${TEST_DATA_DIR}/plays`, { recursive: true });
    await mkdir(`${TEST_DATA_DIR}/feedback`, { recursive: true });
  });

  it("runs the full pipeline in under 60 seconds", async () => {
    const result = await runPipeline({
      prompt:
        "QB takes snap from shotgun. WR1 runs a slant. WR2 clears deep. RB flares to flat. If LB drops, throw slant. If blitz, dump to RB.",
      engine: new MockTacticalEngine(),
      playDataDir: `${TEST_DATA_DIR}/plays`,
      feedbackDataDir: `${TEST_DATA_DIR}/feedback`,
    });

    expect(result.durationMs).toBeLessThan(60_000);
    expect(result.play.id).toBeTruthy();
    expect(result.play.sport).toBe("football");
    expect(result.fieldCardText).toContain("EXECUTION STEPS");
    expect(result.fieldCardText).toContain("COACHING POINTS");
    expect(result.trainingPlan.warmup.length).toBeGreaterThan(0);
    expect(result.validation.overallAssessment).toBeTruthy();
    expect(result.errors).toHaveLength(0);
  });

  it("generates PDF when path is provided", async () => {
    const pdfPath = `${TEST_DATA_DIR}/test-output.pdf`;
    const result = await runPipeline({
      prompt: "PG dribbles, PF sets screen, PG drives to the basket",
      engine: new MockTacticalEngine(),
      pdfOutput: pdfPath,
      playDataDir: `${TEST_DATA_DIR}/plays`,
      feedbackDataDir: `${TEST_DATA_DIR}/feedback`,
    });

    expect(result.pdfPath).toBe(pdfPath);
    expect(result.errors).toHaveLength(0);
  });

  it("handles engine failure gracefully", async () => {
    const result = await runPipeline({
      prompt: "Any play",
      engine: new FailingEngine(),
      engineConfig: { timeoutMs: 1_000, maxRetries: 0, retryDelayMs: 50 },
      playDataDir: `${TEST_DATA_DIR}/plays`,
      feedbackDataDir: `${TEST_DATA_DIR}/feedback`,
    });

    // Pipeline should still produce output even if engine fails
    expect(result.play.id).toBeTruthy();
    expect(result.fieldCardText).toBeTruthy();
    expect(result.validation.overallAssessment).toContain("unavailable");
    expect(result.errors).toHaveLength(0);
  });

  it("works without an engine (no-engine mode)", async () => {
    const result = await runPipeline({
      prompt: "Run a simple play",
      playDataDir: `${TEST_DATA_DIR}/plays`,
      feedbackDataDir: `${TEST_DATA_DIR}/feedback`,
    });

    expect(result.play.id).toBeTruthy();
    expect(result.fieldCardText).toBeTruthy();
    expect(result.validation.overallAssessment).toContain("No engine");
  });

  it("detects sport correctly through the pipeline", async () => {
    const result = await runPipeline({
      prompt:
        "Fixo passa para ala direita. Ala conduz e toca para pivô. Pivô pivoteia e finaliza.",
      engine: new MockTacticalEngine(),
      playDataDir: `${TEST_DATA_DIR}/plays`,
      feedbackDataDir: `${TEST_DATA_DIR}/feedback`,
    });

    expect(result.play.sport).toBe("futsal");
  });
});
