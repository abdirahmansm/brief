"use client";

import { ResearchStep, Source, ResearchPhase } from "@/types/research";

interface ResearchProgressProps {
  steps: ResearchStep[];
  sources: Source[];
  currentPhase: ResearchPhase;
  currentStepIndex?: number;
  analysisLog?: string[];
}

function PhaseIcon({ phase, isActive }: { phase: ResearchPhase; isActive: boolean }) {
  const baseClass = "w-5 h-5 flex-shrink-0";

  if (phase === "searching") {
    return (
      <svg className={`${baseClass} ${isActive ? "animate-pulse-dot text-accent" : "text-success"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <circle cx="11" cy="11" r="8" />
        <path d="m21 21-4.3-4.3" />
      </svg>
    );
  }
  if (phase === "reviewing") {
    return (
      <svg className={`${baseClass} ${isActive ? "animate-pulse-dot text-accent" : "text-success"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
        <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
      </svg>
    );
  }
  if (phase === "analyzing") {
    return (
      <svg className={`${baseClass} ${isActive ? "animate-pulse-dot text-accent" : "text-success"}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 20V10" /><path d="M18 20V4" /><path d="M6 20v-4" />
      </svg>
    );
  }
  if (phase === "finished") {
    return (
      <svg className={`${baseClass} text-success`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 6 9 17l-5-5" />
      </svg>
    );
  }
  return null;
}

const phaseOrder: ResearchPhase[] = ["searching", "reviewing", "analyzing", "finished"];

function isPhaseCompleted(phase: ResearchPhase, currentPhase: ResearchPhase) {
  return phaseOrder.indexOf(phase) < phaseOrder.indexOf(currentPhase);
}

function getDelayClass(index: number) {
  if (index === 0) return "anim-delay-0";
  if (index === 1) return "anim-delay-100";
  if (index === 2) return "anim-delay-200";
  if (index === 3) return "anim-delay-300";
  if (index === 4) return "anim-delay-400";
  return "anim-delay-500";
}

export default function ResearchProgress({
  steps,
  sources,
  currentPhase,
  currentStepIndex,
  analysisLog = [],
}: ResearchProgressProps) {
  return (
    <div className="w-full max-w-2xl mx-auto animate-fade-in">
      <div className="rounded-2xl border border-[rgba(139,92,246,0.12)] bg-[rgba(20,20,40,0.5)] p-6 backdrop-blur-md">
        {/* Header */}
        <div className="flex items-center gap-2 mb-6">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(139,92,246,0.1)]">
            <svg className="h-4 w-4 text-[var(--accent)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72Z" />
              <path d="m14 7 3 3" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-[var(--foreground)]">
            Steps taken by AI Agent
          </h2>
        </div>

        {/* Steps timeline */}
        <div className="space-y-1">
          {steps.map((step, idx) => {
            const completed =
              typeof currentStepIndex === "number"
                ? idx < currentStepIndex
                : isPhaseCompleted(step.phase, currentPhase);
            const active =
              typeof currentStepIndex === "number"
                ? idx === currentStepIndex
                : step.phase === currentPhase;
            return (
              <div
                key={idx}
                className={`animate-slide-in ${getDelayClass(idx)}`}
              >
                {/* Step header */}
                <div className="flex items-center gap-3 py-2">
                  <div className="relative flex items-center justify-center">
                    <PhaseIcon phase={step.phase} isActive={active} />
                  </div>
                  <span
                    className={`text-sm font-medium ${
                      active
                        ? "text-[var(--foreground)]"
                        : completed
                        ? "text-[var(--muted-foreground)]"
                        : "text-[var(--muted-foreground)]/50"
                    }`}
                  >
                    {step.label}
                  </span>
                  {completed && (
                    <span className="ml-auto text-xs text-[var(--accent)]">Done</span>
                  )}
                </div>

                {/* Step detail */}
                {step.detail && (active || completed) && (
                  <div className="ml-8 mb-2 rounded-lg bg-[rgba(139,92,246,0.05)] px-3 py-2 text-xs text-[var(--muted-foreground)]">
                    {step.detail}
                  </div>
                )}

                {/* Sources list (shown under reviewing step) */}
                {step.phase === "reviewing" && sources.length > 0 && (active || completed) && (
                  <div className="ml-8 mb-2 overflow-hidden rounded-xl border border-[rgba(139,92,246,0.12)]">
                    <div className="flex items-center justify-between bg-[rgba(139,92,246,0.06)] px-4 py-2">
                      <span className="text-xs font-medium text-[var(--muted-foreground)]">
                        Reviewing sources
                      </span>
                      <span className="rounded-full bg-[rgba(139,92,246,0.12)] px-2 py-0.5 text-xs text-[var(--muted-foreground)]">
                        {sources.length}
                      </span>
                    </div>
                    <div className="divide-y divide-[rgba(139,92,246,0.12)]">
                      {sources.map((source, sIdx) => (
                        <div
                          key={sIdx}
                          className={`animate-slide-in flex items-center justify-between px-4 py-2.5 hover:bg-[rgba(139,92,246,0.05)] ${getDelayClass(sIdx)}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <div className="flex h-5 w-5 flex-shrink-0 items-center justify-center rounded bg-[rgba(139,92,246,0.1)]">
                              <span className="text-[10px] font-bold uppercase text-[var(--accent)]">
                                {source.domain.charAt(0)}
                              </span>
                            </div>
                            <span className="truncate text-sm text-[var(--foreground)]">
                              {source.title}
                            </span>
                          </div>
                          <span className="ml-4 flex-shrink-0 text-xs text-[var(--muted-foreground)]">
                            {source.domain}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Live analysis log */}
      <div className="mt-4 rounded-2xl border border-[rgba(139,92,246,0.12)] bg-[rgba(20,20,40,0.5)] p-4">
        <div className="mb-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-[var(--muted-foreground)]">
            Live Analysis Log
          </h3>
          <span className="text-[11px] text-[var(--muted-foreground)]">{analysisLog.length}</span>
        </div>
        {analysisLog.length === 0 ? (
          <p className="text-xs text-[var(--muted-foreground)]">No analysis events yet.</p>
        ) : (
          <div className="max-h-44 space-y-1.5 overflow-y-auto rounded-xl border border-[rgba(139,92,246,0.12)] bg-[rgba(139,92,246,0.04)] p-3">
            {analysisLog.map((entry, idx) => (
              <p key={`${idx}-${entry.slice(0, 14)}`} className="text-xs text-[var(--foreground)]/90">
                {entry}
              </p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
