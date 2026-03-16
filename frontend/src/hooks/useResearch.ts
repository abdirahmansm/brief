"use client";

import { useState, useCallback, useRef } from "react";
import {
  ResearchSession,
  ResearchStep,
  Source,
  ResearchPhase,
  Report,
  MarketingMeta,
  AuditScore,
} from "@/types/research";
import { MarketingCommand } from "@/lib/marketingSkills";

// Demo data for preview — will be replaced by real API calls
const MOCK_SOURCES: Source[] = [
  { title: "Global Startup Funding Trends 2025", url: "#", domain: "CB Insights" },
  { title: "Venture Capital Outlook Report", url: "#", domain: "Crunchbase" },
  { title: "Emerging Tech Landscape 2025", url: "#", domain: "TechCrunch" },
  { title: "Patent Activity Tracker", url: "#", domain: "WIPO" },
  { title: "Consumer Sentiment & Social Data", url: "#", domain: "X (Twitter)" },
  { title: "AI Startup Ecosystem Index", url: "#", domain: "PitchBook" },
];

function buildMockReport(query: string): Report {
  return {
    id: crypto.randomUUID(),
    query,
    overview:
      "Based on analysis of 6 sources, here are the key findings for your research query. The market shows strong growth signals with several emerging opportunities and notable competitive dynamics.",
    sections: [
      {
        title: "Market Overview",
        content:
          "The market is experiencing rapid transformation driven by technological advances and shifting consumer preferences. Total addressable market is estimated at $XX billion with a CAGR of XX% through 2028. Key drivers include digital transformation, AI adoption, and changing regulatory landscapes.",
      },
      {
        title: "Key Competitors",
        content:
          "• Company A — Market leader with 25% share, strong in enterprise segment\n• Company B — Fast-growing challenger, focus on SMB market\n• Company C — Niche player with deep vertical expertise\n• Company D — Recent entrant backed by significant VC funding",
      },
      {
        title: "Customer Pain Points",
        content:
          "Analysis of forums, reviews, and social media reveals recurring themes:\n\n1. Complexity of existing solutions — users want simpler workflows\n2. Pricing transparency — hidden fees and unclear tier structures\n3. Integration gaps — difficulty connecting with existing tool stacks\n4. Support responsiveness — long resolution times for critical issues",
      },
      {
        title: "Emerging Trends",
        content:
          "• AI-native tools replacing traditional SaaS approaches\n• Consolidation through M&A activity accelerating\n• Open-source alternatives gaining enterprise traction\n• Vertical-specific solutions outperforming horizontal platforms",
      },
      {
        title: "Market Gaps & Opportunities",
        content:
          "Several underserved segments present opportunities:\n\n1. Mid-market companies ($10M-$100M revenue) lack tailored solutions\n2. Cross-border/multi-currency workflows remain fragmented\n3. Real-time analytics and predictive insights are underdelivered\n4. Developer experience is a competitive moat few are investing in",
      },
    ],
    sources: MOCK_SOURCES,
    createdAt: new Date(),
  };
}

const STEPS: ResearchStep[] = [
  { phase: "searching", label: "Searching the web", detail: "Collecting the latest reports, articles, and market data." },
  { phase: "reviewing", label: "Reviewing sources" },
  { phase: "analyzing", label: "Analyzing findings", detail: "Synthesizing patterns, pain points, and opportunities." },
  { phase: "finished", label: "Finished" },
];

export function useResearch() {
  const [sessions, setSessions] = useState<ResearchSession[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const activeSession = sessions.find((s) => s.id === activeId) ?? null;

  const clearTimers = useCallback(() => {
    timerRef.current.forEach(clearTimeout);
    timerRef.current = [];
  }, []);

  const updateSession = useCallback(
    (id: string, update: Partial<ResearchSession>) => {
      setSessions((prev) =>
        prev.map((s) => (s.id === id ? { ...s, ...update } : s))
      );
    },
    []
  );

  const startResearch = useCallback(
    (query: string) => {
      clearTimers();

      const id = crypto.randomUUID();
      const newSession: ResearchSession = {
        id,
        query,
        phase: "searching",
        steps: STEPS,
        sources: [],
        report: null,
        createdAt: new Date(),
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveId(id);

      // Simulate phased research flow
      const t1 = setTimeout(() => {
        updateSession(id, { phase: "reviewing", sources: MOCK_SOURCES });
      }, 2000);

      const t2 = setTimeout(() => {
        updateSession(id, { phase: "analyzing" });
      }, 4000);

      const t3 = setTimeout(() => {
        updateSession(id, {
          phase: "finished",
          report: buildMockReport(query),
        });
      }, 6000);

      timerRef.current = [t1, t2, t3];
    },
    [clearTimers, updateSession]
  );

  const newResearch = useCallback(() => {
    clearTimers();
    setActiveId(null);
  }, [clearTimers]);

  const selectSession = useCallback((id: string) => {
    setActiveId(id);
  }, []);

  /** Start a marketing command session (e.g., /market audit https://...) */
  const startMarketingCommand = useCallback(
    (command: MarketingCommand, arg: string) => {
      clearTimers();

      const id = crypto.randomUUID();

      // Build steps from the command's phases
      const marketingSteps: ResearchStep[] = command.phases.map((label, i) => {
        const phaseMap: ResearchPhase[] = ["searching", "reviewing", "analyzing"];
        const phase = i < command.phases.length - 1
          ? phaseMap[Math.min(i, phaseMap.length - 1)]
          : "finished";
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
        steps: marketingSteps,
        sources: [],
        report: null,
        createdAt: new Date(),
        marketing,
      };

      setSessions((prev) => [newSession, ...prev]);
      setActiveId(id);

      // Simulate phased marketing analysis flow
      const t1 = setTimeout(() => {
        updateSession(id, { phase: "reviewing", sources: MOCK_SOURCES });
      }, 2500);

      const t2 = setTimeout(() => {
        updateSession(id, { phase: "analyzing" });
      }, 5000);

      const t3 = setTimeout(() => {
        // Build mock audit scores for audit commands
        const scores: AuditScore[] = command.id === "audit"
          ? [
              { category: "Content & Messaging", score: 72, weight: 25, finding: "Headlines need more specificity and urgency" },
              { category: "Conversion Optimization", score: 58, weight: 20, finding: "CTAs lack contrast and urgency; forms have too many fields" },
              { category: "SEO & Discoverability", score: 81, weight: 20, finding: "Strong technical SEO; missing long-tail content opportunities" },
              { category: "Competitive Positioning", score: 64, weight: 15, finding: "No comparison or alternatives pages; differentiation unclear" },
              { category: "Brand & Trust", score: 76, weight: 10, finding: "Good trust signals; team page could be stronger" },
              { category: "Growth & Strategy", score: 61, weight: 10, finding: "Limited referral/viral loops; pricing page needs optimization" },
            ]
          : [];

        const overallScore = scores.length > 0
          ? Math.round(scores.reduce((acc, s) => acc + s.score * (s.weight / 100), 0))
          : undefined;

        const grade = overallScore
          ? overallScore >= 85 ? "A" : overallScore >= 70 ? "B" : overallScore >= 55 ? "C" : overallScore >= 40 ? "D" : "F"
          : undefined;

        const report = buildMockMarketingReport(command, arg, scores, overallScore, grade);

        updateSession(id, {
          phase: "finished",
          report,
          marketing: { ...marketing, scores, overallScore, grade },
        });
      }, 7000);

      timerRef.current = [t1, t2, t3];
    },
    [clearTimers, updateSession]
  );

  return {
    sessions,
    activeSession,
    activeId,
    startResearch,
    startMarketingCommand,
    newResearch,
    selectSession,
  };
}

/** Build a mock report for a marketing command */
function buildMockMarketingReport(
  command: MarketingCommand,
  arg: string,
  scores: AuditScore[],
  overallScore?: number,
  grade?: string,
): Report {
  const baseOverview = overallScore
    ? `Marketing audit complete for ${arg}. Overall Marketing Score: ${overallScore}/100 (Grade: ${grade}). Analysis covered 6 key dimensions across content, conversion, SEO, competitive positioning, brand trust, and growth strategy.`
    : `${command.label} analysis complete for "${arg}". Based on comprehensive analysis of the target and 6 verified sources, here are the key findings and actionable recommendations.`;

  const sections = scores.length > 0
    ? [
        {
          title: "Score Breakdown",
          content: scores.map((s) => `${s.category}: ${s.score}/100 (${s.weight}% weight)\n  → ${s.finding}`).join("\n\n"),
        },
        {
          title: "Quick Wins (This Week)",
          content: "1. Rewrite primary headline with specific outcome and timeframe\n2. Add urgency text near all CTAs ('Start free trial — no credit card required')\n3. Add customer testimonials directly above pricing section\n4. Fix 3 missing meta descriptions on key landing pages\n5. Add exit-intent popup with lead magnet on blog pages",
        },
        {
          title: "Strategic Recommendations (This Month)",
          content: "1. Redesign pricing page with value framing, social proof anchoring, and recommended plan highlight\n2. Create 3 competitor comparison pages targeting '[brand] vs [competitor]' search queries\n3. Build a 5-email welcome sequence for new trial signups\n4. Implement A/B testing on homepage headline and CTA button copy",
        },
        {
          title: "Long-Term Initiatives (This Quarter)",
          content: "1. Launch content marketing campaign targeting 20 high-intent keywords in your niche\n2. Build referral program with double-sided incentives\n3. Redesign onboarding flow to reduce time-to-value for new users",
        },
        {
          title: "Revenue Impact Summary",
          content: "Implementing all recommendations could yield an estimated $8,000–$15,000/month in additional revenue based on current traffic levels and industry conversion benchmarks.",
        },
      ]
    : [
        {
          title: "Executive Summary",
          content: `Comprehensive ${command.label.toLowerCase()} analysis has been completed. The findings reveal several actionable opportunities for improvement and growth.`,
        },
        {
          title: "Key Findings",
          content: "1. Strong foundation in core areas with room for targeted optimization\n2. Several quick wins identified that can be implemented immediately\n3. Competitive landscape shows opportunities for differentiation\n4. Content strategy can be enhanced to capture more organic traffic",
        },
        {
          title: "Recommendations",
          content: "1. Optimize primary conversion paths with clearer CTAs and reduced friction\n2. Strengthen messaging with specific, outcome-driven language\n3. Build content assets targeting high-intent search queries\n4. Implement tracking and A/B testing for data-driven iterations",
        },
        {
          title: "Next Steps",
          content: `1. Review the detailed analysis in ${command.outputFile || "the report"}\n2. Prioritize quick wins for immediate implementation\n3. Schedule strategic initiatives for this month\n4. Consider follow-up analyses: /market copy, /market funnel, /market competitors`,
        },
      ];

  return {
    id: crypto.randomUUID(),
    query: `${command.command} ${arg}`,
    overview: baseOverview,
    sections,
    sources: MOCK_SOURCES,
    createdAt: new Date(),
  };
}
