import { readFile, writeFile, readdir, mkdir } from "node:fs/promises";
import { join } from "node:path";
import type { FeedbackEntry, LearningMetrics } from "../schema/play.js";

const DEFAULT_FEEDBACK_DIR = "data/feedback";
const METRICS_FILE = "metrics.json";

export class FeedbackStore {
  private dataDir: string;

  constructor(dataDir: string = DEFAULT_FEEDBACK_DIR) {
    this.dataDir = dataDir;
  }

  async init(): Promise<void> {
    await mkdir(this.dataDir, { recursive: true });
  }

  /** Record a feedback entry after the coach uses/trains a play. */
  async record(entry: FeedbackEntry): Promise<void> {
    await this.init();
    const filename = `${entry.playId}_v${entry.playVersion}_${Date.now()}.json`;
    await writeFile(
      join(this.dataDir, filename),
      JSON.stringify(entry, null, 2),
      "utf-8"
    );
    await this.updateMetrics(entry);
  }

  /** Get all feedback for a play. */
  async getForPlay(playId: string): Promise<FeedbackEntry[]> {
    await this.init();
    const files = await readdir(this.dataDir);
    const entries: FeedbackEntry[] = [];
    for (const file of files) {
      if (file.startsWith(`${playId}_`) && file.endsWith(".json") && file !== METRICS_FILE) {
        try {
          const raw = await readFile(join(this.dataDir, file), "utf-8");
          entries.push(JSON.parse(raw));
        } catch {
          // skip corrupt entries
        }
      }
    }
    return entries.sort((a, b) => a.timestamp.localeCompare(b.timestamp));
  }

  /** Get aggregate learning metrics. */
  async getMetrics(): Promise<LearningMetrics> {
    await this.init();
    try {
      const raw = await readFile(join(this.dataDir, METRICS_FILE), "utf-8");
      return JSON.parse(raw);
    } catch {
      return defaultMetrics();
    }
  }

  /** Update running metrics with a new feedback entry. */
  private async updateMetrics(entry: FeedbackEntry): Promise<void> {
    const current = await this.getMetrics();

    current.totalFeedbackEntries += 1;

    // Running average for clarity/execution (used internally)
    // These contribute to reuseRate heuristic
    if (entry.clarity >= 4 && entry.executionMatch >= 4) {
      current.reuseRate = Math.min(
        1,
        current.reuseRate + 0.01
      );
    }

    await writeFile(
      join(this.dataDir, METRICS_FILE),
      JSON.stringify(current, null, 2),
      "utf-8"
    );
  }

  /** Record a pipeline run (called by the pipeline to track flow time). */
  async recordFlowTime(durationMs: number, exportSuccess: boolean, engineFailed: boolean): Promise<void> {
    await this.init();
    const metrics = await this.getMetrics();

    const n = metrics.totalPlaysGenerated;
    metrics.avgFlowTimeMs = (metrics.avgFlowTimeMs * n + durationMs) / (n + 1);
    metrics.totalPlaysGenerated = n + 1;

    if (exportSuccess) {
      metrics.exportSuccessRate =
        (metrics.exportSuccessRate * n + 1) / (n + 1);
    } else {
      metrics.exportSuccessRate = (metrics.exportSuccessRate * n) / (n + 1);
    }

    if (engineFailed) {
      metrics.engineFailureRate =
        (metrics.engineFailureRate * n + 1) / (n + 1);
      // Track fallback success (we always produce output even on engine failure)
      metrics.fallbackSuccessRate =
        (metrics.fallbackSuccessRate * n + 1) / (n + 1);
    } else {
      metrics.engineFailureRate = (metrics.engineFailureRate * n) / (n + 1);
    }

    await writeFile(
      join(this.dataDir, METRICS_FILE),
      JSON.stringify(metrics, null, 2),
      "utf-8"
    );
  }
}

function defaultMetrics(): LearningMetrics {
  return {
    avgFlowTimeMs: 0,
    exportSuccessRate: 1,
    reuseRate: 0,
    engineFailureRate: 0,
    fallbackSuccessRate: 1,
    totalPlaysGenerated: 0,
    totalFeedbackEntries: 0,
  };
}
