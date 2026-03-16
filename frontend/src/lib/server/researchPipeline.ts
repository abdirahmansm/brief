import { MARKETING_COMMANDS } from "@/lib/marketingSkills";
import { AuditScore, Report, ReportSection, Source } from "@/types/research";
import { generateStructuredJson } from "@/lib/server/modelRouter";
import commandSkills from "@/lib/server/commandSkills.json";
import { buildReportArtifacts, ReportArtifacts } from "@/lib/server/reportArtifacts";

interface PerplexityResearch {
  summary: string;
  sources: Source[];
  evidence: string[];
}

interface RunResearchInput {
  query: string;
  commandId?: string;
  commandArg?: string;
}

interface CommandSkillBlock {
  pre: string[];
  post: string[];
}

interface SubagentSpec {
  id: string;
  title: string;
  systemPrompt: string;
  focus: string;
}

interface SubagentOutput {
  agentId: string;
  agentTitle: string;
  findings: string[];
  opportunities: string[];
  risks: string[];
  metrics: string[];
  confidence: number;
}

interface MergedInsights {
  findings: string[];
  opportunities: string[];
  risks: string[];
  metrics: string[];
  averageConfidence: number;
}

interface RunResearchResult {
  report: Report;
  scores?: AuditScore[];
  overallScore?: number;
  grade?: string;
  orchestration: {
    mode: "simple" | "deep";
    commandId?: string;
    subagents: SubagentOutput[];
    merged: MergedInsights;
  };
  artifacts: ReportArtifacts;
}

function extractJsonBlock(raw: string): string {
  const fenced = raw.match(/```json\s*([\s\S]*?)```/i);
  if (fenced?.[1]) return fenced[1].trim();
  return raw.trim();
}

function safeParseJson<T>(raw: string): T | null {
  try {
    return JSON.parse(extractJsonBlock(raw)) as T;
  } catch {
    return null;
  }
}

function getDomainFromUrl(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "source";
  }
}

function dedupeLines(lines: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  lines.forEach((line) => {
    const normalized = line.trim();
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

function formatSkillList(lines: string[]): string {
  if (!lines.length) return "";
  return lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
}

function scoreGrade(score?: number): string | undefined {
  if (typeof score !== "number") return undefined;
  if (score >= 85) return "A";
  if (score >= 70) return "B";
  if (score >= 55) return "C";
  if (score >= 40) return "D";
  return "F";
}

function getCommandSkill(commandId?: string): CommandSkillBlock | null {
  if (!commandId) return null;
  const blocks = commandSkills.commands as Record<string, CommandSkillBlock>;
  return blocks[commandId] || null;
}

function getSubagentSpecs(mode: "simple" | "deep", commandId?: string): SubagentSpec[] {
  if (mode === "simple") {
    return [
      {
        id: "signal",
        title: "Signal Scanner",
        systemPrompt: "You are a concise market signal analyst.",
        focus: "Extract only the most material signals and trends.",
      },
      {
        id: "opportunity",
        title: "Opportunity Mapper",
        systemPrompt: "You are a market opportunity analyst.",
        focus: "Identify highest-value opportunities and immediate next moves.",
      },
    ];
  }

  const common: SubagentSpec[] = [
    {
      id: "demand",
      title: "Demand Intelligence Agent",
      systemPrompt: "You analyze demand, timing, and market pull.",
      focus: "Estimate demand strength, intent indicators, and momentum signals.",
    },
    {
      id: "competition",
      title: "Competitive Dynamics Agent",
      systemPrompt: "You analyze competitors, substitutes, and strategic positioning.",
      focus: "Identify where incumbents are strong, weak, and over/under-positioned.",
    },
    {
      id: "customer",
      title: "Customer Insight Agent",
      systemPrompt: "You analyze customer pain, jobs-to-be-done, and segment behavior.",
      focus: "Extract recurring pain patterns and willingness-to-pay indicators.",
    },
    {
      id: "economics",
      title: "Market Economics Agent",
      systemPrompt: "You analyze market economics, value pools, and monetization constraints.",
      focus: "Map margin drivers, pricing pressure, and economic viability.",
    },
    {
      id: "risk",
      title: "Regulatory & Risk Agent",
      systemPrompt: "You analyze execution risk, compliance pressure, and downside scenarios.",
      focus: "Surface launch blockers, policy risk, and operational fragility.",
    },
  ];

  if (commandId === "audit") {
    return [
      {
        id: "content",
        title: "Content & Messaging Agent",
        systemPrompt: "You audit messaging clarity and conversion communication quality.",
        focus: "Evaluate positioning clarity, value proposition, and persuasive strength.",
      },
      {
        id: "conversion",
        title: "Conversion Optimization Agent",
        systemPrompt: "You audit conversion friction and CTA pathways.",
        focus: "Assess CTA quality, friction points, and conversion blockers.",
      },
      {
        id: "seo",
        title: "SEO & Discoverability Agent",
        systemPrompt: "You audit discoverability and organic growth readiness.",
        focus: "Evaluate search visibility, technical SEO signals, and content gaps.",
      },
      {
        id: "positioning",
        title: "Competitive Positioning Agent",
        systemPrompt: "You audit strategic differentiation in the market.",
        focus: "Assess positioning clarity versus alternatives and substitutes.",
      },
      {
        id: "trust",
        title: "Brand & Trust Agent",
        systemPrompt: "You audit trust signals and credibility architecture.",
        focus: "Assess proof, trust cues, and credibility weaknesses.",
      },
    ];
  }

  return common;
}

async function fetchPerplexityResearch(
  prompt: string,
  deepMode: boolean
): Promise<PerplexityResearch> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    return {
      summary: "Perplexity key missing; using model-only analysis.",
      sources: [],
      evidence: [],
    };
  }

  const system =
    "You are a rigorous market research assistant. Use live web results. Return JSON only.";
  const user = [
    `Research prompt: ${prompt}`,
    deepMode
      ? "Depth: deep strategic and tactical research for market command execution."
      : "Depth: concise research summary for normal query.",
    "Return strict JSON with shape:",
    '{"summary":"string","sources":[{"title":"string","url":"https://..."}],"evidence":["bullet evidence with source context"]}',
    "Include 6-12 sources when available.",
  ].join("\n");

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
        { role: "system", content: system },
        { role: "user", content: user },
      ],
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Perplexity error ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    citations?: string[];
    choices?: Array<{ message?: { content?: string } }>;
  };

  const rawContent = payload.choices?.[0]?.message?.content?.trim() || "";

  const parsed = safeParseJson<{
    summary?: string;
    sources?: Array<{ title?: string; url?: string }>;
    evidence?: string[];
  }>(rawContent);

  const parsedSources = (parsed?.sources || [])
    .filter((s) => s.url)
    .slice(0, 14)
    .map((s) => ({
      title: s.title?.trim() || s.url || "Untitled source",
      url: s.url || "",
      domain: getDomainFromUrl(s.url || ""),
    }))
    .filter((s) => !!s.url);

  const citationSources = (payload.citations || [])
    .slice(0, 14)
    .map((url) => ({
      title: getDomainFromUrl(url),
      url,
      domain: getDomainFromUrl(url),
    }));

  const mergedSources: Source[] = [...parsedSources, ...citationSources]
    .filter((src, index, arr) => arr.findIndex((s) => s.url === src.url) === index)
    .slice(0, 14);

  return {
    summary: parsed?.summary || rawContent || "No summary returned.",
    evidence: parsed?.evidence || [],
    sources: mergedSources,
  };
}

async function runSubagent(
  spec: SubagentSpec,
  mode: "simple" | "deep",
  commandContext: string,
  webResearch: PerplexityResearch,
  globalPreflight: string[],
  globalPostflight: string[],
  commandSkill: CommandSkillBlock | null
): Promise<SubagentOutput> {
  const userPrompt = [
    `Agent: ${spec.title}`,
    `Focus: ${spec.focus}`,
    commandContext,
    "Global preflight rules:",
    formatSkillList(globalPreflight),
    commandSkill ? "Command-specific preflight rules:" : "",
    commandSkill ? formatSkillList(commandSkill.pre) : "",
    "Web research summary:",
    webResearch.summary,
    "Evidence bullets:",
    webResearch.evidence.map((item, idx) => `${idx + 1}. ${item}`).join("\n") || "No evidence provided.",
    "Global postflight rules:",
    formatSkillList(globalPostflight),
    commandSkill ? formatSkillList(commandSkill.post) : "",
    "Return strict JSON with shape:",
    '{"findings":[""],"opportunities":[""],"risks":[""],"metrics":[""],"confidence":0}',
    "Confidence must be from 0 to 100.",
  ]
    .filter(Boolean)
    .join("\n\n");

  const raw = await generateStructuredJson({
    mode,
    temperature: mode === "deep" ? 0.35 : 0.25,
    messages: [
      { role: "system", content: spec.systemPrompt },
      { role: "user", content: userPrompt },
    ],
  });

  const parsed = safeParseJson<{
    findings?: string[];
    opportunities?: string[];
    risks?: string[];
    metrics?: string[];
    confidence?: number;
  }>(raw);

  return {
    agentId: spec.id,
    agentTitle: spec.title,
    findings: dedupeLines(parsed?.findings || []),
    opportunities: dedupeLines(parsed?.opportunities || []),
    risks: dedupeLines(parsed?.risks || []),
    metrics: dedupeLines(parsed?.metrics || []),
    confidence: clamp(Math.round(parsed?.confidence || 60), 0, 100),
  };
}

function mergeSubagentOutputs(outputs: SubagentOutput[]): MergedInsights {
  const findings = dedupeLines(outputs.flatMap((item) => item.findings));
  const opportunities = dedupeLines(outputs.flatMap((item) => item.opportunities));
  const risks = dedupeLines(outputs.flatMap((item) => item.risks));
  const metrics = dedupeLines(outputs.flatMap((item) => item.metrics));

  const averageConfidence =
    outputs.length > 0
      ? Math.round(outputs.reduce((acc, item) => acc + item.confidence, 0) / outputs.length)
      : 0;

  return {
    findings,
    opportunities,
    risks,
    metrics,
    averageConfidence,
  };
}

function buildAuditScoresFromSubagents(outputs: SubagentOutput[]): AuditScore[] {
  if (!outputs.length) return [];

  const defaultWeights = [25, 20, 20, 15, 10, 10];
  const labels = [
    "Content & Messaging",
    "Conversion Optimization",
    "SEO & Discoverability",
    "Competitive Positioning",
    "Brand & Trust",
    "Growth & Strategy",
  ];

  return labels.map((category, index) => {
    const source = outputs[index % outputs.length];
    const finding =
      source.findings[0] || source.opportunities[0] || source.risks[0] || "No dominant signal detected.";

    const opportunityBoost = Math.min(source.opportunities.length * 2, 8);
    const riskPenalty = Math.min(source.risks.length * 2, 10);
    const score = clamp(source.confidence + opportunityBoost - riskPenalty, 35, 95);

    return {
      category,
      score,
      weight: defaultWeights[index],
      finding,
    };
  });
}

async function composeFinalReport(
  mode: "simple" | "deep",
  query: string,
  commandContext: string,
  merged: MergedInsights,
  outputs: SubagentOutput[],
  commandSkill: CommandSkillBlock | null
): Promise<{ overview: string; sections: ReportSection[] }> {
  const raw = await generateStructuredJson({
    mode,
    temperature: mode === "deep" ? 0.3 : 0.2,
    messages: [
      {
        role: "system",
        content:
          mode === "deep"
            ? "You are Brief's lead market research editor. Compose an operator-grade report in JSON."
            : "You are Brief's concise market research editor. Compose a brief practical report in JSON.",
      },
      {
        role: "user",
        content: [
          `User Query: ${query}`,
          commandContext,
          "Deterministic merged subagent schema:",
          JSON.stringify(merged),
          "Raw subagent outputs:",
          JSON.stringify(outputs),
          "Command postflight skills:",
          commandSkill ? formatSkillList(commandSkill.post) : "None",
          "Return strict JSON with shape:",
          '{"overview":"string","sections":[{"title":"string","content":"string"}]}'
        ].join("\n\n"),
      },
    ],
  });

  const parsed = safeParseJson<{
    overview?: string;
    sections?: Array<{ title?: string; content?: string }>;
  }>(raw);

  const sections: ReportSection[] = (parsed?.sections || [])
    .filter((section) => section?.title && section?.content)
    .map((section) => ({
      title: section.title || "Section",
      content: section.content || "",
    }));

  const fallback: ReportSection[] = [
    {
      title: "Cross-Agent Findings",
      content:
        merged.findings.map((item, i) => `${i + 1}. ${item}`).join("\n") || "No major findings extracted.",
    },
    {
      title: "Opportunities",
      content:
        merged.opportunities.map((item, i) => `${i + 1}. ${item}`).join("\n") || "No clear opportunities extracted.",
    },
    {
      title: "Risks & Constraints",
      content:
        merged.risks.map((item, i) => `${i + 1}. ${item}`).join("\n") || "No major risk signals extracted.",
    },
  ];

  return {
    overview:
      parsed?.overview ||
      (mode === "deep"
        ? "Deep market research synthesis completed through parallel specialist agents."
        : "Market research synthesis completed through concise specialist analysis."),
    sections: sections.length ? sections : fallback,
  };
}

export async function runResearchPipeline({
  query,
  commandId,
  commandArg,
}: RunResearchInput): Promise<RunResearchResult> {
  const command = commandId
    ? MARKETING_COMMANDS.find((item) => item.id === commandId)
    : null;

  const mode: "simple" | "deep" = command ? "deep" : "simple";
  const commandSkill = getCommandSkill(command?.id);
  const commandContext = command
    ? `Command ID: ${command.id}\nCommand Label: ${command.label}\nCommand Description: ${command.description}\nCommand Phases: ${command.phases.join(" | ")}`
    : "No command mode. Use concise direct market research synthesis.";

  const researchPrompt = command
    ? `${command.command} ${commandArg || query}`
    : query;

  const webResearch = await fetchPerplexityResearch(researchPrompt, mode === "deep");
  const specs = getSubagentSpecs(mode, command?.id);

  const settled = await Promise.allSettled(
    specs.map((spec) =>
      runSubagent(
        spec,
        mode,
        commandContext,
        webResearch,
        commandSkills.globalPreflight,
        commandSkills.globalPostflight,
        commandSkill
      )
    )
  );

  const successfulOutputs: SubagentOutput[] = settled
    .map((result, index) => {
      if (result.status === "fulfilled") return result.value;
      return {
        agentId: specs[index].id,
        agentTitle: specs[index].title,
        findings: [`${specs[index].title} failed to return output.`],
        opportunities: [],
        risks: ["Agent failure reduced analysis confidence."],
        metrics: [],
        confidence: 35,
      } satisfies SubagentOutput;
    });

  const merged = mergeSubagentOutputs(successfulOutputs);
  const composed = await composeFinalReport(
    mode,
    command ? `${command.command} ${commandArg || query}` : query,
    commandContext,
    merged,
    successfulOutputs,
    commandSkill
  );

  const scores = command?.id === "audit" ? buildAuditScoresFromSubagents(successfulOutputs) : [];
  const overallScore =
    scores.length > 0
      ? Math.round(scores.reduce((acc, item) => acc + item.score * (item.weight / 100), 0))
      : undefined;

  const report: Report = {
    id: crypto.randomUUID(),
    query: command ? `${command.command} ${commandArg || query}` : query,
    overview: composed.overview,
    sections: composed.sections,
    sources: webResearch.sources,
    createdAt: new Date(),
  };

  const artifacts = buildReportArtifacts(report, scores, overallScore, scoreGrade(overallScore));

  return {
    report,
    scores,
    overallScore,
    grade: scoreGrade(overallScore),
    orchestration: {
      mode,
      commandId: command?.id,
      subagents: successfulOutputs,
      merged,
    },
    artifacts,
  };
}
