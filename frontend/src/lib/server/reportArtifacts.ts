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
  function firstSentence(text: string): string {
    if (!text) return "";
    const chunks = text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    return chunks[0] || "";
  }

  function secondSentence(text: string): string {
    const chunks = text
      .replace(/\s+/g, " ")
      .split(/(?<=[.!?])\s+/)
      .map((chunk) => chunk.trim())
      .filter(Boolean);
    return chunks[1] || "";
  }

  function impactLevelForSection(title: string): "High" | "Medium" | "Low" {
    const match = scores?.find((s) => s.category.toLowerCase() === title.toLowerCase());
    const score = match?.score ?? overallScore;
    if (typeof score !== "number") return "Medium";
    if (score >= 80) return "High";
    if (score >= 60) return "Medium";
    return "Low";
  }

  const rankedScores = [...(scores || [])].sort((a, b) => b.score - a.score);
  const strongest = rankedScores.filter((entry) => entry.score >= 75).slice(0, 3);
  const weakest = [...rankedScores]
    .filter((entry) => entry.score < 65)
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const prioritized = report.sections.map((section) => ({
    title: section.title,
    impact: impactLevelForSection(section.title),
  }));

  const mdLines: string[] = [];
  mdLines.push(`# ${report.query}`);
  mdLines.push("");
  mdLines.push(`Generated: ${report.createdAt.toISOString()}`);
  if (typeof overallScore === "number") {
    mdLines.push(`Overall: ${overallScore}/100${grade ? ` (Grade ${grade})` : ""}`);
  }
  mdLines.push("");

  mdLines.push("## Strategic Overview");
  mdLines.push(`Thesis: ${firstSentence(report.overview) || "No strategic thesis available."}`);
  mdLines.push("");

  mdLines.push("## Performance Snapshot");
  if (rankedScores.length) {
    if (strongest.length) {
      mdLines.push("Where performance is strongest:");
      strongest.forEach((entry) => {
        mdLines.push(`- ${entry.category}: ${entry.score}/100, indicating reliable execution leverage.`);
      });
      mdLines.push("");
    }
    if (weakest.length) {
      mdLines.push("Where performance is leaking value:");
      weakest.forEach((entry) => {
        mdLines.push(`- ${entry.category}: ${entry.score}/100, likely constraining conversion or growth velocity.`);
      });
    }
    if (!strongest.length && !weakest.length) {
      mdLines.push("Current score distribution does not show extreme strengths or urgent leak zones.");
    }
  } else if (typeof overallScore === "number") {
    mdLines.push(`Current aggregate signal is ${overallScore}/100${grade ? ` (Grade ${grade})` : ""}.`);
  } else {
    mdLines.push("No quantitative score data is available for this run.");
  }
  mdLines.push("");

  mdLines.push("## Section Analysis (Insight Blocks)");
  report.sections.forEach((section) => {
    const core = firstSentence(section.content) || "No concise insight extracted.";
    const why = secondSentence(section.content) || "This area materially affects strategic clarity and operating outcomes.";
    const impact = impactLevelForSection(section.title);
    const implication =
      impact === "High"
        ? "Execute corrective actions immediately and track outcomes weekly."
        : impact === "Medium"
          ? "Prioritize in the next planning cycle with defined owner and milestone."
          : "Treat as optimization work once critical and medium-impact initiatives are underway.";

    mdLines.push(`### ${section.title}`);
    mdLines.push(`- Core Insight: ${core}`);
    mdLines.push(`- Why It Matters: ${why}`);
    mdLines.push(`- Strategic Implication: ${implication}`);
    mdLines.push(`- Impact Level: ${impact}`);
    mdLines.push("");
  });

  mdLines.push("## Prioritized Insights");
  ["High", "Medium", "Low"].forEach((level) => {
    const items = prioritized.filter((p) => p.impact === level);
    if (!items.length) return;
    mdLines.push(`${level} impact priorities:`);
    items.forEach((item) => mdLines.push(`- ${item.title}`));
    mdLines.push("");
  });

  mdLines.push("## Strategic Synthesis");
  mdLines.push(`- ${firstSentence(report.overview) || "No synthesis available."}`);
  mdLines.push(`- ${secondSentence(report.overview) || "Primary upside is tied to prioritizing the highest-impact constraints first."}`);
  if (weakest.length) {
    mdLines.push(`- Immediate focus should center on ${weakest.map((item) => item.category).join(", ")}.`);
  }
  mdLines.push("");

  mdLines.push("## Action Plan");
  mdLines.push("Immediate (0-2 weeks):");
  prioritized
    .filter((p) => p.impact === "High")
    .slice(0, 3)
    .forEach((item) => mdLines.push(`- ${item.title}: define owner, execute first intervention, and baseline KPI movement.`));
  if (!prioritized.some((p) => p.impact === "High")) {
    mdLines.push("- Confirm top constraints, assign accountable owner, and define measurable weekly KPI targets.");
  }
  mdLines.push("");
  mdLines.push("Mid term (1-3 months):");
  prioritized
    .filter((p) => p.impact === "Medium")
    .slice(0, 4)
    .forEach((item) => mdLines.push(`- ${item.title}: run targeted experiments and product/process adjustments to improve conversion quality.`));
  if (!prioritized.some((p) => p.impact === "Medium")) {
    mdLines.push("- Consolidate immediate learnings into repeatable operating playbooks.");
  }
  mdLines.push("");
  mdLines.push("Long term (3-12 months):");
  prioritized
    .filter((p) => p.impact === "Low")
    .slice(0, 4)
    .forEach((item) => mdLines.push(`- ${item.title}: embed into roadmap to strengthen long-term differentiation and resilience.`));
  if (!prioritized.some((p) => p.impact === "Low")) {
    mdLines.push("- Revisit strategic roadmap and expand winning initiatives into adjacent opportunities.");
  }
  mdLines.push("");

  if (report.sources.length) {
    mdLines.push("## Sources");
    report.sources.forEach((source) => {
      mdLines.push(`- [${source.title}](${source.url}) (${source.domain})`);
    });
    mdLines.push("");
  }

  const markdown = mdLines.join("\n");

  const htmlLines: string[] = [];
  htmlLines.push("<!doctype html>");
  htmlLines.push("<html><head><meta charset=\"utf-8\"/>\n<style>");
  htmlLines.push("body{font-family:Inter,Segoe UI,Arial,sans-serif;line-height:1.6;padding:28px;color:#0f172a;background:#fff}");
  htmlLines.push("h1{font-size:26px;margin:0 0 8px;color:#0f172a}");
  htmlLines.push("h2{font-size:16px;margin:18px 0 8px;color:#0b5cff}");
  htmlLines.push("h3{font-size:14px;margin:12px 0 6px;color:#0f172a}");
  htmlLines.push("p,li{font-size:13px;color:#334155}");
  htmlLines.push(".muted{color:#64748b;font-size:12px}");
  htmlLines.push(".block{background:#f8fafc;border:1px solid #e2e8f0;border-radius:8px;padding:10px 12px;margin:8px 0}");
  htmlLines.push("</style></head><body>");

  htmlLines.push(`<h1>${escapeHtml(report.query)}</h1>`);
  htmlLines.push(`<p class=\"muted\">Generated: ${escapeHtml(report.createdAt.toISOString())}</p>`);
  if (typeof overallScore === "number") {
    htmlLines.push(`<p class=\"muted\">Overall: ${overallScore}/100${grade ? ` (Grade ${escapeHtml(grade)})` : ""}</p>`);
  }

  htmlLines.push(`<h2>Strategic Overview</h2><p><strong>Thesis:</strong> ${escapeHtml(firstSentence(report.overview) || "No strategic thesis available.")}</p>`);

  htmlLines.push("<h2>Performance Snapshot</h2>");
  if (rankedScores.length) {
    if (strongest.length) {
      htmlLines.push("<p><strong>Where performance is strongest</strong></p><ul>");
      strongest.forEach((entry) => {
        htmlLines.push(`<li>${escapeHtml(entry.category)}: ${entry.score}/100, indicating reliable execution leverage.</li>`);
      });
      htmlLines.push("</ul>");
    }
    if (weakest.length) {
      htmlLines.push("<p><strong>Where performance is leaking value</strong></p><ul>");
      weakest.forEach((entry) => {
        htmlLines.push(`<li>${escapeHtml(entry.category)}: ${entry.score}/100, likely constraining conversion or growth velocity.</li>`);
      });
      htmlLines.push("</ul>");
    }
    if (!strongest.length && !weakest.length) {
      htmlLines.push("<p>Current score distribution does not show extreme strengths or urgent leak zones.</p>");
    }
  } else if (typeof overallScore === "number") {
    htmlLines.push(`<p>Current aggregate signal is ${overallScore}/100${grade ? ` (Grade ${escapeHtml(grade)})` : ""}.</p>`);
  } else {
    htmlLines.push("<p>No quantitative score data is available for this run.</p>");
  }

  htmlLines.push("<h2>Section Analysis (Insight Blocks)</h2>");
  report.sections.forEach((section) => {
    const core = firstSentence(section.content) || "No concise insight extracted.";
    const why = secondSentence(section.content) || "This area materially affects strategic clarity and operating outcomes.";
    const impact = impactLevelForSection(section.title);
    const implication =
      impact === "High"
        ? "Execute corrective actions immediately and track outcomes weekly."
        : impact === "Medium"
          ? "Prioritize in the next planning cycle with defined owner and milestone."
          : "Treat as optimization work once critical and medium-impact initiatives are underway.";

    htmlLines.push(`<h3>${escapeHtml(section.title)}</h3>`);
    htmlLines.push("<div class=\"block\"><ul>");
    htmlLines.push(`<li><strong>Core Insight:</strong> ${escapeHtml(core)}</li>`);
    htmlLines.push(`<li><strong>Why It Matters:</strong> ${escapeHtml(why)}</li>`);
    htmlLines.push(`<li><strong>Strategic Implication:</strong> ${escapeHtml(implication)}</li>`);
    htmlLines.push(`<li><strong>Impact Level:</strong> ${escapeHtml(impact)}</li>`);
    htmlLines.push("</ul></div>");
  });

  htmlLines.push("<h2>Prioritized Insights</h2>");
  ["High", "Medium", "Low"].forEach((level) => {
    const items = prioritized.filter((item) => item.impact === level);
    if (!items.length) return;
    htmlLines.push(`<h3>${level} impact priorities</h3><ul>`);
    items.forEach((item) => htmlLines.push(`<li>${escapeHtml(item.title)}</li>`));
    htmlLines.push("</ul>");
  });

  htmlLines.push("<h2>Strategic Synthesis</h2><ul>");
  htmlLines.push(`<li>${escapeHtml(firstSentence(report.overview) || "No synthesis available.")}</li>`);
  htmlLines.push(`<li>${escapeHtml(secondSentence(report.overview) || "Primary upside is tied to prioritizing the highest-impact constraints first.")}</li>`);
  if (weakest.length) {
    htmlLines.push(`<li>Immediate focus should center on ${escapeHtml(weakest.map((item) => item.category).join(", "))}.</li>`);
  }
  htmlLines.push("</ul>");

  htmlLines.push("<h2>Action Plan</h2>");
  htmlLines.push("<h3>Immediate (0-2 weeks)</h3><ul>");
  const high = prioritized.filter((item) => item.impact === "High");
  if (high.length) {
    high.slice(0, 3).forEach((item) => {
      htmlLines.push(`<li>${escapeHtml(item.title)}: define owner, execute first intervention, and baseline KPI movement.</li>`);
    });
  } else {
    htmlLines.push("<li>Confirm top constraints, assign accountable owner, and define measurable weekly KPI targets.</li>");
  }
  htmlLines.push("</ul>");

  htmlLines.push("<h3>Mid term (1-3 months)</h3><ul>");
  const medium = prioritized.filter((item) => item.impact === "Medium");
  if (medium.length) {
    medium.slice(0, 4).forEach((item) => {
      htmlLines.push(`<li>${escapeHtml(item.title)}: run targeted experiments and product/process adjustments to improve conversion quality.</li>`);
    });
  } else {
    htmlLines.push("<li>Consolidate immediate learnings into repeatable operating playbooks.</li>");
  }
  htmlLines.push("</ul>");

  htmlLines.push("<h3>Long term (3-12 months)</h3><ul>");
  const low = prioritized.filter((item) => item.impact === "Low");
  if (low.length) {
    low.slice(0, 4).forEach((item) => {
      htmlLines.push(`<li>${escapeHtml(item.title)}: embed into roadmap to strengthen long-term differentiation and resilience.</li>`);
    });
  } else {
    htmlLines.push("<li>Revisit strategic roadmap and expand winning initiatives into adjacent opportunities.</li>");
  }
  htmlLines.push("</ul>");

  if (report.sources.length) {
    htmlLines.push("<h2>Sources</h2><ul>");
    report.sources.forEach((source) => {
      htmlLines.push(`<li><a href=\"${escapeHtml(source.url)}\">${escapeHtml(source.title)}</a> (${escapeHtml(source.domain)})</li>`);
    });
    htmlLines.push("</ul>");
  }

  htmlLines.push("</body></html>");
  const html = htmlLines.join("\n");

  return { markdown, html };
}
