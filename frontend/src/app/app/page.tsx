"use client";

import Sidebar from "@/components/Sidebar";
import PromptInput from "@/components/PromptInput";
import FullMarketingInput from "@/components/FullMarketingInput";
import ResearchProgress from "@/components/ResearchProgress";
import AuthPage from "@/components/AuthPage";
import LogoMark from "@/components/LogoMark";
import { useResearch } from "@/hooks/useResearch";
import { useAuth } from "@/components/AuthProvider";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MARKETING_COMMANDS, type MarketingCommand } from "@/lib/marketingSkills";
import { formatMarketingTarget } from "@/lib/marketingDisplay";

const MAIL_INTERVAL_MS = 24 * 60 * 60 * 1000;
const DEFAULT_SIGNAL_PRIORITIES =
  "All major demand, competitor, product, and regulatory signals with market-moving impact.";
const DEFAULT_DECISION_GOALS =
  "Overall market direction, positioning, roadmap priorities, and near-term growth bets.";
const DEFAULT_NOISE_FILTERS =
  "Low-credibility rumors, duplicate stories, weakly sourced social chatter, and non-material updates.";

const MAIL_PRESETS = [
  { market: "AI / ML", niche: "Foundation models and AI platforms", signals: "model releases, pricing, benchmarks, partnerships", goals: "positioning, roadmap, buyer demand" },
  { market: "AI / ML", niche: "AI developer tools and copilots", signals: "product launches, integrations, workflows, funding", goals: "product strategy, pricing, distribution" },
  { market: "SaaS", niche: "B2B workflow automation", signals: "new features, adoption, churn, pricing", goals: "retention, GTM, upsell strategy" },
  { market: "SaaS", niche: "Vertical SaaS for operations teams", signals: "vertical expansion, customer wins, category shifts", goals: "segmentation, packaging, vertical focus" },
  { market: "Fintech", niche: "Payments and billing infrastructure", signals: "API launches, fees, banking partners, regulation", goals: "pricing, partnerships, risk" },
  { market: "Fintech", niche: "Lending, credit, and underwriting", signals: "delinquency trends, regulations, underwriting models", goals: "risk, compliance, underwriting strategy" },
  { market: "Ecommerce", niche: "Shopify apps and merchant tools", signals: "app releases, merchant pain points, app-store trends", goals: "product gaps, partner strategy" },
  { market: "Ecommerce", niche: "Marketplaces and retail commerce", signals: "seller behavior, fees, logistics, conversion trends", goals: "market expansion, merchandising" },
  { market: "Healthcare", niche: "Digital health and clinical workflows", signals: "clinical evidence, reimbursement, regulation", goals: "go-to-market, compliance, trust" },
  { market: "Healthcare", niche: "Health tech software for providers", signals: "integration, workflow, procurement, regulation", goals: "buyer adoption, sales strategy" },
  { market: "Cybersecurity", niche: "SMB security and identity", signals: "breaches, policy updates, product launches", goals: "defense posture, packaging, urgency" },
  { market: "Cybersecurity", niche: "Cloud security and DevSecOps", signals: "platform changes, benchmarks, ecosystem moves", goals: "enterprise demand, platform fit" },
  { market: "Gaming", niche: "Mobile free-to-play growth", signals: "UA changes, retention, monetization, app-store moves", goals: "growth, monetization, cohort performance" },
  { market: "Gaming", niche: "PC and console publishing", signals: "launch windows, creator sentiment, platform policy", goals: "release planning, audience fit" },
  { market: "Creator Economy", niche: "Newsletter, podcast, and media monetization", signals: "creator tools, ad rates, platform changes", goals: "revenue, distribution, retention" },
  { market: "Education", niche: "EdTech for schools and universities", signals: "procurement, policy, adoption, budget shifts", goals: "institutional sales, compliance" },
  { market: "Education", niche: "Learning platforms and tutoring", signals: "engagement, pricing, curriculum demand", goals: "product-market fit, retention" },
  { market: "Real Estate", niche: "PropTech and real estate ops", signals: "housing demand, rates, workflow automation", goals: "market timing, segmentation" },
  { market: "Logistics", niche: "Supply chain and freight software", signals: "capacity, costs, route optimization, automation", goals: "ops efficiency, margin control" },
  { market: "Manufacturing", niche: "Industrial software and automation", signals: "capex, AI adoption, plant modernization", goals: "productization, procurement" },
  { market: "Climate", niche: "Energy, carbon, and sustainability tech", signals: "policy, incentives, infrastructure, adoption", goals: "market entry, funding thesis" },
  { market: "Legal", niche: "Legal tech and contract workflows", signals: "firm adoption, automation, compliance", goals: "efficiency, document risk" },
  { market: "HR / People", niche: "Recruiting, payroll, and workforce software", signals: "hiring cycles, compliance, HR stack changes", goals: "talent ops, retention, automation" },
  { market: "Travel", niche: "Travel booking and hospitality tech", signals: "demand, pricing, platform changes, seasonality", goals: "demand capture, partnerships" },
  { market: "Media", niche: "Streaming, publishing, and adtech", signals: "content launches, ad spend, platform policy", goals: "audience, monetization, distribution" },
  { market: "Consumer", niche: "Health, wellness, and lifestyle brands", signals: "retail demand, creator influence, pricing", goals: "brand positioning, channel strategy" },
  { market: "Web3", niche: "Blockchain infrastructure and wallets", signals: "protocol updates, regulation, liquidity", goals: "ecosystem fit, risk" },
  { market: "Construction", niche: "Construction tech and field operations", signals: "project demand, labor shortages, software adoption", goals: "ops efficiency, scheduling" },
  { market: "Energy", niche: "Power, grid, and electrification", signals: "utility policy, infrastructure, supply constraints", goals: "market timing, capital allocation" },
  { market: "Hardware", niche: "Consumer devices and IoT", signals: "component costs, launches, channel trends", goals: "supply chain, launch strategy" },
];

const MAIL_MARKET_OPTIONS = Array.from(new Set(MAIL_PRESETS.map((preset) => preset.market)));

function applyMailPreset(
  preset: (typeof MAIL_PRESETS)[number],
  setMailForm: React.Dispatch<React.SetStateAction<MailSetupFormState>>
): void {
  setMailForm((current) => ({
    ...current,
    market: preset.market,
    nicheFocus: preset.niche,
    signalPriorities: preset.signals,
    decisionGoals: preset.goals,
  }));
}

interface MailProfile {
  id: string;
  market: string;
  nicheFocus: string;
  geography: string;
  businessContext: string;
  competitors: string;
  signalPriorities: string;
  decisionGoals: string;
  noiseFilters: string;
}

interface MailSetupFormState {
  market: string;
  nicheFocus: string;
  geography: string;
  businessContext: string;
  competitors: string;
  signalPriorities: string;
  decisionGoals: string;
  noiseFilters: string;
}

const EMPTY_MAIL_FORM: MailSetupFormState = {
  market: "",
  nicheFocus: "",
  geography: "",
  businessContext: "",
  competitors: "",
  signalPriorities: "",
  decisionGoals: "",
  noiseFilters: "",
};

function buildStorageKey(uid: string, suffix: string): string {
  return `brief.mail.${uid}.${suffix}`;
}

function buildMailResearchInput(profile: MailProfile, topicFocus?: string): string {
  const normalizedTopic = topicFocus?.trim();
  return [
    `Profile ID: ${profile.id}`,
    `Market: ${profile.market}`,
    `Niche focus: ${profile.nicheFocus}`,
    `Geography: ${profile.geography}`,
    `Business context: ${profile.businessContext}`,
    `Competitors to monitor: ${profile.competitors}`,
    `Signal priorities: ${profile.signalPriorities}`,
    `Decision goals: ${profile.decisionGoals}`,
    `Noise filters: ${profile.noiseFilters}`,
    normalizedTopic ? `Topic focus: ${normalizedTopic}` : null,
    "Create a fact-checked deep market briefing with verified, probable, and uncertain classification.",
    "Return strategic implications and concrete actions for this week, 30 days, and quarter.",
  ]
    .filter(Boolean)
    .join("\n");
}

export default function Dashboard() {
  const { user, loading, signOut } = useAuth();
  const {
    sessions,
    activeSession,
    activeId,
    startResearch,
    startMarketingCommand,
    newResearch,
    selectSession,
    deleteSession,
  } = useResearch(user);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mailOpen, setMailOpen] = useState(false);
  const [mailForm, setMailForm] = useState<MailSetupFormState>(EMPTY_MAIL_FORM);
  const [mailFormError, setMailFormError] = useState("");
  const [mailProfile, setMailProfile] = useState<MailProfile | null>(null);
  const [mailRunning, setMailRunning] = useState(false);
  const [mailLastRunAt, setMailLastRunAt] = useState<number | null>(null);
  const [mailNextRunAt, setMailNextRunAt] = useState<number | null>(null);
  const [mailLastViewedAt, setMailLastViewedAt] = useState(0);
  const [mailPresetQuery, setMailPresetQuery] = useState("");
  const [selectedMailSessionId, setSelectedMailSessionId] = useState<string | null>(null);
  const [mailTopicInput, setMailTopicInput] = useState("");
  const [mailLastTopic, setMailLastTopic] = useState<string | null>(null);
  const [mailExporting, setMailExporting] = useState<"md" | "html" | "pdf" | null>(null);
  const [mailExportError, setMailExportError] = useState("");
  const [reportExporting, setReportExporting] = useState<"md" | "html" | "pdf" | null>(null);
  const [reportExportError, setReportExportError] = useState("");

  const deepResearchCommand = useMemo(
    () => MARKETING_COMMANDS.find((cmd) => cmd.id === "deepresearch") || null,
    []
  );
  const fullMarketingCommand = useMemo(
    () => MARKETING_COMMANDS.find((cmd) => cmd.id === "fullmarketing") || null,
    []
  );

  const userId = user?.uid || null;

  const handleMarketingCommand = (cmd: MarketingCommand, arg: string) => {
    startMarketingCommand(cmd, arg);
  };

  const handleFullMarketingGenerate = useCallback(
    (websiteUrl: string) => {
      if (!fullMarketingCommand) return;
      void startMarketingCommand(fullMarketingCommand, websiteUrl, { forceNewSession: true });
    },
    [fullMarketingCommand, startMarketingCommand]
  );

  const runMailResearch = useMemo(() => {
    return (topicFocus?: string) => {
      if (!deepResearchCommand || mailRunning) return;
      const now = Date.now();
      const normalizedTopic = topicFocus?.trim() || "";
      if (!mailProfile && !normalizedTopic) return;

      setMailRunning(true);
      setMailLastRunAt(now);
      setMailNextRunAt(now + MAIL_INTERVAL_MS);
      if (normalizedTopic) {
        setMailLastTopic(normalizedTopic);
      }

      const query = mailProfile
        ? buildMailResearchInput(mailProfile, normalizedTopic)
        : normalizedTopic;

      void startMarketingCommand(
        deepResearchCommand,
        query,
        { forceNewSession: true }
      );
    };
  }, [deepResearchCommand, mailProfile, mailRunning, startMarketingCommand]);

  useEffect(() => {
    if (!userId) return;
    const rawProfile = window.localStorage.getItem(buildStorageKey(userId, "profile"));
    const rawLastRun = window.localStorage.getItem(buildStorageKey(userId, "lastRunAt"));
    const rawNextRun = window.localStorage.getItem(buildStorageKey(userId, "nextRunAt"));
    const rawViewed = window.localStorage.getItem(buildStorageKey(userId, "lastViewedAt"));
    const rawLastTopic = window.localStorage.getItem(buildStorageKey(userId, "lastTopic"));

    if (rawProfile) {
      try {
        setMailProfile(JSON.parse(rawProfile) as MailProfile);
      } catch {
        setMailProfile(null);
      }
    } else {
      setMailProfile(null);
    }

    setMailLastRunAt(rawLastRun ? Number(rawLastRun) : null);
    setMailNextRunAt(rawNextRun ? Number(rawNextRun) : null);
    setMailLastViewedAt(rawViewed ? Number(rawViewed) : 0);
    setMailLastTopic(rawLastTopic ? String(rawLastTopic) : null);
    setMailTopicInput(rawLastTopic ? String(rawLastTopic) : "");
  }, [userId]);

  useEffect(() => {
    if (!userId) return;
    if (mailProfile) {
      window.localStorage.setItem(buildStorageKey(userId, "profile"), JSON.stringify(mailProfile));
    } else {
      window.localStorage.removeItem(buildStorageKey(userId, "profile"));
    }
  }, [mailProfile, userId]);

  useEffect(() => {
    if (!userId) return;
    if (typeof mailLastRunAt === "number") {
      window.localStorage.setItem(buildStorageKey(userId, "lastRunAt"), String(mailLastRunAt));
    }
    if (typeof mailNextRunAt === "number") {
      window.localStorage.setItem(buildStorageKey(userId, "nextRunAt"), String(mailNextRunAt));
    }
    window.localStorage.setItem(buildStorageKey(userId, "lastViewedAt"), String(mailLastViewedAt));
    if (mailLastTopic) {
      window.localStorage.setItem(buildStorageKey(userId, "lastTopic"), mailLastTopic);
    } else {
      window.localStorage.removeItem(buildStorageKey(userId, "lastTopic"));
    }
  }, [mailLastRunAt, mailNextRunAt, mailLastTopic, mailLastViewedAt, userId]);

  const mailSessions = useMemo(() => {
    if (!mailProfile) return [];
    const marker = `Profile ID: ${mailProfile.id}`;
    return sessions
      .filter(
        (session) =>
          session.marketing?.commandId === "deepresearch" &&
          session.query.includes(marker) &&
          Boolean(session.report)
      )
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }, [mailProfile, sessions]);

  const unreadMailCount = useMemo(
    () => mailSessions.filter((session) => session.createdAt.getTime() > mailLastViewedAt).length,
    [mailLastViewedAt, mailSessions]
  );

  const selectedMailSession = useMemo(() => {
    if (!mailSessions.length) return null;
    if (selectedMailSessionId) {
      const matched = mailSessions.find((session) => session.id === selectedMailSessionId);
      if (matched) return matched;
    }
    return mailSessions[0];
  }, [mailSessions, selectedMailSessionId]);

  const filteredMailPresets = useMemo(() => {
    const query = mailPresetQuery.trim().toLowerCase();
    if (!query) return MAIL_PRESETS;

    return MAIL_PRESETS.filter((preset) => {
      const haystack = `${preset.market} ${preset.niche} ${preset.signals} ${preset.goals}`.toLowerCase();
      return haystack.includes(query);
    });
  }, [mailPresetQuery]);

  useEffect(() => {
    if (!mailRunning || !mailProfile || !mailSessions.length) return;
    if (mailSessions[0].phase === "finished" && mailSessions[0].report) {
      setMailRunning(false);
    }
  }, [mailProfile, mailRunning, mailSessions]);

  useEffect(() => {
    if (!mailSessions.length) {
      setSelectedMailSessionId(null);
      return;
    }

    if (selectedMailSessionId && mailSessions.some((session) => session.id === selectedMailSessionId)) {
      return;
    }

    setSelectedMailSessionId(mailSessions[0].id);
  }, [mailSessions, selectedMailSessionId]);

  useEffect(() => {
    if (!mailProfile || !deepResearchCommand) return;

    if (!mailSessions.length && !mailRunning) {
      runMailResearch();
      return;
    }

    const timer = window.setInterval(() => {
      if (mailRunning) return;
      if (typeof mailNextRunAt !== "number") return;
      if (Date.now() >= mailNextRunAt) runMailResearch();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, [deepResearchCommand, mailNextRunAt, mailProfile, mailRunning, mailSessions.length, runMailResearch]);

  const completeMailSetup = () => {
    setMailFormError("");
    const normalizedMarket = mailForm.market.trim();
    const normalizedNiche =
      mailForm.nicheFocus.trim() || `All related niches in ${normalizedMarket}`;
    const normalizedCompetitors =
      mailForm.competitors.trim() ||
      "All major competitors, challengers, and substitutes in this market.";
    const normalizedSignalPriorities =
      mailForm.signalPriorities.trim() || DEFAULT_SIGNAL_PRIORITIES;
    const normalizedDecisionGoals =
      mailForm.decisionGoals.trim() || DEFAULT_DECISION_GOALS;
    const normalizedNoiseFilters =
      mailForm.noiseFilters.trim() || DEFAULT_NOISE_FILTERS;

    if (!normalizedMarket) {
      setMailFormError("Market is required (for example: tech, AI, sports, fintech, gaming).\n");
      return;
    }

    if (
      !mailForm.geography.trim() ||
      !mailForm.businessContext.trim()
    ) {
      setMailFormError("Please complete all required setup fields for a high-quality daily brief.");
      return;
    }

    const profile: MailProfile = {
      id: crypto.randomUUID(),
      market: normalizedMarket,
      nicheFocus: normalizedNiche,
      geography: mailForm.geography.trim(),
      businessContext: mailForm.businessContext.trim(),
      competitors: normalizedCompetitors,
      signalPriorities: normalizedSignalPriorities,
      decisionGoals: normalizedDecisionGoals,
      noiseFilters: normalizedNoiseFilters,
    };

    setMailProfile(profile);
    setMailForm(EMPTY_MAIL_FORM);
    setMailOpen(true);
    setMailLastViewedAt(0);
    setMailRunning(false);
    setMailLastRunAt(null);
    setMailNextRunAt(null);

    window.setTimeout(() => {
      runMailResearch();
    }, 120);
  };

  const openMailCenter = () => {
    setMailOpen(true);
  };

  const openMailReport = (sessionId: string) => {
    setSelectedMailSessionId(sessionId);
    const selected = mailSessions.find((session) => session.id === sessionId);
    if (selected) {
      setMailLastViewedAt(Math.max(mailLastViewedAt, selected.createdAt.getTime()));
    }
  };

  const markAllMailRead = () => {
    if (!mailSessions.length) return;
    const latestTimestamp = mailSessions[0].createdAt.getTime();
    setMailLastViewedAt(Math.max(mailLastViewedAt, latestTimestamp));
  };

  const downloadSelectedMailReport = async (format: "md" | "html" | "pdf") => {
    if (!selectedMailSession?.report) return;
    setMailExportError("");
    setMailExporting(format);

    try {
      const response = await fetch("/api/research/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          report: {
            ...selectedMailSession.report,
            createdAt: selectedMailSession.report.createdAt.toISOString(),
          },
          scores: selectedMailSession.marketing?.scores,
          overallScore: selectedMailSession.marketing?.overallScore,
          grade: selectedMailSession.marketing?.grade,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Export failed.");
      }

      const blob = await response.blob();
      const fileNameBase = (selectedMailSession.report.query || "deep-research-brief")
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 80) || "deep-research-brief";

      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `${fileNameBase}.${format}`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setMailExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setMailExporting(null);
    }
  };

  const downloadActiveReport = async (format: "md" | "html" | "pdf") => {
    if (!visibleActiveSession?.report) return;
    setReportExportError("");
    setReportExporting(format);

    try {
      const response = await fetch("/api/research/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          format,
          report: {
            ...visibleActiveSession.report,
            createdAt: visibleActiveSession.report.createdAt.toISOString(),
          },
          scores: visibleActiveSession.marketing?.scores,
          overallScore: visibleActiveSession.marketing?.overallScore,
          grade: visibleActiveSession.marketing?.grade,
        }),
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Export failed.");
      }

      const blob = await response.blob();
      const fileNameBase = (visibleActiveSession.report.query || "brief-report")
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
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setReportExportError(error instanceof Error ? error.message : "Export failed.");
    } finally {
      setReportExporting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[var(--accent)] border-t-transparent" />
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  const mailMarker = mailProfile ? `Profile ID: ${mailProfile.id}` : null;
  const isMailManagedActiveSession = Boolean(
    mailMarker &&
      activeSession?.marketing?.commandId === "deepresearch" &&
      activeSession.query.includes(mailMarker)
  );
  const visibleActiveSession = isMailManagedActiveSession ? null : activeSession;

  const isIdle = !visibleActiveSession;
  const isWorking =
    visibleActiveSession &&
    visibleActiveSession.phase !== "idle" &&
    visibleActiveSession.phase !== "finished";
  const isDone = visibleActiveSession?.phase === "finished" && visibleActiveSession.report;

  return (
    <div className="relative flex h-screen overflow-hidden bg-background text-white">
      <div className="pointer-events-none absolute left-[-180px] top-1/3 h-[440px] w-[440px] rounded-full bg-gradient-to-tr from-[rgba(139,92,246,0.22)] to-transparent blur-3xl" />
      <div className="pointer-events-none absolute right-[-140px] top-[-120px] h-[360px] w-[360px] rounded-full bg-gradient-to-b from-[rgba(139,92,246,0.16)] to-transparent blur-3xl" />

      {sidebarOpen ? (
        <Sidebar
          sessions={sessions}
          activeId={activeId}
          onSelect={(id) => {
            selectSession(id);
          }}
          onDeleteSession={async (id) => {
            const session = sessions.find((item) => item.id === id);
            const label = session?.query || "this research session";
            const shouldDelete = window.confirm(`Delete ${label}? This cannot be undone.`);
            if (!shouldDelete) return;

            try {
              await deleteSession(id);
            } catch (error) {
              const message =
                error instanceof Error
                  ? error.message
                  : "Could not delete this research session.";
              window.alert(message);
            }
          }}
          onNewResearch={() => {
            newResearch();
          }}
          onHome={() => newResearch()}
          onSignOut={signOut}
        />
      ) : null}

      <div className="relative z-10 flex-1 min-w-0 overflow-y-auto">
        <div className="sticky top-0 z-20 flex h-14 items-center border-b border-[rgba(139,92,246,0.12)] bg-[rgba(20,20,40,0.72)] px-4 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[rgba(139,92,246,0.08)] hover:text-[var(--foreground)]"
              aria-label="Toggle sidebar"
            >
              <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 12h18M3 6h18M3 18h18" />
              </svg>
            </button>
            <span className="text-sm text-[var(--muted-foreground)]">Research Workspace</span>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <button
              onClick={openMailCenter}
              className="relative rounded-full p-2 text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)]"
              aria-label="Open Mail notifications"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
                <path d="M13.73 21a2 2 0 0 1-3.46 0" />
              </svg>
              {unreadMailCount > 0 ? (
                <span className="absolute -right-1 -top-1 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-semibold text-white">
                  {unreadMailCount > 9 ? "9+" : unreadMailCount}
                </span>
              ) : null}
            </button>
            <div className="flex items-center gap-2 rounded-full px-1 text-[var(--foreground)]">
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[rgba(139,92,246,0.14)] text-sm font-semibold text-[var(--foreground)]">{(user?.displayName?.[0] || user?.email?.[0] || "A").toUpperCase()}</span>
              <svg className="h-4 w-4 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>
          </div>
        </div>

        {mailOpen ? (
          <div className="fixed inset-0 z-40 flex items-center justify-center overflow-y-auto bg-black/45 p-4">
            <div className="w-full max-w-4xl overflow-hidden rounded-3xl border border-[rgba(139,92,246,0.25)] bg-[rgba(10,10,26,0.96)] shadow-[0_30px_90px_rgba(0,0,0,0.55)] backdrop-blur-xl max-h-[calc(100vh-2rem)]">
              <div className="flex items-center justify-between border-b border-[rgba(139,92,246,0.16)] px-6 py-4">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Mail Intelligence</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Daily fact-checked deep-research briefings with premium depth and reliability.</p>
                </div>
                <button
                  onClick={() => setMailOpen(false)}
                  className="rounded-lg p-2 text-[var(--muted-foreground)] hover:bg-[rgba(139,92,246,0.1)] hover:text-[var(--foreground)]"
                  aria-label="Close Mail"
                >
                  <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="max-h-[calc(100vh-8rem)] overflow-y-auto">
              {!mailProfile ? (
                <div className="grid gap-5 p-6 md:grid-cols-2">
                  <div className="glass-panel rounded-2xl p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Setup</p>
                    <h2 className="mt-2 text-2xl font-semibold text-[var(--foreground)]">Configure Your Daily Market Mail</h2>
                    <p className="mt-2 text-sm text-[var(--muted-foreground)]">Answer the questions once. Brief will launch your first report immediately and then refresh every 24 hours.</p>
                  </div>

                  <div className="glass-panel-strong rounded-2xl p-5">
                    <div className="space-y-3">
                      <div className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.35)] p-3">
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Quick start library</p>
                            <p className="text-xs text-[var(--muted-foreground)]">Pick a market and niche to auto-fill the brief setup.</p>
                          </div>
                          <input
                            value={mailPresetQuery}
                            onChange={(event) => setMailPresetQuery(event.target.value)}
                            placeholder="Search niches"
                            className="w-40 rounded-lg border border-[rgba(139,92,246,0.18)] bg-[rgba(20,20,40,0.6)] px-2 py-1 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                          />
                        </div>

                        <div className="mt-3 flex flex-wrap gap-2">
                          {MAIL_MARKET_OPTIONS.map((market) => (
                            <button
                              key={market}
                              type="button"
                              onClick={() => setMailForm((current) => ({ ...current, market }))}
                              className={`rounded-full border px-3 py-1 text-xs font-medium transition ${mailForm.market === market ? "border-[var(--accent)] bg-[rgba(139,92,246,0.18)] text-white" : "border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.5)] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"}`}
                            >
                              {market}
                            </button>
                          ))}
                        </div>

                        <div className="mt-3 grid max-h-64 gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                          {filteredMailPresets.slice(0, 18).map((preset) => {
                            const isActive = mailForm.market === preset.market && mailForm.nicheFocus === preset.niche;
                            return (
                              <button
                                key={`${preset.market}-${preset.niche}`}
                                type="button"
                                onClick={() => applyMailPreset(preset, setMailForm)}
                                className={`rounded-xl border px-3 py-3 text-left transition ${isActive ? "border-[var(--accent)] bg-[rgba(139,92,246,0.18)]" : "border-[rgba(139,92,246,0.12)] bg-[rgba(20,20,40,0.48)] hover:bg-[rgba(139,92,246,0.08)]"}`}
                              >
                                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">{preset.market}</p>
                                <p className="mt-1 text-sm font-medium text-[var(--foreground)]">{preset.niche}</p>
                                <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">Signals: {preset.signals}</p>
                              </button>
                            );
                          })}
                        </div>
                        {filteredMailPresets.length > 18 ? (
                          <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">Showing 18 of {filteredMailPresets.length} matches. Use search to narrow down.</p>
                        ) : null}
                      </div>

                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">1. What market are you interested in? (required)</span>
                        <input list="mail-market-options" value={mailForm.market} onChange={(event) => setMailForm((prev) => ({ ...prev, market: event.target.value }))} placeholder="tech, AI, sports, fintech, gaming" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                        <datalist id="mail-market-options">
                          {MAIL_MARKET_OPTIONS.map((market) => (
                            <option key={market} value={market} />
                          ))}
                        </datalist>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">2. Which sub-niche matters most? (required)</span>
                        <input value={mailForm.nicheFocus} onChange={(event) => setMailForm((prev) => ({ ...prev, nicheFocus: event.target.value }))} placeholder="Example: AI developer productivity" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMailForm((prev) => ({
                                ...prev,
                                nicheFocus: prev.market.trim()
                                  ? `All related niches in ${prev.market.trim()}`
                                  : "All related niches in this market",
                              }))
                            }
                            className="rounded-full border border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.55)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Use All Related Niches
                          </button>
                          <button
                            type="button"
                            onClick={() => setMailForm((prev) => ({ ...prev, nicheFocus: "" }))}
                            className="rounded-full border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.45)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Leave blank and auto-fill
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">If left empty, Brief will use a broad all-related niche scope automatically.</p>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">3. Geography focus? (required)</span>
                        <input value={mailForm.geography} onChange={(event) => setMailForm((prev) => ({ ...prev, geography: event.target.value }))} placeholder="Global, US, EU, MENA, etc." className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">4. Your business context? (required)</span>
                        <input value={mailForm.businessContext} onChange={(event) => setMailForm((prev) => ({ ...prev, businessContext: event.target.value }))} placeholder="Example: SaaS founder deciding GTM bets" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">5. Competitors to watch</span>
                        <input value={mailForm.competitors} onChange={(event) => setMailForm((prev) => ({ ...prev, competitors: event.target.value }))} placeholder="Comma-separated competitors" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMailForm((prev) => ({
                                ...prev,
                                competitors:
                                  "All major competitors, challengers, and substitutes in this market.",
                              }))
                            }
                            className="rounded-full border border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.55)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Use All Competitors
                          </button>
                          <button
                            type="button"
                            onClick={() => setMailForm((prev) => ({ ...prev, competitors: "" }))}
                            className="rounded-full border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.45)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Leave blank and auto-fill
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">If blank, Brief will scan all major and emerging competitors for you.</p>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">6. Priority signals to track? (required)</span>
                        <input value={mailForm.signalPriorities} onChange={(event) => setMailForm((prev) => ({ ...prev, signalPriorities: event.target.value }))} placeholder="pricing shifts, product launches, partnerships, regulation" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMailForm((prev) => ({
                                ...prev,
                                signalPriorities: DEFAULT_SIGNAL_PRIORITIES,
                              }))
                            }
                            className="rounded-full border border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.55)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Use All Priority Signals
                          </button>
                          <button
                            type="button"
                            onClick={() => setMailForm((prev) => ({ ...prev, signalPriorities: "" }))}
                            className="rounded-full border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.45)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Leave blank and auto-fill
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">If blank, Brief will monitor broad high-impact signal categories automatically.</p>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">7. What decisions should this report support? (required)</span>
                        <input value={mailForm.decisionGoals} onChange={(event) => setMailForm((prev) => ({ ...prev, decisionGoals: event.target.value }))} placeholder="positioning, roadmap, pricing, partner strategy" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMailForm((prev) => ({
                                ...prev,
                                decisionGoals: DEFAULT_DECISION_GOALS,
                              }))
                            }
                            className="rounded-full border border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.55)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Use Broad Decision Support
                          </button>
                          <button
                            type="button"
                            onClick={() => setMailForm((prev) => ({ ...prev, decisionGoals: "" }))}
                            className="rounded-full border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.45)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Leave blank and auto-fill
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">If blank, Brief will optimize recommendations for core strategic decisions.</p>
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs font-medium text-[var(--muted-foreground)]">8. What should be treated as noise?</span>
                        <input value={mailForm.noiseFilters} onChange={(event) => setMailForm((prev) => ({ ...prev, noiseFilters: event.target.value }))} placeholder="rumors, low-credibility social posts, recycled stories" className="w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.58)] px-3 py-2 text-sm text-[var(--foreground)] outline-none focus:border-[var(--accent)]" />
                        <div className="mt-2 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              setMailForm((prev) => ({
                                ...prev,
                                noiseFilters: DEFAULT_NOISE_FILTERS,
                              }))
                            }
                            className="rounded-full border border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.55)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Use Standard Noise Filter
                          </button>
                          <button
                            type="button"
                            onClick={() => setMailForm((prev) => ({ ...prev, noiseFilters: "" }))}
                            className="rounded-full border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.45)] px-3 py-1 text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Leave blank and auto-fill
                          </button>
                        </div>
                        <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">If blank, Brief applies a default reliability filter to reduce low-signal sources.</p>
                      </label>
                    </div>

                    {mailFormError ? <p className="mt-3 text-sm text-red-400">{mailFormError}</p> : null}

                    <div className="mt-4 flex justify-end">
                      <button onClick={completeMailSetup} className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-sm font-semibold text-white shadow-[0_12px_28px_rgba(139,92,246,0.26)]">
                        Save Setup and Generate First Report
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="p-6">
                  <div className="mb-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
                    <div className="glass-panel-strong rounded-2xl p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Mail Profile</p>
                      <h3 className="mt-2 text-xl font-semibold text-[var(--foreground)]">{mailProfile.market}</h3>
                      <p className="mt-1 text-sm text-[var(--muted-foreground)]">{mailProfile.nicheFocus}</p>
                      <div className="mt-4 grid gap-2 text-xs text-[var(--muted-foreground)] sm:grid-cols-2">
                        <p><span className="text-[var(--foreground)]">Geo:</span> {mailProfile.geography}</p>
                        <p><span className="text-[var(--foreground)]">Context:</span> {mailProfile.businessContext}</p>
                        <p><span className="text-[var(--foreground)]">Signals:</span> {mailProfile.signalPriorities}</p>
                        <p><span className="text-[var(--foreground)]">Goals:</span> {mailProfile.decisionGoals}</p>
                      </div>
                    </div>
                    <div className="glass-panel rounded-2xl p-5">
                      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Automation Status</p>
                      <p className="mt-2 text-sm text-[var(--foreground)]">{mailRunning ? "Research in progress..." : "Daily 24h updates enabled"}</p>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Last run: {mailLastRunAt ? new Date(mailLastRunAt).toLocaleString() : "Not run yet"}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Next run: {mailNextRunAt ? new Date(mailNextRunAt).toLocaleString() : "Pending"}</p>
                      {unreadMailCount > 0 ? (
                        <p className="mt-2 inline-flex rounded-full border border-[rgba(139,92,246,0.28)] bg-[rgba(139,92,246,0.14)] px-2 py-1 text-[11px] font-semibold text-[var(--foreground)]">
                          {unreadMailCount} full report{unreadMailCount === 1 ? "" : "s"} ready to download
                        </p>
                      ) : null}
                      <button onClick={() => runMailResearch(mailTopicInput)} disabled={mailRunning} className="mt-4 rounded-xl border border-[rgba(139,92,246,0.24)] bg-[rgba(139,92,246,0.12)] px-3 py-2 text-sm font-medium text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.2)] disabled:opacity-50">{mailRunning ? "Running..." : "Run now"}</button>
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-5">
                    <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">Setup new mail</p>
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">Start a fresh mail workflow using the built mail setup interface. This will take you into the full mail UI for generating and managing briefs.</p>
                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setMailProfile(null);
                          setMailForm(EMPTY_MAIL_FORM);
                        }}
                        className="rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-3 py-2 text-xs font-semibold text-white shadow-[0_12px_28px_rgba(139,92,246,0.26)]"
                      >
                        Open mail setup
                      </button>
                    </div>
                  </div>

                  <div className="glass-panel rounded-2xl p-4">
                    <div className="mb-3 flex items-center justify-between">
                      <p className="text-sm font-semibold text-[var(--foreground)]">Daily Reports Inbox</p>
                      <div className="flex items-center gap-2">
                        <span className="rounded-full bg-[rgba(139,92,246,0.16)] px-2 py-0.5 text-xs text-[var(--accent)]">{mailSessions.length} reports</span>
                        {unreadMailCount > 0 ? (
                          <button
                            type="button"
                            onClick={markAllMailRead}
                            className="rounded-full border border-[rgba(139,92,246,0.2)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
                          >
                            Mark all read
                          </button>
                        ) : null}
                      </div>
                    </div>

                    {mailSessions.length === 0 ? (
                      <div className="rounded-xl border border-dashed border-[rgba(139,92,246,0.22)] bg-[rgba(20,20,40,0.35)] p-6 text-center">
                        <p className="text-sm text-[var(--muted-foreground)]">First deep market report is being prepared. It will appear here automatically.</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {mailSessions.map((session) => {
                          const isUnread = session.createdAt.getTime() > mailLastViewedAt;
                          const isSelected = session.id === selectedMailSession?.id;
                          return (
                            <button key={session.id} onClick={() => openMailReport(session.id)} className={`flex w-full items-start gap-3 rounded-xl border px-4 py-3 text-left transition ${isSelected ? "border-[var(--accent)] bg-[rgba(139,92,246,0.16)]" : "border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.48)] hover:bg-[rgba(139,92,246,0.1)]"}`}>
                              <div className="mt-0.5 h-8 w-8 shrink-0 rounded-lg bg-[linear-gradient(135deg,rgba(139,92,246,0.35),rgba(139,92,246,0.08))]" />
                              <div className="min-w-0 flex-1">
                                <p className="truncate text-sm font-semibold text-[var(--foreground)]">{session.report?.overview?.slice(0, 96) || session.query}</p>
                                <p className="mt-1 text-xs text-[var(--muted-foreground)]">{new Date(session.createdAt).toLocaleString()}</p>
                              </div>
                              {isUnread ? <span className="mt-1 rounded-full bg-[var(--accent)] px-2 py-0.5 text-[10px] font-semibold text-white">Full report ready</span> : null}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {selectedMailSession?.report ? (
                      <div className="mt-4 rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(10,10,26,0.68)] p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <p className="text-sm font-semibold text-[var(--foreground)]">Full report ready</p>
                          <span className="rounded-full border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.08)] px-2 py-0.5 text-[11px] text-[var(--muted-foreground)]">
                            Downloadable in MD, HTML, PDF
                          </span>
                        </div>

                        <p className="text-sm font-medium text-[var(--foreground)]">{selectedMailSession.report.query}</p>
                        <p className="mt-2 text-xs text-[var(--muted-foreground)] line-clamp-3">{selectedMailSession.report.overview}</p>

                        <div className="mt-4 flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            onClick={() => downloadSelectedMailReport("md")}
                            disabled={Boolean(mailExporting)}
                            className="rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] disabled:opacity-50"
                          >
                            {mailExporting === "md" ? "Exporting..." : "Download .md"}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadSelectedMailReport("html")}
                            disabled={Boolean(mailExporting)}
                            className="rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 text-xs font-medium text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] disabled:opacity-50"
                          >
                            {mailExporting === "html" ? "Exporting..." : "Download .html"}
                          </button>
                          <button
                            type="button"
                            onClick={() => downloadSelectedMailReport("pdf")}
                            disabled={Boolean(mailExporting)}
                            className="rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                          >
                            {mailExporting === "pdf" ? "Exporting..." : "Download .pdf"}
                          </button>
                        </div>

                        {mailExportError ? <p className="mt-2 text-xs text-red-400">{mailExportError}</p> : null}
                      </div>
                    ) : null}
                  </div>
                </div>
              )}
              </div>
            </div>
          </div>
        ) : null}

        <main className="mx-auto flex min-h-[calc(100vh-56px)] w-full max-w-6xl flex-col px-4 pb-10 pt-8 sm:px-8">
          {isIdle && (
            <>
              <section className="flex flex-1 flex-col items-center justify-center text-center">
                <div className="mb-5 flex flex-col items-center gap-2">
                  <div className="flex items-center gap-3">
                    <LogoMark />
                    <span className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">Brief</span>
                  </div>
                  <span className="text-sm text-[var(--accent)] sm:text-base">Market Research</span>
                </div>
                <h1 className="mb-3 max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl">What website should we research today?</h1>
                <p className="mb-8 max-w-2xl text-sm leading-relaxed text-[var(--muted-foreground)] sm:text-base">Generate in-depth, source-backed market research reports with Brief.</p>
                <div className="w-full max-w-4xl">
                  <FullMarketingInput onGenerate={handleFullMarketingGenerate} />
                </div>
                <div className="mt-8 flex flex-wrap items-center justify-center gap-3 text-sm">
                  {[
                    "Company Analysis",
                    "Industry Overview",
                    "Competitor Research",
                    "Market Landscape",
                    "Trend Analysis",
                  ].map((label) => (
                    <button key={label} className="rounded-full border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.48)] px-4 py-2 text-[13px] text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.1)]">
                      {label}
                    </button>
                  ))}
                </div>
                <p className="mt-8 flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <span className="inline-flex h-4 w-4 items-center justify-center rounded-full border border-[rgba(139,92,246,0.2)] text-[10px]">🔒</span>
                  Private. Secure. Source-backed.
                </p>
              </section>
            </>
          )}

          {isWorking && visibleActiveSession && (
            <section className="mx-auto w-full max-w-4xl py-4">
              <div className="glass-panel-strong mb-6 rounded-2xl p-4">
                {visibleActiveSession.marketing ? (
                  <>
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-lg">{visibleActiveSession.marketing.icon}</span>
                      <span className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">{visibleActiveSession.marketing.commandLabel}</span>
                    </div>
                    <p className="text-base font-medium text-white">{formatMarketingTarget(visibleActiveSession.marketing)}</p>
                  </>
                ) : (
                  <>
                    <p className="mb-1 text-xs text-[var(--muted-foreground)]">Your request</p>
                    <p className="text-base font-medium text-white">{visibleActiveSession.query}</p>
                  </>
                )}
              </div>
              <ResearchProgress steps={visibleActiveSession.steps} sources={visibleActiveSession.sources} currentPhase={visibleActiveSession.phase} currentStepIndex={visibleActiveSession.currentStepIndex} analysisLog={visibleActiveSession.analysisLog} />
            </section>
          )}

          {isDone && visibleActiveSession?.report && (
            <section className="mx-auto w-full max-w-4xl py-4">
              <div className="glass-panel-strong rounded-3xl p-6 sm:p-8">
                <div className="mb-4 flex items-center gap-2">
                  <span className="inline-flex h-8 w-8 items-center justify-center rounded-full bg-[rgba(139,92,246,0.16)] text-[var(--accent)]">
                    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20 6 9 17l-5-5" />
                    </svg>
                  </span>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent)]">Research complete</p>
                    <p className="text-sm text-[var(--muted-foreground)]">Your report is ready. Download it below without generating extra chat output.</p>
                  </div>
                </div>

                <div className="rounded-2xl border border-[rgba(139,92,246,0.14)] bg-[rgba(20,20,40,0.52)] p-4 sm:p-5">
                  <p className="text-lg font-semibold text-white">{visibleActiveSession.marketing ? formatMarketingTarget(visibleActiveSession.marketing) : visibleActiveSession.report.query}</p>
                  <p className="mt-2 text-sm text-[var(--muted-foreground)]">Steps taken are complete. The compiled report is available in your preferred format below.</p>

                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadActiveReport("md")}
                      disabled={Boolean(reportExporting)}
                      className="rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-4 py-2 text-xs font-medium text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] disabled:opacity-50"
                    >
                      {reportExporting === "md" ? "Exporting..." : "Download .md"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadActiveReport("html")}
                      disabled={Boolean(reportExporting)}
                      className="rounded-lg border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.55)] px-4 py-2 text-xs font-medium text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] disabled:opacity-50"
                    >
                      {reportExporting === "html" ? "Exporting..." : "Download .html"}
                    </button>
                    <button
                      type="button"
                      onClick={() => downloadActiveReport("pdf")}
                      disabled={Boolean(reportExporting)}
                      className="rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-4 py-2 text-xs font-semibold text-white disabled:opacity-50"
                    >
                      {reportExporting === "pdf" ? "Exporting..." : "Download .pdf"}
                    </button>
                  </div>

                  {reportExportError ? <p className="mt-2 text-xs text-rose-300">{reportExportError}</p> : null}
                </div>
              </div>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}
