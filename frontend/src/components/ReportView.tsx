"use client";

import { useState } from "react";
import { Report, MarketingMeta } from "@/types/research";
import { formatMarketingTarget } from "@/lib/marketingDisplay";

interface ReportViewProps {
  report: Report;
  marketing?: MarketingMeta;
}

interface RefinementTurn {
  prompt: string;
  response: string;
  details: Array<{ title: string; content: string }>;
}

function isRefinementUserTitle(title: string): boolean {
  return title === "Refinement Request" || title === "__chat_user__";
}

function isRefinementSummaryTitle(title: string): boolean {
  return title === "Refined Summary" || title === "__chat_assistant__";
}

function getRefinementDetailTitle(title: string): string | null {
  if (title.startsWith("Refinement ")) {
    return title.replace("Refinement ", "").trim();
  }
  if (title.startsWith("__chat_assistant_detail__:")) {
    return title.replace("__chat_assistant_detail__:", "").trim();
  }
  return null;
}

function splitReportContent(report: Report): {
  originalSections: Report["sections"];
  turns: RefinementTurn[];
} {
  const markerIndex = report.sections.findIndex((section) => {
    if (isRefinementUserTitle(section.title) || isRefinementSummaryTitle(section.title)) return true;
    return getRefinementDetailTitle(section.title) !== null;
  });

  if (markerIndex === -1) {
    return { originalSections: report.sections, turns: [] };
  }

  const originalSections = report.sections.slice(0, markerIndex);
  const refinementSections = report.sections.slice(markerIndex);
  const turns: RefinementTurn[] = [];
  let currentTurn: RefinementTurn | null = null;

  refinementSections.forEach((section) => {
    if (isRefinementUserTitle(section.title)) {
      if (currentTurn) turns.push(currentTurn);
      currentTurn = { prompt: section.content, response: "", details: [] };
      return;
    }

    if (!currentTurn) {
      currentTurn = { prompt: "", response: "", details: [] };
    }

    if (isRefinementSummaryTitle(section.title)) {
      currentTurn.response = section.content;
      return;
    }

    const detailTitle = getRefinementDetailTitle(section.title);
    if (detailTitle) {
      currentTurn.details.push({ title: detailTitle, content: section.content });
    }
  });

  if (currentTurn) turns.push(currentTurn);

  return { originalSections, turns };
}

export default function ReportView({ report, marketing }: ReportViewProps) {
  const [exporting, setExporting] = useState<"md" | "html" | "pdf" | null>(null);
  const [exportError, setExportError] = useState("");

  const isConversationalReply =
    !marketing &&
    report.sources.length === 0 &&
    report.sections.some((section) => section.title.toLowerCase() === "brief assistant");

  const { originalSections, turns } = splitReportContent(report);
  const reportTitle = marketing ? formatMarketingTarget(marketing) : report.query;

  const exportReport = async (format: "md" | "html" | "pdf") => {
    setExportError("");
    setExporting(format);

    try {
      const response = await fetch("/api/research/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          report: {
            ...report,
            createdAt: report.createdAt.toISOString(),
          },
          scores: marketing?.scores,
          overallScore: marketing?.overallScore,
          grade: marketing?.grade,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Export failed.");
      }

      const blob = await response.blob();
      const fileNameBase = report.query
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "brief-report";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileNameBase}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      setExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setExporting(null);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="mb-8 rounded-2xl border border-[rgba(139,92,246,0.14)] bg-[linear-gradient(180deg,rgba(20,20,40,0.72)_0%,rgba(10,10,26,0.92)_100%)] p-5 shadow-[0_10px_26px_rgba(0,0,0,0.28)]">
        <div className="mb-3 flex items-center justify-between gap-3">
          <div className="inline-flex items-center gap-2 rounded-full border border-[rgba(139,92,246,0.16)] bg-[rgba(139,92,246,0.08)] px-2.5 py-1 text-[var(--accent)]">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-[rgba(139,92,246,0.12)]">
              <svg className="h-3.5 w-3.5 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 6 9 17l-5-5" />
              </svg>
            </span>
            <span className="text-xs font-medium tracking-wide">
              {marketing
                ? `${marketing.icon} ${marketing.commandLabel} complete`
                : isConversationalReply
                  ? "Brief reply"
                  : "Research complete"}
            </span>
          </div>
          <span className="text-[11px] uppercase tracking-[0.12em] text-[var(--muted-foreground)]">Brief Report</span>
        </div>

        <h1 className="text-2xl font-semibold text-foreground leading-tight">{reportTitle}</h1>
        {marketing && <p className="mt-2 text-sm text-[var(--muted-foreground)]">Target input: {marketing.arg}</p>}

        {!isConversationalReply && (
          <div className="mt-4 rounded-xl border border-[rgba(139,92,246,0.12)] bg-[rgba(20,20,40,0.5)] p-2">
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.12)] text-[var(--accent)]">
                <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                  <polyline points="7 10 12 15 17 10" />
                  <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
              </span>
              <span className="text-xs font-medium tracking-wide text-[var(--muted-foreground)]">Download report</span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                onClick={() => exportReport("md")}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] hover:text-white disabled:opacity-50"
              >
                <span className="text-[var(--accent)]">.md</span>
                {exporting === "md" ? "Exporting..." : "Markdown"}
              </button>
              <button
                onClick={() => exportReport("html")}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 rounded-lg border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] hover:text-white disabled:opacity-50"
              >
                <span className="text-[var(--accent)]">.html</span>
                {exporting === "html" ? "Exporting..." : "HTML"}
              </button>
              <button
                onClick={() => exportReport("pdf")}
                disabled={!!exporting}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
              >
                <span>.pdf</span>
                {exporting === "pdf" ? "Exporting..." : "PDF"}
              </button>
            </div>
          </div>
        )}

        {exportError && <p className="mt-2 text-xs text-red-500">{exportError}</p>}
      </div>

      {marketing?.overallScore != null && (
        <div className="mb-8 animate-fade-in rounded-2xl border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.5)] p-6">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-foreground">Overall Marketing Score</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-[var(--accent)]">{marketing.overallScore}</span>
              <span className="text-lg text-[var(--muted-foreground)]">/100</span>
              {marketing.grade && (
                <span className="ml-2 rounded-lg bg-[rgba(139,92,246,0.1)] px-2 py-0.5 text-sm font-bold text-[var(--accent)]">{marketing.grade}</span>
              )}
            </div>
          </div>
          {marketing.scores && marketing.scores.length > 0 && (
            <div className="space-y-3">
              {marketing.scores.map((score, idx) => (
                <div key={idx} className="animate-slide-in">
                  <div className="mb-1 flex items-center justify-between">
                    <span className="text-sm text-foreground">{score.category}</span>
                    <span className="text-sm font-medium text-foreground">{score.score}/100</span>
                  </div>
                  <progress
                    className="h-2 w-full overflow-hidden rounded-full [appearance:none] [&::-webkit-progress-bar]:bg-surface [&::-webkit-progress-value]:bg-accent [&::-moz-progress-bar]:bg-accent"
                    value={score.score}
                    max={100}
                  />
                  <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">{score.finding}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="mb-8">
        <p className="text-base leading-relaxed text-[var(--muted-foreground)]">{report.overview}</p>
      </div>

      <div className="space-y-8">
        {originalSections.map((section, idx) => (
          <div key={idx} className="animate-fade-in">
            <h2 className="mb-3 flex items-center gap-2 text-lg font-semibold text-foreground">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />
              {section.title}
            </h2>
            <div className="whitespace-pre-line text-sm leading-relaxed text-[var(--muted-foreground)]">{section.content}</div>
          </div>
        ))}
      </div>

      {turns.length > 0 && (
        <div className="mt-10 space-y-5 border-t border-[rgba(139,92,246,0.12)] pt-6">
          {turns.map((turn, idx) => (
            <div key={idx} className="space-y-3">
              {turn.prompt && (
                <div className="flex max-w-[84%] items-start gap-2 rounded-2xl border border-[#2c3440] bg-[#171d27] px-4 py-3 text-sm text-[#d8deea] whitespace-pre-line">
                  <span className="mt-0.5 inline-flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full border border-[#3a4452] bg-[#202837] text-[#9ed0ff]">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 21a8 8 0 0 0-16 0" />
                      <circle cx="12" cy="7" r="4" />
                    </svg>
                  </span>
                  <span>{turn.prompt}</span>
                </div>
              )}
              <div className="rounded-2xl border border-border bg-card px-4 py-3">
                <div className="mb-2 flex items-center gap-2 text-[#9ab1c9]">
                  <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#2f3f4f] bg-[#172332]">
                    <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M9.5 9a3.5 3.5 0 0 1 5 0" />
                      <path d="M7 16a5 5 0 0 1 10 0" />
                      <circle cx="12" cy="12" r="9" />
                    </svg>
                  </span>
                  <span className="text-xs font-medium uppercase tracking-wide">Brief</span>
                </div>
                <div className="whitespace-pre-line text-sm leading-relaxed text-muted">{turn.response}</div>
                {turn.details.length > 0 && (
                  <div className="mt-4 space-y-3">
                    {turn.details.map((detail, detailIndex) => (
                      <div key={detailIndex}>
                        <p className="text-xs font-semibold uppercase tracking-wide text-[#8da4bd]">{detail.title}</p>
                        <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-muted">{detail.content}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {report.sources.length > 0 && (
        <div className="mt-10 border-t border-border pt-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Sources ({report.sources.length})</h3>
          <div className="grid gap-2">
            {report.sources.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex items-center gap-3 rounded-xl border border-border px-4 py-3 hover:border-accent/30 hover:bg-accent-light/30"
              >
                <div className="h-6 w-6 flex-shrink-0 rounded bg-surface flex items-center justify-center">
                  <span className="text-[10px] font-bold uppercase text-muted group-hover:text-accent">
                    {source.domain.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-foreground group-hover:text-accent">{source.title}</p>
                </div>
                <span className="flex-shrink-0 text-xs text-muted">{source.domain}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
