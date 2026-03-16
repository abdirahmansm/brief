import { AuditScore, Report } from "@/types/research";

export interface ReportArtifacts {
  markdown: string;
  html: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function sanitizeFileName(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "brief-report";
}

export function buildReportArtifacts(
  report: Report,
  scores?: AuditScore[],
  overallScore?: number,
  grade?: string
): ReportArtifacts {
  const lines: string[] = [];
  lines.push(`# ${report.query}`);
  lines.push("");
  lines.push(`Generated: ${report.createdAt.toISOString()}`);
  lines.push("");

  if (typeof overallScore === "number") {
    lines.push(`Overall Score: ${overallScore}/100${grade ? ` (Grade ${grade})` : ""}`);
    lines.push("");
  }

  lines.push("## Overview");
  lines.push(report.overview);
  lines.push("");

  if (scores && scores.length) {
    lines.push("## Score Breakdown");
    scores.forEach((score) => {
      lines.push(`- ${score.category}: ${score.score}/100 (${score.weight}% weight) - ${score.finding}`);
    });
    lines.push("");
  }

  report.sections.forEach((section) => {
    lines.push(`## ${section.title}`);
    lines.push(section.content);
    lines.push("");
  });

  if (report.sources.length) {
    lines.push("## Sources");
    report.sources.forEach((source) => {
      lines.push(`- [${source.title}](${source.url}) (${source.domain})`);
    });
    lines.push("");
  }

  const markdown = lines.join("\n");

  const html = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"/>",
    "<style>",
    "body{font-family:Segoe UI,Arial,sans-serif;line-height:1.55;padding:36px;color:#111}",
    "h1{font-size:28px;margin:0 0 8px}",
    "h2{font-size:18px;margin:24px 0 8px}",
    ".meta{color:#555;font-size:13px}",
    ".score{background:#f5f7ff;border:1px solid #dfe4ff;padding:10px 12px;border-radius:10px;margin:12px 0}",
    "ul{padding-left:20px}",
    "a{color:#2747d9;text-decoration:none}",
    "</style>",
    "</head><body>",
    `<h1>${escapeHtml(report.query)}</h1>`,
    `<p class=\"meta\"><strong>Generated:</strong> ${escapeHtml(report.createdAt.toISOString())}</p>`,
    typeof overallScore === "number"
      ? `<div class=\"score\"><strong>Overall Score:</strong> ${overallScore}/100${grade ? ` (Grade ${escapeHtml(grade)})` : ""}</div>`
      : "",
    `<h2>Overview</h2><p>${escapeHtml(report.overview).replace(/\n/g, "<br/>")}</p>`,
    ...(scores && scores.length
      ? [
          "<h2>Score Breakdown</h2>",
          `<ul>${scores
            .map(
              (score) =>
                `<li>${escapeHtml(score.category)}: ${score.score}/100 (${score.weight}% weight) - ${escapeHtml(score.finding)}</li>`
            )
            .join("")}</ul>`,
        ]
      : []),
    ...report.sections.map(
      (section) =>
        `<h2>${escapeHtml(section.title)}</h2><p>${escapeHtml(section.content).replace(/\n/g, "<br/>")}</p>`
    ),
    report.sources.length
      ? `<h2>Sources</h2><ul>${report.sources
          .map(
            (source) =>
              `<li><a href=\"${escapeHtml(source.url)}\">${escapeHtml(source.title)}</a> (${escapeHtml(source.domain)})</li>`
          )
          .join("")}</ul>`
      : "",
    "</body></html>",
  ]
    .filter(Boolean)
    .join("\n");

  return { markdown, html };
}
