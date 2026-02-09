import type { Play, EngineValidationResult, TrainingPlan } from "../schema/play.js";
import { validatePlay } from "../schema/play.js";
import { generatePlay, generateTrainingPlan } from "../generator/play-generator.js";
import { validateWithEngine, type TacticalEngine, type EngineConfig } from "../engine/engine.js";
import { generateFieldCard } from "../export/field-card.js";
import { exportToPdf, type PdfExportOptions } from "../export/pdf-export.js";
import { PlayLibrary } from "../library/play-library.js";
import { FeedbackStore } from "../feedback/feedback.js";

// ── Pipeline result ────────────────────────────────────────────────

export interface PipelineResult {
  play: Play;
  trainingPlan: TrainingPlan;
  fieldCardText: string;
  pdfPath?: string;
  validation: EngineValidationResult;
  durationMs: number;
  errors: string[];
}

// ── Pipeline options ───────────────────────────────────────────────

export interface PipelineOptions {
  prompt: string;
  sport?: string;
  engine?: TacticalEngine;
  engineConfig?: EngineConfig;
  pdfOutput?: string;
  playDataDir?: string;
  feedbackDataDir?: string;
}

// ── Main pipeline ──────────────────────────────────────────────────

/**
 * Full pipeline: text → structured play → validate → field card → PDF.
 * Targets ≤60s total execution.
 */
export async function runPipeline(options: PipelineOptions): Promise<PipelineResult> {
  const startTime = Date.now();
  const errors: string[] = [];
  const library = new PlayLibrary(options.playDataDir);
  const feedbackStore = new FeedbackStore(options.feedbackDataDir);

  // Step 1: Generate structured play from natural language
  const play = generatePlay(options.prompt, options.sport);

  // Step 2: Validate schema
  const schemaValidation = validatePlay(play);
  if (!schemaValidation.valid) {
    errors.push(...schemaValidation.errors.map((e) => `Schema: ${e}`));
  }

  // Step 3: Generate training plan
  const trainingPlan = generateTrainingPlan(play);

  // Step 4: Engine validation (with timeout/retry/fallback)
  let validation: EngineValidationResult;
  let engineFailed = false;
  if (options.engine) {
    validation = await validateWithEngine(play, options.engine, options.engineConfig);
    engineFailed = validation.engineResponse.strengthScore < 0;
  } else {
    validation = {
      engineResponse: {
        adversaryReactions: [],
        vulnerabilities: [],
        strengthScore: -1,
      },
      improvements: [],
      overallAssessment: "No engine configured — skipping validation.",
    };
    engineFailed = true;
  }

  // Step 5: Generate field card (text)
  const fieldCardText = generateFieldCard(play, trainingPlan, validation);

  // Step 6: Export to PDF (optional)
  let pdfPath: string | undefined;
  let exportSuccess = true;
  if (options.pdfOutput) {
    try {
      pdfPath = await exportToPdf(play, trainingPlan, validation, {
        outputPath: options.pdfOutput,
        includeValidation: true,
      });
    } catch (err) {
      exportSuccess = false;
      errors.push(`PDF export failed: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  // Step 7: Save to library
  try {
    await library.save(play);
  } catch (err) {
    errors.push(`Library save failed: ${err instanceof Error ? err.message : String(err)}`);
  }

  // Step 8: Record metrics
  const durationMs = Date.now() - startTime;
  try {
    await feedbackStore.recordFlowTime(durationMs, exportSuccess, engineFailed);
  } catch {
    // Metrics failure is non-blocking
  }

  return {
    play,
    trainingPlan,
    fieldCardText,
    pdfPath,
    validation,
    durationMs,
    errors,
  };
}
