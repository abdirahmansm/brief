"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
} from "firebase/firestore";
import {
  ResearchSession,
  ResearchStep,
  ResearchPhase,
  MarketingMeta,
  AuditScore,
} from "@/types/research";
import { MarketingCommand } from "@/lib/marketingSkills";
import { db } from "@/lib/firebase";

const STEPS: ResearchStep[] = [
  { phase: "searching", label: "Searching the web", detail: "Collecting the latest reports, articles, and market data." },
  { phase: "reviewing", label: "Reviewing sources" },
  { phase: "analyzing", label: "Analyzing findings", detail: "Synthesizing patterns, pain points, and opportunities." },
  { phase: "finished", label: "Finished" },
];

interface ResearchApiResponse {
  report: {
    id: string;
    query: string;
    overview: string;
    sections: Array<{ title: string; content: string }>;
    sources: Array<{ title: string; url: string; domain: string; favicon?: string }>;
    createdAt: string;
  };
  scores?: AuditScore[];
  overallScore?: number;
  grade?: string;
  error?: string;
}

interface SerializedResearchSession {
  id: string;
  query: string;
  phase: ResearchPhase;
  currentStepIndex?: number;
  steps: ResearchStep[];
  sources: Array<{ title: string; url: string; domain: string; favicon?: string }>;
  analysisLog?: string[];
  report: {
    id: string;
    query: string;
    overview: string;
    sections: Array<{ title: string; content: string }>;
    sources: Array<{ title: string; url: string; domain: string; favicon?: string }>;
    createdAtIso: string;
  } | null;
  marketing?: {
    commandId: string;
    commandLabel: string;
    icon: string;
    inputType: "url" | "topic" | "client" | "product";
    arg: string;
    outputFile: string;
    scores?: AuditScore[];
    overallScore?: number;
    grade?: string;
  };
  createdAtIso: string;
}

function timestampToDate(value: unknown): Date | null {
  if (
    value &&
    typeof value === "object" &&
    "toDate" in value &&
    typeof (value as { toDate: () => Date }).toDate === "function"
  ) {
    return (value as { toDate: () => Date }).toDate();
  }
  return null;
}

function serializeSession(session: ResearchSession): SerializedResearchSession {
  return {
    id: session.id,
    query: session.query,
    phase: session.phase,
    currentStepIndex: session.currentStepIndex,
    steps: session.steps,
    sources: session.sources,
    analysisLog: session.analysisLog || [],
    report: session.report
      ? {
          ...session.report,
          createdAtIso: session.report.createdAt.toISOString(),
        }
      : null,
    marketing: session.marketing
      ? {
          commandId: session.marketing.commandId,
          commandLabel: session.marketing.commandLabel,
          icon: session.marketing.icon,
          inputType: session.marketing.inputType,
          arg: session.marketing.arg,
          outputFile: session.marketing.outputFile,
          ...(session.marketing.scores ? { scores: session.marketing.scores } : {}),
          ...(typeof session.marketing.overallScore === "number"
            ? { overallScore: session.marketing.overallScore }
            : {}),
          ...(session.marketing.grade ? { grade: session.marketing.grade } : {}),
        }
      : undefined,
    createdAtIso: session.createdAt.toISOString(),
  };
}

function deserializeSession(data: Record<string, unknown>, fallbackId: string): ResearchSession {
  const createdAtFromTimestamp = timestampToDate(data.createdAt);
  const createdAtIso = typeof data.createdAtIso === "string" ? data.createdAtIso : undefined;
  const createdAt = createdAtIso
    ? new Date(createdAtIso)
    : createdAtFromTimestamp || new Date();

  const reportData = data.report as SerializedResearchSession["report"] | null | undefined;
  const report = reportData
    ? {
        id: reportData.id,
        query: reportData.query,
        overview: reportData.overview,
        sections: reportData.sections,
        sources: reportData.sources,
        createdAt: new Date(reportData.createdAtIso),
      }
    : null;

  return {
    id: typeof data.id === "string" ? data.id : fallbackId,
    query: String(data.query || ""),
    phase: (data.phase as ResearchPhase) || "searching",
    currentStepIndex:
      typeof data.currentStepIndex === "number" ? data.currentStepIndex : undefined,
    steps: (data.steps as ResearchStep[]) || STEPS,
    sources:
      (data.sources as Array<{ title: string; url: string; domain: string; favicon?: string }>) ||
      [],
    analysisLog: (data.analysisLog as string[] | undefined) || [],
    report,
    createdAt,
    marketing: (data.marketing as MarketingMeta | undefined) || undefined,
  };
}

async function persistSession(
  uid: string,
  session: ResearchSession,
  isNew: boolean
): Promise<void> {
  const ref = doc(db, "users", uid, "researchSessions", session.id);
  const serialized = serializeSession(session);

  await setDoc(
    ref,
    {
      ...serialized,
      ...(isNew ? { createdAt: serverTimestamp() } : {}),
      updatedAt: serverTimestamp(),
    },
    { merge: true }
  );
}

async function runResearchRequest(payload: {
  query: string;
  commandId?: string;
  commandArg?: string;
}): Promise<ResearchApiResponse> {
  const response = await fetch("/api/research", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = (await response.json()) as ResearchApiResponse;
  if (!response.ok) {
    throw new Error(data.error || "Research request failed.");
  }
  return data;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function nowLabel(): string {
  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  }).format(new Date());
}

async function typeByLine(
  input: string,
  onTick: (value: string) => void,
  charChunk = 8,
  tickDelayMs = 26,
  lineDelayMs = 48
): Promise<void> {
  const lines = input.split("\n");
  let built = "";

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex += 1) {
    const line = lines[lineIndex];

    for (let i = 0; i < line.length; i += charChunk) {
      built += line.slice(i, i + charChunk);
      onTick(built);
      await sleep(tickDelayMs);
    }

    if (lineIndex < lines.length - 1) {
      built += "\n";
      onTick(built);
      await sleep(lineDelayMs);
    }
  }
}

export function useResearch(user: User | null) {
  const uid = user?.uid ?? null;
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const sessionsRef = useRef<ResearchSession[]>([]);

  useEffect(() => {
    sessionsRef.current = sessions;
  }, [sessions]);

  useEffect(() => {
    if (!uid) return;

    const q = query(
      collection(db, "users", uid, "researchSessions"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const hydrated = snapshot.docs.map((item) =>
        deserializeSession(item.data() as Record<string, unknown>, item.id)
      );

      setSessions(hydrated);
      setActiveId((prev) => {
        if (!prev) return hydrated[0]?.id || null;
        return hydrated.some((session) => session.id === prev)
          ? prev
          : hydrated[0]?.id || null;
      });
    });

    return unsubscribe;
  }, [uid]);

  const visibleSessions = uid ? sessions : [];
  const visibleActiveSession = visibleSessions.find((s) => s.id === activeId) ?? null;

  const updateSession = useCallback(
    (id: string, update: Partial<ResearchSession>, persist = false) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...update } : s))
      );

      if (persist && uid) {
        const current = sessionsRef.current.find((item) => item.id === id);
        if (current) {
          const merged = { ...current, ...update };
          void persistSession(uid, merged, false);
        }
      }
    },
    [uid]
  );

  const appendLog = useCallback(
    (id: string, message: string, persist = false) => {
      const current = sessionsRef.current.find((item) => item.id === id);
      const nextLog = [...(current?.analysisLog || []), `[${nowLabel()}] ${message}`];
      updateSession(
        id,
        {
          analysisLog: nextLog,
        },
        persist
      );
    },
    [updateSession]
  );

  const progressToStep = useCallback(
    (id: string, steps: ResearchStep[], stepIndex: number) => {
      const safeIndex = Math.max(0, Math.min(stepIndex, steps.length - 1));
      const step = steps[safeIndex];
      updateSession(id, {
        currentStepIndex: safeIndex,
        phase: step.phase,
      });
    },
    [updateSession]
  );

  const streamReportOutput = useCallback(
    async (
      id: string,
      report: ResearchApiResponse["report"],
      marketing?: MarketingMeta,
      finalScores?: AuditScore[],
      finalOverallScore?: number,
      finalGrade?: string
    ) => {
      const createdAt = new Date(report.createdAt);
      const skeletonReport = {
        id: report.id,
        query: report.query,
        overview: "",
        sections: [] as Array<{ title: string; content: string }>,
        sources: report.sources,
        createdAt,
      };

      updateSession(id, {
        phase: "finished",
        report: skeletonReport,
      });
      appendLog(id, "Drafting executive summary...");

      let liveOverview = "";

      await typeByLine(report.overview, (value) => {
        liveOverview = value;
        updateSession(id, {
          report: {
            ...skeletonReport,
            overview: liveOverview,
            sections: [...skeletonReport.sections],
          },
        });
      });

      const liveSections: Array<{ title: string; content: string }> = [];
      for (let sectionIndex = 0; sectionIndex < report.sections.length; sectionIndex += 1) {
        const fullSection = report.sections[sectionIndex];
        appendLog(id, `Drafting section: ${fullSection.title}`);
        liveSections.push({ title: fullSection.title, content: "" });

        await typeByLine(fullSection.content, (value) => {
          liveSections[sectionIndex] = {
            title: fullSection.title,
            content: value,
          };
          updateSession(id, {
            report: {
              ...skeletonReport,
              overview: liveOverview,
              sections: [...liveSections],
            },
          });
        });
        appendLog(id, `Completed section: ${fullSection.title}`);
      }

      appendLog(id, "Finalizing report output.", true);
      updateSession(
        id,
        {
          phase: "finished",
          report: {
            ...report,
            createdAt,
          },
          ...(marketing
            ? {
                marketing: {
                  ...marketing,
                  scores: finalScores,
                  overallScore: finalOverallScore,
                  grade: finalGrade,
                },
              }
            : {}),
        },
        true
      );
    },
    [appendLog, updateSession]
  );

  const startResearch = useCallback(
    async (query: string) => {
      const id = crypto.randomUUID();
      const newSession: ResearchSession = {
        id,
        query,
        phase: "searching",
        currentStepIndex: 0,
        steps: STEPS,
        sources: [],
        analysisLog: [],
        report: null,
        createdAt: new Date(),
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveId(id);

      if (uid) {
        void persistSession(uid, newSession, true);
      }

      appendLog(id, `Research request started for: ${query}`);

      try {
        const requestPromise = runResearchRequest({ query });

        await sleep(1200);
        progressToStep(id, STEPS, 1);
        appendLog(id, "Scanning live web sources and gathering citations...");

        const data = await requestPromise;

        updateSession(id, {
          phase: "reviewing",
          currentStepIndex: 1,
          sources: data.report.sources,
        });
        appendLog(id, `Collected ${data.report.sources.length} sources. Reviewing relevance and signal quality.`);

        await sleep(1400);
        progressToStep(id, STEPS, 2);
        appendLog(id, "Synthesizing evidence into market insights and structured sections...");

        await sleep(900);
        progressToStep(id, STEPS, 3);
        appendLog(id, "Preparing final report stream for display...");

        await streamReportOutput(id, data.report);

      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Research failed. Please try again.";
        updateSession(id, {
          phase: "finished",
          currentStepIndex: 3,
          analysisLog: [
            ...((sessionsRef.current.find((item) => item.id === id)?.analysisLog || [])),
            `[${nowLabel()}] Research failed before report completion.`,
          ],
          report: {
            id: crypto.randomUUID(),
            query,
            overview: "The request failed before the report could be generated.",
            sections: [
              {
                title: "Error",
                content: message,
              },
            ],
            sources: [],
            createdAt: new Date(),
          },
        }, true);
      }
    },
    [uid, appendLog, progressToStep, streamReportOutput, updateSession]
  );

  const newResearch = useCallback(() => {
    setActiveId(null);
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  /** Start a marketing command session (e.g., /market audit https://...) */
  const startMarketingCommand = useCallback(
    async (command: MarketingCommand, arg: string) => {
      const id = crypto.randomUUID();

      // Build steps from the command's phases
      const marketingSteps: ResearchStep[] = command.phases.map((label, i) => {
        if (i === command.phases.length - 1) {
          return { phase: "finished", label };
        }

        const ratio = command.phases.length <= 2 ? 0 : i / (command.phases.length - 1);
        const phase: ResearchPhase =
          ratio < 0.34 ? "searching" : ratio < 0.67 ? "reviewing" : "analyzing";
        return { phase, label };
      });

      const marketing: MarketingMeta = {
        commandId: command.id,
        commandLabel: command.label,
        icon: command.icon,
        inputType: command.inputType,
        arg,
        outputFile: command.outputFile,
      };

      const newSession: ResearchSession = {
        id,
        query: `${command.command} ${arg}`,
        phase: "searching",
        currentStepIndex: 0,
        steps: marketingSteps,
        sources: [],
        analysisLog: [],
        report: null,
        createdAt: new Date(),
        marketing,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveId(id);

      if (uid) {
        void persistSession(uid, newSession, true);
      }

      appendLog(id, `Started ${command.command} with target: ${arg}`);

      try {
        const dataPromise = runResearchRequest({
          query: arg,
          commandId: command.id,
          commandArg: arg,
        });

        for (let index = 1; index < Math.max(marketingSteps.length - 1, 1); index += 1) {
          await sleep(1000);
          progressToStep(id, marketingSteps, index);
          appendLog(id, `Step ${index + 1}/${marketingSteps.length}: ${marketingSteps[index].label}`);
        }

        const data = await dataPromise;

        updateSession(id, {
          phase: marketingSteps[Math.max(marketingSteps.length - 2, 0)]?.phase || "reviewing",
          currentStepIndex: Math.max(marketingSteps.length - 2, 0),
          sources: data.report.sources,
        });
        appendLog(id, `Command research gathered ${data.report.sources.length} sources for deep analysis.`);

        await sleep(900);
        progressToStep(id, marketingSteps, marketingSteps.length - 1);
        appendLog(id, "Converting research into command-specific strategy output...");

        await streamReportOutput(
          id,
          data.report,
          marketing,
          data.scores,
          data.overallScore,
          data.grade
        );

      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Marketing analysis failed.";
        appendLog(id, `Command failed: ${message}`);
        updateSession(id, {
          phase: "finished",
          currentStepIndex: Math.max(marketingSteps.length - 1, 0),
          report: {
            id: crypto.randomUUID(),
            query: `${command.command} ${arg}`,
            overview: `${command.label} could not be completed.`,
            sections: [
              {
                title: "Error",
                content: message,
              },
            ],
            sources: [],
            createdAt: new Date(),
          },
        }, true);
      }
    },
    [uid, appendLog, progressToStep, streamReportOutput, updateSession]
  );

  return {
    sessions: visibleSessions,
    activeSession: visibleActiveSession,
    activeId,
    startResearch,
    startMarketingCommand,
    newResearch,
    selectSession,
  };
}
