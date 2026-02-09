#!/usr/bin/env node

import { argv, exit, stdout } from "node:process";
import { resolve } from "node:path";
import { runPipeline, type PipelineOptions } from "./pipeline/pipeline.js";
import { MockTacticalEngine } from "./engine/mock-engine.js";
import { PlayLibrary } from "./library/play-library.js";
import { FeedbackStore } from "./feedback/feedback.js";

// ── CLI ────────────────────────────────────────────────────────────

const USAGE = `
cronometro — Play Emulator CLI

Usage:
  cronometro generate <prompt> [options]    Generate a play from natural language
  cronometro list                           List saved plays
  cronometro show <playId>                  Show a saved play's field card
  cronometro metrics                        Show learning metrics
  cronometro help                           Show this help

Options:
  --sport <sport>      Override sport detection (football|basketball|soccer|volleyball|futsal)
  --pdf <path>         Export field card to PDF
  --no-engine          Skip engine validation
  --data-dir <path>    Data directory (default: data/)
`.trim();

async function main(): Promise<void> {
  const args = argv.slice(2);

  if (args.length === 0 || args[0] === "help" || args[0] === "--help") {
    console.log(USAGE);
    return;
  }

  const command = args[0];

  switch (command) {
    case "generate":
      await handleGenerate(args.slice(1));
      break;
    case "list":
      await handleList(args.slice(1));
      break;
    case "show":
      await handleShow(args.slice(1));
      break;
    case "metrics":
      await handleMetrics(args.slice(1));
      break;
    default:
      console.error(`Unknown command: ${command}\n`);
      console.log(USAGE);
      exit(1);
  }
}

// ── Generate command ───────────────────────────────────────────────

async function handleGenerate(args: string[]): Promise<void> {
  const { flags, positional } = parseArgs(args);
  const prompt = positional.join(" ");

  if (!prompt) {
    console.error("Error: provide a play description.\n");
    console.log('Example: cronometro generate "QB takes snap, fakes handoff to RB, throws deep to WR1 on a go route"');
    exit(1);
  }

  const dataDir = flags["data-dir"] ?? "data";
  const options: PipelineOptions = {
    prompt,
    sport: flags["sport"],
    engine: flags["no-engine"] !== undefined ? undefined : new MockTacticalEngine(),
    pdfOutput: flags["pdf"] ? resolve(flags["pdf"]) : undefined,
    playDataDir: `${dataDir}/plays`,
    feedbackDataDir: `${dataDir}/feedback`,
  };

  console.log("Generating play...\n");
  const startTime = Date.now();
  const result = await runPipeline(options);
  const elapsed = Date.now() - startTime;

  // Output field card
  console.log(result.fieldCardText);

  // Summary
  console.log("");
  console.log(`Done in ${elapsed}ms (target: ≤60000ms) ${elapsed <= 60000 ? "✓" : "⚠ over target"}`);
  console.log(`Play ID: ${result.play.id} (v${result.play.version})`);
  console.log(`Saved to library: ${dataDir}/plays/`);

  if (result.pdfPath) {
    console.log(`PDF exported: ${result.pdfPath}`);
  }

  if (result.errors.length > 0) {
    console.log("\nWarnings:");
    for (const err of result.errors) {
      console.log(`  - ${err}`);
    }
  }

  if (result.validation.improvements.length > 0) {
    const highCount = result.validation.improvements.filter(
      (i) => i.priority === "high"
    ).length;
    console.log(
      `\nEngine: ${result.validation.improvements.length} improvement(s) suggested (${highCount} high priority)`
    );
  }
}

// ── List command ───────────────────────────────────────────────────

async function handleList(args: string[]): Promise<void> {
  const { flags } = parseArgs(args);
  const dataDir = flags["data-dir"] ?? "data";
  const library = new PlayLibrary(`${dataDir}/plays`);

  const plays = await library.list();
  if (plays.length === 0) {
    console.log("No plays saved yet. Use 'cronometro generate' to create one.");
    return;
  }

  console.log("Saved plays:\n");
  console.log("  ID             | Version | Sport      | Name");
  console.log("  " + "─".repeat(65));
  for (const p of plays) {
    console.log(
      `  ${p.id.padEnd(14)} | v${String(p.version).padEnd(6)} | ${p.sport.padEnd(10)} | ${p.name}`
    );
  }
  console.log(`\n  Total: ${plays.length} play(s)`);
}

// ── Show command ───────────────────────────────────────────────────

async function handleShow(args: string[]): Promise<void> {
  const { flags, positional } = parseArgs(args);
  const playId = positional[0];
  if (!playId) {
    console.error("Error: provide a play ID.\n");
    console.log("Usage: cronometro show <playId>");
    exit(1);
  }

  const dataDir = flags["data-dir"] ?? "data";
  const library = new PlayLibrary(`${dataDir}/plays`);

  try {
    const play = await library.loadLatest(playId);
    // Re-generate field card from stored play
    const { generateTrainingPlan } = await import("./generator/play-generator.js");
    const { generateFieldCard } = await import("./export/field-card.js");
    const plan = generateTrainingPlan(play);
    const card = generateFieldCard(play, plan);
    console.log(card);
  } catch (err) {
    console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
    exit(1);
  }
}

// ── Metrics command ────────────────────────────────────────────────

async function handleMetrics(args: string[]): Promise<void> {
  const { flags } = parseArgs(args);
  const dataDir = flags["data-dir"] ?? "data";
  const feedbackStore = new FeedbackStore(`${dataDir}/feedback`);

  const metrics = await feedbackStore.getMetrics();

  console.log("Learning Metrics:\n");
  console.log(`  Plays generated:       ${metrics.totalPlaysGenerated}`);
  console.log(`  Feedback entries:      ${metrics.totalFeedbackEntries}`);
  console.log(`  Avg flow time:         ${metrics.avgFlowTimeMs.toFixed(0)}ms`);
  console.log(`  Export success rate:   ${(metrics.exportSuccessRate * 100).toFixed(1)}%`);
  console.log(`  Play reuse rate:       ${(metrics.reuseRate * 100).toFixed(1)}%`);
  console.log(`  Engine failure rate:   ${(metrics.engineFailureRate * 100).toFixed(1)}%`);
  console.log(`  Fallback success rate: ${(metrics.fallbackSuccessRate * 100).toFixed(1)}%`);
}

// ── Arg parser ─────────────────────────────────────────────────────

function parseArgs(args: string[]): {
  flags: Record<string, string | undefined>;
  positional: string[];
} {
  const flags: Record<string, string | undefined> = {};
  const positional: string[] = [];

  let i = 0;
  while (i < args.length) {
    const arg = args[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2);
      // Check if next arg is a value (doesn't start with --)
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        flags[key] = args[i + 1];
        i += 2;
      } else {
        flags[key] = undefined;
        i += 1;
      }
    } else {
      positional.push(arg);
      i += 1;
    }
  }

  return { flags, positional };
}

// ── Run ────────────────────────────────────────────────────────────

main().catch((err) => {
  console.error("Fatal error:", err);
  exit(1);
});
