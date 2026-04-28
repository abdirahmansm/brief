"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { User } from "firebase/auth";
import {
  collection,
  deleteDoc,
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
import { MARKETING_COMMANDS, MarketingCommand } from "@/lib/marketingSkills";
import { db } from "@/lib/firebase";

const STEPS: ResearchStep[] = [
  { phase: "searching", label: "Searching the web", detail: "Collecting the latest reports, articles, and market data." },
  { phase: "reviewing", label: "Reviewing sources" },
  { phase: "analyzing", label: "Analyzing findings", detail: "Synthesizing patterns, pain points, and opportunities." },
  { phase: "finished", label: "Finished" },
];

const ASSISTANT_STEPS: ResearchStep[] = [
  { phase: "searching", label: "Understanding your request" },
  { phase: "analyzing", label: "Preparing grounded response" },
  { phase: "finished", label: "Finished" },
];

const DEEP_RESEARCH_MIN_CYCLES = 20;
const DEEP_RESEARCH_MAX_CYCLES = 30;
const DEEP_RESEARCH_CACHE_TTL_MS = 24 * 60 * 60 * 1000;

function getDeepResearchCycleCount(): number {
  const range = DEEP_RESEARCH_MAX_CYCLES - DEEP_RESEARCH_MIN_CYCLES + 1;
  return DEEP_RESEARCH_MIN_CYCLES + Math.floor(Math.random() * range);
}

function normalizeCacheArg(value: string): string {
  return getBaseMarketingArg(value)
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

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
  orchestration?: {
    mode?: string;
    commandId?: string;
    subagents?: Array<unknown>;
  };
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
  const serialized: SerializedResearchSession = {
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
    createdAtIso: session.createdAt.toISOString(),
  };

  if (session.marketing) {
    serialized.marketing = {
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
    };
  }

  return serialized;
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
  responseDepth?: "simple" | "deep";
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

function shouldContinueMarketingContext(
  query: string,
  activeMarketing: MarketingMeta | undefined
): boolean {
  if (!activeMarketing) return false;

  const normalized = query.trim().toLowerCase();
  if (!normalized) return false;

  if (normalized.startsWith("/market")) return false;
  if (normalized.startsWith("/")) return false;

  // Explicit reset intents should start a fresh non-command conversation.
  if (/^(new (topic|research|thread)|start over|reset context)\b/.test(normalized)) {
    return false;
  }

  // Any plain text after a command session is treated as a contextual follow-up.
  return true;
}

function getBaseMarketingArg(arg: string): string {
  const followUpToken = " | Follow-up";
  const index = arg.indexOf(followUpToken);
  if (index === -1) return arg.trim();
  return arg.slice(0, index).trim();
}

function mergeSources(
  base: Array<{ title: string; url: string; domain: string; favicon?: string }>,
  incoming: Array<{ title: string; url: string; domain: string; favicon?: string }>
): Array<{ title: string; url: string; domain: string; favicon?: string }> {
  const seen = new Set<string>();
  const merged: Array<{ title: string; url: string; domain: string; favicon?: string }> = [];

  [...base, ...incoming].forEach((source) => {
    const key = source.url || `${source.domain}-${source.title}`;
    if (seen.has(key)) return;
    seen.add(key);
    merged.push(source);
  });

  return merged;
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
      finalGrade?: string,
      options?: {
        appendToExistingReport?: ResearchSession["report"] | null;
        refinementQuery?: string;
        preserveExistingMarketingScores?: boolean;
      }
    ) => {
      const createdAt = new Date(report.createdAt);
      const appendBase = options?.appendToExistingReport;
      const refinementQuery = options?.refinementQuery || report.query;

      const skeletonReport = {
        id: report.id,
        query: appendBase?.query || report.query,
        overview: appendBase?.overview || "",
        sections: appendBase ? [...appendBase.sections] : ([] as Array<{ title: string; content: string }>),
        sources: appendBase ? mergeSources(appendBase.sources, report.sources) : report.sources,
        createdAt,
      };

      updateSession(id, {
        phase: "finished",
        report: skeletonReport,
      });
      appendLog(id, "Drafting executive summary...");

      let liveOverview = skeletonReport.overview;
      const baseSections = [...skeletonReport.sections];
      const refinementSections: Array<{ title: string; content: string }> = [];

      if (appendBase) {
        refinementSections.push({ title: "__chat_user__", content: refinementQuery });
        refinementSections.push({ title: "__chat_assistant__", content: "" });

        await typeByLine(report.overview, (value) => {
          refinementSections[1] = {
            title: "__chat_assistant__",
            content: value,
          };
          updateSession(id, {
            report: {
              ...skeletonReport,
              overview: liveOverview,
              sections: [...baseSections, ...refinementSections],
            },
          });
        });

        for (let sectionIndex = 0; sectionIndex < report.sections.length; sectionIndex += 1) {
          const fullSection = report.sections[sectionIndex];
          const refinementTitle = `__chat_assistant_detail__:${fullSection.title}`;
          appendLog(id, `Drafting section: ${refinementTitle}`);
          refinementSections.push({ title: refinementTitle, content: "" });
          const outputIndex = refinementSections.length - 1;

          await typeByLine(fullSection.content, (value) => {
            refinementSections[outputIndex] = {
              title: refinementTitle,
              content: value,
            };
            updateSession(id, {
              report: {
                ...skeletonReport,
                overview: liveOverview,
                sections: [...baseSections, ...refinementSections],
              },
            });
          });
          appendLog(id, `Completed section: ${refinementTitle}`);
        }
      } else {
        await typeByLine(report.overview, (value) => {
          liveOverview = value;
          updateSession(id, {
            report: {
              ...skeletonReport,
              overview: liveOverview,
              sections: [...baseSections],
            },
          });
        });

        for (let sectionIndex = 0; sectionIndex < report.sections.length; sectionIndex += 1) {
          const fullSection = report.sections[sectionIndex];
          appendLog(id, `Drafting section: ${fullSection.title}`);
          refinementSections.push({ title: fullSection.title, content: "" });

          await typeByLine(fullSection.content, (value) => {
            refinementSections[sectionIndex] = {
              title: fullSection.title,
              content: value,
            };
            updateSession(id, {
              report: {
                ...skeletonReport,
                overview: liveOverview,
                sections: [...refinementSections],
              },
            });
          });
          appendLog(id, `Completed section: ${fullSection.title}`);
        }
      }

      appendLog(id, "Finalizing report output.", true);
      updateSession(
        id,
        {
          phase: "finished",
          report: {
            ...skeletonReport,
            overview: liveOverview,
            sections: appendBase
              ? [...baseSections, ...refinementSections]
              : [...refinementSections],
            createdAt,
          },
          ...(marketing
            ? {
                marketing: {
                  ...marketing,
                  ...(!options?.preserveExistingMarketingScores && finalScores
                    ? { scores: finalScores }
                    : {}),
                  ...(!options?.preserveExistingMarketingScores && typeof finalOverallScore === "number"
                    ? { overallScore: finalOverallScore }
                    : {}),
                  ...(!options?.preserveExistingMarketingScores && finalGrade
                    ? { grade: finalGrade }
                    : {}),
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
    async (
      query: string,
      mode: "simple" | "deep" = "simple",
      options?: { continueInSkill?: boolean }
    ) => {
      const activeSession = sessionsRef.current.find((item) => item.id === activeId);
      const candidateMarketing = activeSession?.marketing;
      const allowDeepContinuation = mode === "deep";
      const continueContext = allowDeepContinuation
        ? options?.continueInSkill
          ? Boolean(candidateMarketing)
          : shouldContinueMarketingContext(query, candidateMarketing)
        : false;
      const followUpMarketing = continueContext
        ? candidateMarketing
        : undefined;
      const followUpCommand = followUpMarketing
        ? MARKETING_COMMANDS.find((item) => item.id === followUpMarketing.commandId)
        : null;

      const resolvedMarketing =
        followUpMarketing && followUpCommand
          ? {
              ...followUpMarketing,
              commandLabel: followUpCommand.label,
              icon: followUpCommand.icon,
              inputType: followUpCommand.inputType,
              outputFile: followUpCommand.outputFile,
              arg: getBaseMarketingArg(followUpMarketing.arg),
            }
          : undefined;

      const shouldReuseActiveSession = Boolean(activeSession && continueContext);
      const id = shouldReuseActiveSession && activeSession
        ? activeSession.id
        : crypto.randomUUID();
      const initialSteps = resolvedMarketing ? STEPS : ASSISTANT_STEPS;
      if (shouldReuseActiveSession && activeSession) {
        updateSession(
          id,
          {
            query,
            phase: "searching",
            currentStepIndex: 0,
            steps: initialSteps,
            sources: [],
            report: continueContext ? activeSession.report : null,
            ...(resolvedMarketing ? { marketing: resolvedMarketing } : { marketing: undefined }),
          },
          true
        );
        setActiveId(id);
      } else {
        const newSession: ResearchSession = {
          id,
          query,
          phase: "searching",
          currentStepIndex: 0,
          steps: initialSteps,
          sources: [],
          analysisLog: [],
          report: null,
          createdAt: new Date(),
          ...(resolvedMarketing ? { marketing: resolvedMarketing } : {}),
        };

        setSessions((prev) => [newSession, ...prev]);
        setActiveId(id);

        if (uid) {
          void persistSession(uid, newSession, true);
        }
      }

      appendLog(id, `${resolvedMarketing ? "Research" : "Assistant"} request started for: ${query}`);
      if (resolvedMarketing && continueContext) {
        appendLog(
          id,
          `Continuing ${followUpCommand?.command || "/market"} context without requiring a new slash command.`
        );
      }

      try {
        if (resolvedMarketing) {
          const requestPromise = runResearchRequest({
            query,
            commandId: resolvedMarketing.commandId,
            commandArg: resolvedMarketing.arg,
            responseDepth: mode,
          });

          await sleep(1200);
          progressToStep(id, STEPS, 1);
          appendLog(id, "Scanning live web sources and gathering citations...");

          const data = await requestPromise;

          updateSession(id, {
            phase: "reviewing",
            currentStepIndex: 1,
            sources: data.report.sources,
          });
          appendLog(id, `Collected ${data.report.sources.length} sources. Reviewing relevance and evidence quality.`);

          await sleep(1400);
          progressToStep(id, STEPS, 2);
          appendLog(id, "Synthesizing evidence into market insights and structured sections...");

          await sleep(900);
          progressToStep(id, STEPS, 3);
          appendLog(id, "Preparing final report stream for display...");

          await streamReportOutput(
            id,
            data.report,
            resolvedMarketing,
            continueContext ? undefined : data.scores,
            continueContext ? undefined : data.overallScore,
            continueContext ? undefined : data.grade,
            {
              appendToExistingReport: continueContext ? activeSession?.report || null : null,
              refinementQuery: query,
              preserveExistingMarketingScores: continueContext,
            }
          );
        } else {
          const data = await runResearchRequest({ query, responseDepth: mode });

          updateSession(id, {
            phase: "analyzing",
            currentStepIndex: Math.max(ASSISTANT_STEPS.length - 2, 0),
            sources: [],
          });
          appendLog(id, "Assistant mode reply generated without running live web research.");

          await sleep(300);
          progressToStep(id, ASSISTANT_STEPS, ASSISTANT_STEPS.length - 1);
          appendLog(id, "Preparing final response for display...");

          await streamReportOutput(
            id,
            data.report,
            undefined,
            data.scores,
            data.overallScore,
            data.grade
          );
        }

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
    [activeId, uid, appendLog, progressToStep, streamReportOutput, updateSession]
  );

  const newResearch = useCallback(() => {
    setActiveId(null);
  }, []);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  const deleteSession = useCallback(
    async (id: string) => {
      setSessions((prev) => prev.filter((session) => session.id !== id));
      setActiveId((prev) => (prev === id ? null : prev));

      if (!uid) return;

      const ref = doc(db, "users", uid, "researchSessions", id);
      await deleteDoc(ref);
    },
    [uid]
  );

  /** Start a marketing command session (e.g., /market audit https://...) */
  const startMarketingCommand = useCallback(
    async (
      command: MarketingCommand,
      arg: string,
      options?: { forceNewSession?: boolean }
    ) => {
      const activeSession = sessionsRef.current.find((item) => item.id === activeId);
      const shouldReuseActiveSession = options?.forceNewSession
        ? false
        : Boolean(activeSession);
      const id = shouldReuseActiveSession && activeSession ? activeSession.id : crypto.randomUUID();
      const deepResearchCycles = getDeepResearchCycleCount();

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

      // Reuse deep research results for 24h to avoid redundant API spend.
      // Allow a tester/admin to bypass the cache so they can re-run deep research freely.
      if (command.id === "deepresearch") {
        const normalizedArg = normalizeCacheArg(arg);
        const adminBypassEmail = "abdirahmansm02@gmail.com";
        const isAdminBypass = !!user && user.email === adminBypassEmail;

        if (!isAdminBypass) {
          const now = Date.now();
          const cacheCandidate = sessionsRef.current
            .filter((session) => {
              if (!session.report) return false;
              if (session.marketing?.commandId !== "deepresearch") return false;
              if (normalizeCacheArg(session.marketing.arg) !== normalizedArg) return false;
              const baselineTime = session.report?.createdAt?.getTime?.() || session.createdAt.getTime();
              return now - baselineTime <= DEEP_RESEARCH_CACHE_TTL_MS;
            })
            .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

          if (cacheCandidate?.report) {
            const cachedMarketing: MarketingMeta = {
              ...marketing,
              ...(cacheCandidate.marketing?.scores ? { scores: cacheCandidate.marketing.scores } : {}),
              ...(typeof cacheCandidate.marketing?.overallScore === "number"
                ? { overallScore: cacheCandidate.marketing.overallScore }
                : {}),
              ...(cacheCandidate.marketing?.grade ? { grade: cacheCandidate.marketing.grade } : {}),
            };

            const replayedReport = {
              ...cacheCandidate.report,
              id: crypto.randomUUID(),
              createdAt: new Date(),
            };

            if (shouldReuseActiveSession && activeSession) {
              updateSession(
                id,
                {
                  query: `${command.command} ${arg}`,
                  phase: "finished",
                  currentStepIndex: Math.max(marketingSteps.length - 1, 0),
                  steps: marketingSteps,
                  sources: replayedReport.sources,
                  report: replayedReport,
                  marketing: cachedMarketing,
                },
                true
              );
              setActiveId(id);
            } else {
              const replaySession: ResearchSession = {
                id,
                query: `${command.command} ${arg}`,
                phase: "finished",
                currentStepIndex: Math.max(marketingSteps.length - 1, 0),
                steps: marketingSteps,
                sources: replayedReport.sources,
                analysisLog: [],
                report: replayedReport,
                createdAt: new Date(),
                marketing: cachedMarketing,
              };

              setSessions((prev) => [replaySession, ...prev]);
              setActiveId(id);

              if (uid) {
                void persistSession(uid, replaySession, true);
              }
            }

            appendLog(id, `Started ${command.command} with target: ${arg}`);
            appendLog(
              id,
              "Cache hit: reused deep research report from the last 24h. Skipped new external API requests."
            );
            return;
          }
        } else {
          appendLog(id, `Admin cache bypass: user ${user?.email} allowed to re-run deepresearch`);
        }
      }

      if (shouldReuseActiveSession && activeSession) {
        updateSession(
          id,
          {
            query: `${command.command} ${arg}`,
            phase: "searching",
            currentStepIndex: 0,
            steps: marketingSteps,
            sources: [],
            report: null,
            marketing,
          },
          true
        );
        setActiveId(id);
      } else {
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
      }

      appendLog(id, `Started ${command.command} with target: ${arg}`);
      appendLog(
        id,
        `Deep analysis mode engaged. Running ${deepResearchCycles} research passes before final output.`
      );

      try {
        const dataPromise = runResearchRequest({
          query: arg,
          commandId: command.id,
          commandArg: arg,
          responseDepth: "deep",
        });

        for (let pass = 1; pass <= deepResearchCycles; pass += 1) {
          await sleep(850);

          const progressRatio = pass / deepResearchCycles;
          const stepIndex = Math.min(
            Math.floor(progressRatio * Math.max(marketingSteps.length - 2, 1)),
            Math.max(marketingSteps.length - 2, 1)
          );

          progressToStep(id, marketingSteps, stepIndex);
          appendLog(
            id,
            `Deep research pass ${pass}/${deepResearchCycles}: ${marketingSteps[stepIndex]?.label || "Analyzing"}`
          );
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
    [activeId, uid, appendLog, progressToStep, streamReportOutput, updateSession]
  );

  return {
    sessions: visibleSessions,
    activeSession: visibleActiveSession,
    activeId,
    startResearch,
    startMarketingCommand,
    newResearch,
    selectSession,
    deleteSession,
  };
}
