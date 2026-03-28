"use client";

import { useState } from "react";
import { Report, MarketingMeta } from "@/types/research";

interface ReportViewProps {
  report: Report;
  marketing?: MarketingMeta;
}

export default function ReportView({ report, marketing }: ReportViewProps) {
  const [exporting, setExporting] = useState<"md" | "html" | "pdf" | null>(null);
  const [exportError, setExportError] = useState("");
  const isConversationalReply =
    !marketing &&
    report.sources.length === 0 &&
    report.sections.some((section) => section.title.toLowerCase() === "brief assistant");

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
      {/* Report header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <div className="h-6 w-6 rounded bg-success/10 flex items-center justify-center">
            <svg
              className="w-3.5 h-3.5 text-success"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <span className="text-xs font-medium text-success">
            {marketing
              ? `${marketing.icon} ${marketing.commandLabel} complete`
              : isConversationalReply
                ? "Brief reply"
                : "Research complete"}
          </span>
        </div>
        <h1 className="text-2xl font-semibold text-foreground leading-tight">
          {report.query}
        </h1>
        {!isConversationalReply && (
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <button
              onClick={() => exportReport("md")}
              disabled={!!exporting}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-50"
            >
              {exporting === "md" ? "Exporting..." : "Export .md"}
            </button>
            <button
              onClick={() => exportReport("html")}
              disabled={!!exporting}
              className="rounded-lg border border-border px-3 py-1.5 text-xs font-medium text-foreground hover:bg-surface disabled:opacity-50"
            >
              {exporting === "html" ? "Exporting..." : "Export .html"}
            </button>
            <button
              onClick={() => exportReport("pdf")}
              disabled={!!exporting}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent/90 disabled:opacity-50"
            >
              {exporting === "pdf" ? "Exporting..." : "Export .pdf"}
            </button>
          </div>
        )}
        {exportError && <p className="mt-2 text-xs text-red-500">{exportError}</p>}
      </div>

      {/* Marketing Score Card */}
      {marketing?.overallScore != null && (
        <div className="mb-8 rounded-2xl border border-border bg-card p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-foreground">Overall Marketing Score</h2>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-bold text-accent">{marketing.overallScore}</span>
              <span className="text-lg text-muted">/100</span>
              {marketing.grade && (
                <span className="ml-2 px-2 py-0.5 rounded-lg bg-accent/10 text-accent text-sm font-bold">
                  {marketing.grade}
                </span>
              )}
            </div>
          </div>

          {marketing.scores && marketing.scores.length > 0 && (
            <div className="space-y-3">
              {marketing.scores.map((score, idx) => (
                <div key={idx} className="animate-slide-in" style={{ animationDelay: `${idx * 80}ms` }}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm text-foreground">{score.category}</span>
                    <span className="text-sm font-medium text-foreground">{score.score}/100</span>
                  </div>
                  <div className="h-2 rounded-full bg-surface overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${score.score}%`,
                        backgroundColor: score.score >= 80 ? "var(--success)" : score.score >= 60 ? "var(--accent)" : "#ef4444",
                      }}
                    />
                  </div>
                  <p className="text-xs text-muted mt-0.5">{score.finding}</p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Overview */}
      <div className="mb-8">
        <p className="text-base text-muted leading-relaxed">
          {report.overview}
        </p>
      </div>

      {/* Report sections */}
      <div className="space-y-8">
        {report.sections.map((section, idx) => (
          <div key={idx} className="animate-fade-in" style={{ animationDelay: `${idx * 100}ms` }}>
            <h2 className="text-lg font-semibold text-foreground mb-3 flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-accent inline-block" />
              {section.title}
            </h2>
            <div className="text-sm text-muted leading-relaxed whitespace-pre-line">
              {section.content}
            </div>
          </div>
        ))}
      </div>

      {/* Sources */}
      {report.sources.length > 0 && (
        <div className="mt-10 pt-6 border-t border-border">
          <h3 className="text-sm font-semibold text-foreground mb-4">
            Sources ({report.sources.length})
          </h3>
          <div className="grid gap-2">
            {report.sources.map((source, idx) => (
              <a
                key={idx}
                href={source.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-4 py-3 rounded-xl border border-border hover:border-accent/30 hover:bg-accent-light/30 group"
              >
                <div className="w-6 h-6 rounded bg-surface flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-muted uppercase group-hover:text-accent">
                    {source.domain.charAt(0)}
                  </span>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground truncate group-hover:text-accent">
                    {source.title}
                  </p>
                </div>
                <span className="text-xs text-muted flex-shrink-0">
                  {source.domain}
                </span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
