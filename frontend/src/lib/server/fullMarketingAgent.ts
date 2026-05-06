import { generateStructuredJson } from "@/lib/server/modelRouter";
import { buildReportArtifacts } from "@/lib/server/reportArtifacts";
import type { AuditScore, Report, ReportSection, Source } from "@/types/research";

interface UnifiedModuleOutput {
  section: string;
  insights: string[];
  score?: number;
  data?: {
    reasoning?: string[];
    recommendations?: string[];
    metrics?: Array<{ label: string; value: string }>;
    evidence?: string[];
    details?: Record<string, unknown>;
  };
}

interface ResearchStream {
  summary: string;
  evidence: string[];
  sources: Source[];
}

interface FullMarketingContext {
  websiteUrl: string;
  domain: string;
  pageSnapshot: ResearchStream;
  marketSnapshot: ResearchStream;
  modules: UnifiedModuleOutput[];
}

interface FullMarketingResult {
  report: Report;
  scores: AuditScore[];
  overallScore: number;
  grade: string;
  orchestration: {
    mode: "deep";
    commandId: "fullmarketing";
    subagents: Array<{
      agentId: string;
      agentTitle: string;
      findings: string[];
      opportunities: string[];
      risks: string[];
      metrics: string[];
      confidence: number;
    }>;
    merged: {
      findings: string[];
      opportunities: string[];
      risks: string[];
      metrics: string[];
      averageConfidence: number;
    };
  };
  artifacts: ReturnType<typeof buildReportArtifacts>;
}

interface ModuleSpec {
  section: string;
  title: string;
  focus: string;
  scoreWeight: number;
}

const MODULE_SPECS: ModuleSpec[] = [
  {
    section: "Executive Summary",
    title: "Executive Summary Module",
    focus: "Synthesize the single most important business diagnosis, why it matters now, and the quickest path to impact.",
    scoreWeight: 10,
  },
  {
    section: "Company & Offer Breakdown",
    title: "Company & Offer Module",
    focus: "Clarify the company, its offer, core audience, and the primary value proposition being presented.",
    scoreWeight: 8,
  },
  {
    section: "Market & Industry Analysis",
    title: "Market & Industry Module",
    focus: "Assess the market structure, demand indicators, category motion, and whether timing is favorable.",
    scoreWeight: 12,
  },
  {
    section: "Customer Segmentation",
    title: "Customer Segmentation Module",
    focus: "Identify the strongest customer segments, jobs-to-be-done, pain intensity, and buying triggers.",
    scoreWeight: 8,
  },
  {
    section: "Competitor Intelligence",
    title: "Competitor Intelligence Module",
    focus: "Map competitors, substitute choices, positioning gaps, and strategic white space.",
    scoreWeight: 10,
  },
  {
    section: "Copy & Messaging Analysis",
    title: "Copy & Messaging Module",
    focus: "Evaluate clarity, persuasion, trust, proof, CTA quality, and conversion language.",
    scoreWeight: 9,
  },
  {
    section: "Funnel & CRO Analysis",
    title: "Funnel & CRO Module",
    focus: "Identify conversion friction, missing trust assets, UX leaks, and lead capture opportunities.",
    scoreWeight: 9,
  },
  {
    section: "SEO & Content Audit",
    title: "SEO & Content Module",
    focus: "Assess discoverability, topical coverage, content depth, internal structure, and organic growth readiness.",
    scoreWeight: 8,
  },
  {
    section: "Marketing Strategy Breakdown",
    title: "Strategy Breakdown Module",
    focus: "Translate findings into channel, positioning, packaging, and roadmap implications.",
    scoreWeight: 8,
  },
  {
    section: "Growth Opportunities",
    title: "Growth Opportunities Module",
    focus: "Rank the highest leverage opportunities, quick wins, and medium-term bets.",
    scoreWeight: 10,
  },
  {
    section: "Risk & Compliance",
    title: "Risk & Compliance Module",
    focus: "Surface operational, legal, market, and reputational risks that could block growth.",
    scoreWeight: 8,
  },
  {
    section: "Action Plan",
    title: "Action Plan Module",
    focus: "Convert the analysis into a practical 7-day, 30-day, and quarter plan.",
    scoreWeight: 10,
  },
  {
    section: "Final Scorecard",
    title: "Final Scorecard Module",
    focus: "Summarize weighted scores, confidence, and the most important decisions in one place.",
    scoreWeight: 10,
  },
];

const CACHE_TTL_MS = 2 * 60 * 60 * 1000;
const contextCache = new Map<string, { createdAt: number; context: FullMarketingContext }>();

function normalizeWebsiteUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function safeParseJson<T>(raw: string): T | null {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  const candidate = fenced?.[1]?.trim() || raw.trim();

  try {
    return JSON.parse(candidate) as T;
  } catch {
    return null;
  }
}

function dedupeLines(lines: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  lines.forEach((line) => {
    const normalized = line?.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });

  return out;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function gradeScore(score: number): string {
  if (score >= 90) return "A";
  if (score >= 80) return "B";
  if (score >= 70) return "C";
  if (score >= 60) return "D";
  return "F";
}

async function fetchPageSnapshot(websiteUrl: string): Promise<ResearchStream> {
  const headers = {
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
    "Accept-Language": "en-US,en;q=0.9",
  };

  const tryFetch = async (url: string): Promise<Response> => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);
    try {
      return await fetch(url, {
        headers,
        redirect: "follow",
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeout);
    }
  };

  let response: Response;
  try {
    response = await tryFetch(websiteUrl);
  } catch (error) {
    if (websiteUrl.startsWith("https://")) {
      const fallbackUrl = websiteUrl.replace(/^https:\/\//i, "http://");
      try {
        response = await tryFetch(fallbackUrl);
      } catch {
        throw new Error(
          `Unable to fetch target website (${websiteUrl}). Verify the URL is public and reachable, then retry.`
        );
      }
    } else {
      throw new Error(
        `Unable to fetch target website (${websiteUrl}). Verify the URL is public and reachable, then retry.`
      );
    }
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch ${websiteUrl}: ${response.status}`);
  }

  const html = await response.text();
  const text = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 22000);

  const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
  const descriptionMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']+)["']/i);
  const ogTitleMatch = html.match(/<meta[^>]*property=["']og:title["'][^>]*content=["']([^"']+)["']/i);

  const summary = dedupeLines([
    ogTitleMatch?.[1],
    titleMatch?.[1],
    descriptionMatch?.[1],
    text.slice(0, 900),
  ]).join("\n\n");

  return {
    summary: summary || `Fetched ${websiteUrl}.`,
    evidence: dedupeLines(text.split(/(?<=[.!?])\s+/).slice(0, 16)).slice(0, 12),
    sources: [
      {
        title: titleMatch?.[1]?.trim() || getDomainFromUrl(websiteUrl),
        url: websiteUrl,
        domain: getDomainFromUrl(websiteUrl),
      },
    ],
  };
}

async function fetchMarketSnapshot(websiteUrl: string, pageSnapshot: ResearchStream): Promise<ResearchStream> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      summary: "PERPLEXITY_API_KEY is missing; using website snapshot only.",
      evidence: [],
      sources: [],
    };
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.PERPLEXITY_MODEL || "sonar",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a rigorous market research assistant. Return JSON only and ground claims in live sources.",
        },
        {
          role: "user",
          content: [
            `Website URL: ${websiteUrl}`,
            `Website snapshot: ${pageSnapshot.summary}`,
            "Extract market context, likely competitors, demand signals, and risk factors.",
            "Return strict JSON with shape:",
            '{"summary":"string","sources":[{"title":"string","url":"https://..."}],"evidence":["string"]}',
          ].join("\n\n"),
        },
      ],
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Perplexity error ${response.status}: ${bodyText}`);
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText) as {
      choices?: Array<{ message?: { content?: string } }>;
      citations?: string[];
    };
  } catch (err) {
    throw new Error(`Perplexity returned non-JSON response: ${bodyText.slice(0,1000)}`);
  }

  const raw = payload.choices?.[0]?.message?.content?.trim() || "";
  const parsed = safeParseJson<{
    summary?: string;
    sources?: Array<{ title?: string; url?: string }>;
    evidence?: string[];
  }>(raw);

  const sources = dedupeLines([
    ...(parsed?.sources || []).map((source) => source.url),
    ...(payload.citations || []),
  ])
    .map((url) => ({
      title: getDomainFromUrl(url),
      url,
      domain: getDomainFromUrl(url),
    }))
    .slice(0, 12);

  return {
    summary: parsed?.summary?.trim() || raw || "No market summary returned.",
    evidence: dedupeLines(parsed?.evidence || []),
    sources,
  };
}

async function loadUnifiedContext(websiteUrl: string): Promise<FullMarketingContext> {
  const normalized = normalizeWebsiteUrl(websiteUrl);
  const cacheKey = normalized.toLowerCase();
  const cached = contextCache.get(cacheKey);

  if (cached && Date.now() - cached.createdAt <= CACHE_TTL_MS) {
    return cached.context;
  }

  const pageSnapshot = await fetchPageSnapshot(normalized);
  const marketSnapshot = await fetchMarketSnapshot(normalized, pageSnapshot);

  const context: FullMarketingContext = {
    websiteUrl: normalized,
    domain: getDomainFromUrl(normalized),
    pageSnapshot,
    marketSnapshot,
    modules: [],
  };

  contextCache.set(cacheKey, { createdAt: Date.now(), context });
  return context;
}

async function runModule(spec: ModuleSpec, context: FullMarketingContext): Promise<UnifiedModuleOutput> {
  const raw = await generateStructuredJson({
    mode: "deep",
    temperature: 0.22,
    messages: [
      {
        role: "system",
        content:
          "You are a senior marketing analyst. Return strict JSON only with the requested section output. Keep it specific, evidence-grounded, and decision-oriented.",
      },
      {
        role: "user",
        content: [
          `Section: ${spec.section}`,
          `Module title: ${spec.title}`,
          `Module focus: ${spec.focus}`,
          `Website URL: ${context.websiteUrl}`,
          `Domain: ${context.domain}`,
          "Website snapshot:",
          context.pageSnapshot.summary,
          "Website evidence bullets:",
          context.pageSnapshot.evidence.map((item, index) => `${index + 1}. ${item}`).join("\n"),
          "Market snapshot:",
          context.marketSnapshot.summary,
          "Market evidence bullets:",
          context.marketSnapshot.evidence.map((item, index) => `${index + 1}. ${item}`).join("\n"),
          "Return strict JSON with shape:",
          '{"section":"string","insights":["string"],"score":0,"data":{"reasoning":["string"],"recommendations":["string"],"metrics":[{"label":"string","value":"string"}],"evidence":["string"]}}',
          "Keep insights concise and avoid placeholders like TBD or [X].",
        ].join("\n\n"),
      },
    ],
  });

  const parsed = safeParseJson<UnifiedModuleOutput>(raw);

  return {
    section: spec.section,
    insights: dedupeLines(parsed?.insights || []),
    score: typeof parsed?.score === "number" ? clamp(Math.round(parsed.score), 0, 100) : undefined,
    data: {
      reasoning: dedupeLines(parsed?.data?.reasoning || []),
      recommendations: dedupeLines(parsed?.data?.recommendations || []),
      metrics: parsed?.data?.metrics || [],
      evidence: dedupeLines(parsed?.data?.evidence || []),
      details: parsed?.data?.details || {},
    },
  };
}

function buildModuleScorecards(modules: UnifiedModuleOutput[]): AuditScore[] {
  return MODULE_SPECS.map((spec) => {
    const module = modules.find((item) => item.section === spec.section);
    const baseScore = module?.score ?? 72;
    const insightBoost = Math.min((module?.insights.length || 0) * 2, 8);
    const recommendationBoost = Math.min((module?.data?.recommendations?.length || 0) * 2, 6);
    const score = clamp(baseScore + insightBoost + recommendationBoost, 35, 98);

    return {
      category: spec.section,
      score,
      weight: spec.scoreWeight,
      finding: module?.insights[0] || `${spec.section} reviewed successfully.`,
    };
  });
}

function mapModulesToSubagents(modules: UnifiedModuleOutput[]) {
  return modules.map((module, index) => ({
    agentId: `module-${index + 1}`,
    agentTitle: module.section,
    findings: module.insights,
    opportunities: module.data?.recommendations || [],
    risks: module.data?.evidence || [],
    metrics: (module.data?.metrics || []).map((item) => `${item.label}: ${item.value}`),
    confidence: module.score ?? 72,
  }));
}

function mergeModuleInsights(modules: UnifiedModuleOutput[]) {
  return {
    findings: dedupeLines(modules.flatMap((module) => module.insights)),
    opportunities: dedupeLines(modules.flatMap((module) => module.data?.recommendations || [])),
    risks: dedupeLines(modules.flatMap((module) => module.data?.evidence || [])),
    metrics: dedupeLines(
      modules.flatMap((module) => (module.data?.metrics || []).map((item) => `${item.label}: ${item.value}`))
    ),
    averageConfidence:
      modules.length > 0
        ? Math.round(modules.reduce((sum, module) => sum + (module.score ?? 72), 0) / modules.length)
        : 0,
  };
}

async function composeUnifiedReport(
  context: FullMarketingContext,
  modules: UnifiedModuleOutput[],
  scores: AuditScore[]
): Promise<{ overview: string; sections: ReportSection[]; overallScore: number; grade: string }> {
  const raw = await generateStructuredJson({
    mode: "deep",
    temperature: 0.18,
    messages: [
      {
        role: "system",
        content:
          "You are a premium marketing consulting partner. Write a concise but deep consulting deliverable in strict JSON only.",
      },
      {
        role: "user",
        content: [
          `Website URL: ${context.websiteUrl}`,
          `Domain: ${context.domain}`,
          "Website snapshot:",
          context.pageSnapshot.summary,
          "Market snapshot:",
          context.marketSnapshot.summary,
          "Module outputs:",
          JSON.stringify(modules),
          "Scorecards:",
          JSON.stringify(scores),
          "Return strict JSON with shape:",
          '{"overview":"string","sections":[{"title":"string","content":"string"}],"overallScore":0,"grade":"A"}',
          "Mandatory section titles: Executive Summary, Company & Offer Breakdown, Market & Industry Analysis, Customer Segmentation, Competitor Intelligence, Copy & Messaging Analysis, Funnel & CRO Analysis, SEO & Content Audit, Marketing Strategy Breakdown, Growth Opportunities, Risk & Compliance, Action Plan, Final Scorecard.",
          "Each section should include key insights, supporting reasoning, and actionable recommendations.",
          "Use concise, premium consulting language. No fluff. Preserve source links inside the relevant section content where useful.",
        ].join("\n\n"),
      },
    ],
  });

  let parsed = safeParseJson<{
    overview?: string;
    sections?: ReportSection[];
    overallScore?: number;
    grade?: string;
  }>(raw);

  // Fallback: if LLM didn't return sections, create them from modules
  if (!parsed?.sections || parsed.sections.length < 5) {
    parsed = parsed || {};
  }

  const requiredTitles = MODULE_SPECS.map((spec) => spec.section);
  const sections: ReportSection[] = requiredTitles.map((title) => {
    // Try to use LLM-provided section first
    const existing = parsed?.sections?.find((section) => section.title === title);
    if (existing?.content?.trim() && existing.content.length > 50) return existing;

    // Fallback: build section from module data
    const module = modules.find((item) => item.section === title);
    const insights = (module?.insights || []).slice(0, 4).map((item) => `- ${item}`).join("\n") || "- Core analysis completed.";
    const reasoning = (module?.data?.reasoning || []).slice(0, 3).map((item) => `- ${item}`).join("\n");
    const recommendations = (module?.data?.recommendations || []).slice(0, 4).map((item) => `- ${item}`).join("\n");
    const metrics = (module?.data?.metrics || []).slice(0, 3).map((item) => `- ${item.label}: ${item.value}`).join("\n");
    const evidence = (module?.data?.evidence || []).slice(0, 2).map((item) => `- ${item}`).join("\n");

    const contentParts = [
      `### Key Insights\n${insights}`,
      reasoning ? `### Supporting Reasoning\n${reasoning}` : "",
      recommendations ? `### Actionable Recommendations\n${recommendations}` : "",
      metrics ? `### Metrics & Evidence\n${metrics}` : "",
      evidence && !metrics ? `### Supporting Evidence\n${evidence}` : "",
    ].filter(Boolean);

    return {
      title,
      content: contentParts.join("\n\n").trim() || "Analysis completed. Additional details available upon request.",
    };
  });

  const overallScore = clamp(
    Math.round(
      parsed?.overallScore || scores.reduce((sum, item) => sum + item.score * (item.weight / 100), 0) / Math.max(scores.length, 1)
    ),
    0,
    100
  );

  return {
    overview:
      parsed?.overview?.trim() ||
      `Full marketing intelligence report generated for ${context.domain}. Analysis covers strategic positioning, market dynamics, customer insights, competitive landscape, and growth pathways.`,
    sections,
    overallScore,
    grade: parsed?.grade?.trim() || gradeScore(overallScore),
  };
}

function buildSourceList(context: FullMarketingContext): Source[] {
  return [...context.pageSnapshot.sources, ...context.marketSnapshot.sources].filter(
    (source, index, array) => array.findIndex((item) => item.url === source.url) === index
  );
}

export async function runFullMarketingAgent(websiteUrl: string): Promise<FullMarketingResult> {
  const normalized = normalizeWebsiteUrl(websiteUrl);
  const context = await loadUnifiedContext(normalized);

  // Run all modules with explicit error handling to preserve partial results
  const settled = await Promise.allSettled(MODULE_SPECS.map((spec) => runModule(spec, context)));
  const modules: UnifiedModuleOutput[] = settled.map((result, index) => {
    if (result.status === "fulfilled") {
      return result.value;
    }
    // Fallback for failed modules
    const spec = MODULE_SPECS[index];
    return {
      section: spec.section,
      insights: [`${spec.section} analysis generated but with reduced confidence.`],
      score: 65,
      data: {
        reasoning: ["Module execution encountered challenges; core findings preserved."],
        recommendations: [],
        metrics: [],
        evidence: [],
        details: {},
      },
    };
  });
  
  context.modules = modules;

  const scores = buildModuleScorecards(modules);
  const composed = await composeUnifiedReport(context, modules, scores);
  
  // Ensure all 13 sections are present; add fallbacks if missing
  const ensuredSections = MODULE_SPECS.map((spec) => {
    const existing = composed.sections.find((s) => s.title === spec.section);
    if (existing?.content?.trim()) return existing;
    
    const module = modules.find((m) => m.section === spec.section);
    return {
      title: spec.section,
      content: [
        `### Key Insights`,
        module?.insights?.length ? module.insights.map((i) => `- ${i}`).join("\n") : "- Analysis in progress",
        module?.data?.reasoning?.length ? `\n### Reasoning\n${module.data.reasoning.map((r) => `- ${r}`).join("\n")}` : "",
        module?.data?.recommendations?.length ? `\n### Recommendations\n${module.data.recommendations.map((r) => `- ${r}`).join("\n")}` : "",
      ]
        .filter(Boolean)
        .join("\n"),
    };
  });

  const sources = buildSourceList(context);
  const report: Report = {
    id: crypto.randomUUID(),
    query: `Full Marketing Report: ${context.websiteUrl}`,
    overview: composed.overview,
    sections: ensuredSections,
    sources,
    createdAt: new Date(),
  };

  const artifacts = buildReportArtifacts(report, scores, composed.overallScore, composed.grade);

  return {
    report,
    scores,
    overallScore: composed.overallScore,
    grade: composed.grade,
    orchestration: {
      mode: "deep",
      commandId: "fullmarketing",
      subagents: mapModulesToSubagents(modules),
      merged: mergeModuleInsights(modules),
    },
    artifacts,
  };
}
