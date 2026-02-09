import PDFDocument from "pdfkit";
import { createWriteStream } from "node:fs";
import { mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { Play, TrainingPlan, EngineValidationResult } from "../schema/play.js";

export interface PdfExportOptions {
  outputPath: string;
  includeValidation?: boolean;
}

/**
 * Exports a play + training plan to a single-page-ish PDF field card.
 */
export async function exportToPdf(
  play: Play,
  plan: TrainingPlan,
  validation: EngineValidationResult | undefined,
  options: PdfExportOptions
): Promise<string> {
  await mkdir(dirname(options.outputPath), { recursive: true });

  return new Promise<string>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: 40 });
    const stream = createWriteStream(options.outputPath);
    doc.pipe(stream);

    const pageW = doc.page.width - 80;

    // ── Header ───────────────────────────────────────────────────
    doc.fontSize(18).font("Helvetica-Bold").text(play.name, { align: "center" });
    doc.moveDown(0.3);
    doc
      .fontSize(10)
      .font("Helvetica")
      .text(`${play.sport.toUpperCase()} | ${play.category.toUpperCase()} | v${play.version}`, {
        align: "center",
      });
    if (play.tags.length > 0) {
      doc.text(`Tags: ${play.tags.join(", ")}`, { align: "center" });
    }
    doc.moveDown(0.5);
    drawLine(doc, pageW);

    // ── Roles ────────────────────────────────────────────────────
    sectionTitle(doc, "ROLES");
    for (const role of play.roles) {
      doc.font("Helvetica-Bold").text(`[${role.position}] ${role.name}`, { continued: true });
      doc.font("Helvetica").text(` — ${role.responsibility}`);
    }
    doc.moveDown(0.3);
    drawLine(doc, pageW);

    // ── Steps ────────────────────────────────────────────────────
    sectionTitle(doc, "EXECUTION STEPS");
    for (const step of play.steps) {
      const timing = step.timing ? ` (${step.timing})` : "";
      doc.font("Helvetica").text(`${step.order}. [${step.actor}] ${step.action}${timing}`);
      if (step.detail) {
        doc.text(`   → ${step.detail}`, { indent: 15 });
      }
    }
    doc.moveDown(0.3);
    drawLine(doc, pageW);

    // ── Triggers ─────────────────────────────────────────────────
    sectionTitle(doc, "READS / TRIGGERS");
    for (const t of play.triggers) {
      doc.font("Helvetica-Bold").text(`▸ ${t.name}: `, { continued: true });
      doc.font("Helvetica").text(t.condition);
      doc.text(`  → ${t.response}`, { indent: 10 });
    }
    doc.moveDown(0.3);
    drawLine(doc, pageW);

    // ── Variations ───────────────────────────────────────────────
    sectionTitle(doc, "VARIATIONS");
    for (const v of play.variations) {
      doc.font("Helvetica-Bold").text(`◆ ${v.name}: `, { continued: true });
      doc.font("Helvetica").text(v.description);
    }
    doc.moveDown(0.3);
    drawLine(doc, pageW);

    // ── Fallbacks ────────────────────────────────────────────────
    sectionTitle(doc, "FALLBACKS");
    for (const fb of play.fallbacks) {
      doc.font("Helvetica-Bold").text(`⚠ On: ${fb.trigger}`);
      doc.font("Helvetica").text(`  → ${fb.action}`);
      if (fb.detail) doc.text(`    (${fb.detail})`);
    }
    doc.moveDown(0.3);
    drawLine(doc, pageW);

    // ── Coaching Points ──────────────────────────────────────────
    sectionTitle(doc, "COACHING POINTS");
    for (const point of play.coachingPoints) {
      doc.font("Helvetica").text(`• ${point}`);
    }
    doc.moveDown(0.3);
    drawLine(doc, pageW);

    // ── Training Plan ────────────────────────────────────────────
    sectionTitle(doc, `TRAINING PLAN (${plan.duration})`);
    doc.font("Helvetica-Bold").text("Warmup:");
    for (const w of plan.warmup) doc.font("Helvetica").text(`  - ${w}`);
    doc.font("Helvetica-Bold").text("Walkthrough:");
    for (const w of plan.walkthrough) doc.font("Helvetica").text(`  - ${w}`);
    doc.font("Helvetica-Bold").text("Full Speed:");
    for (const f of plan.fullSpeed) doc.font("Helvetica").text(`  - ${f}`);

    // ── Engine validation ────────────────────────────────────────
    if (options.includeValidation !== false && validation) {
      doc.moveDown(0.3);
      drawLine(doc, pageW);
      sectionTitle(doc, "ENGINE ASSESSMENT");
      doc.font("Helvetica").text(validation.overallAssessment);

      if (validation.engineResponse.strengthScore >= 0) {
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").text("Likely adversary reactions:");
        for (const r of validation.engineResponse.adversaryReactions) {
          doc.font("Helvetica").text(
            `  ${(r.probability * 100).toFixed(0)}% — ${r.scenario}: ${r.description}`
          );
        }
      }

      const high = validation.improvements.filter((i) => i.priority === "high");
      if (high.length > 0) {
        doc.moveDown(0.2);
        doc.font("Helvetica-Bold").text("Priority improvements:");
        for (const imp of high) {
          doc.font("Helvetica").text(`  ★ [${imp.area}] ${imp.suggestion}`);
          doc.text(`    Reason: ${imp.reason}`);
        }
      }
    }

    // ── Footer ───────────────────────────────────────────────────
    doc.moveDown(0.5);
    drawLine(doc, pageW);
    doc
      .fontSize(8)
      .font("Helvetica")
      .text(
        `Generated: ${new Date().toISOString().split("T")[0]} | Play ID: ${play.id}`,
        { align: "center" }
      );

    doc.end();

    stream.on("finish", () => resolve(options.outputPath));
    stream.on("error", reject);
  });
}

// ── Drawing helpers ────────────────────────────────────────────────

function sectionTitle(doc: PDFKit.PDFDocument, title: string): void {
  doc.moveDown(0.3);
  doc.fontSize(11).font("Helvetica-Bold").text(title);
  doc.fontSize(9).font("Helvetica");
  doc.moveDown(0.15);
}

function drawLine(doc: PDFKit.PDFDocument, width: number): void {
  const y = doc.y;
  doc.moveTo(40, y).lineTo(40 + width, y).strokeColor("#cccccc").stroke();
  doc.moveDown(0.2);
}
