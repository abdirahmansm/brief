import { MARKETING_COMMANDS } from "@/lib/marketingSkills";
import { AuditScore, Report, ReportSection, Source } from "@/types/research";
import { generateStructuredJson } from "@/lib/server/modelRouter";
import { runFullMarketingAgent } from "@/lib/server/fullMarketingAgent";
import commandSkills from "@/lib/server/commandSkills.json";
import { buildReportArtifacts, ReportArtifacts } from "@/lib/server/reportArtifacts";
import { readFile } from "node:fs/promises";
import path from "node:path";

interface PerplexityResearch {
  summary: string;
  sources: Source[];
  evidence: string[];
}

interface VisualReference {
  sourceTitle: string;
  sourceUrl: string;
  domain: string;
  imageUrl: string;
}

interface RunResearchInput {
  query: string;
  commandId?: string;
  commandArg?: string;
  responseDepth?: "simple" | "deep";
}

interface CommandSkillBlock {
  pre: string[];
  post: string[];
}

interface CommandSkillDoc {
  skillPath: string;
  excerpt: string;
  requirements: string[];
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

const DEEP_REQUIRED_SECTION_TITLES = [
  "WHAT MATTERS TODAY",
  "MARKET THESIS",
  "EXECUTIVE BRIEFING",
  "SIGNAL STRENGTH",
  "OPPORTUNITY MAP",
  "DEEP DIVE SOURCES",
  "SOURCES",
];

const COMMAND_SKILL_DIR_MAP: Record<string, string> = {
  audit: "market-audit",
  quick: "market-quick",
  deepresearch: "market-deepresearch",
  scrape: "market-scrape",
  copy: "market-copy",
  emails: "market-emails",
  social: "market-social",
  ads: "market-ads",
  funnel: "market-funnel",
  competitors: "market-competitors",
  landing: "market-landing",
  launch: "market-launch",
  proposal: "market-proposal",
  report: "market-report",
  seo: "market-seo",
  brand: "market-brand",
  sizing: "market-sizing",
  segments: "market-segments",
  demand: "market-demand",
  landscape: "market-landscape",
  whitespace: "market-whitespace",
  regulatory: "market-regulatory",
};

const commandSkillDocCache = new Map<string, CommandSkillDoc | null>();

const CONVERSATIONAL_PATTERNS: RegExp[] = [
  /^(hi|hello|hey|yo|sup)\b/i,
  /\b(how are you|who are you|what can you do)\b/i,
  /\b(thanks|thank you|thx)\b/i,
  /\b(help|assist me|show commands)\b/i,
  /\b(good morning|good afternoon|good evening)\b/i,
];

const RESEARCH_INTENT_PATTERNS: RegExp[] = [
  /\bmarket\b/i,
  /\bcompetitor(s)?\b/i,
  /\btrend(s)?\b/i,
  /\bresearch\b/i,
  /\banaly(s|z)e|analysis\b/i,
  /\breport\b/i,
  /\bcustomer(s)?\b/i,
  /\bpain\s?point(s)?\b/i,
  /\bpricing\b/i,
  /\bseo\b/i,
  /\bfunnel\b/i,
  /\bdemand\b/i,
  /\bsegment(s|ation)?\b/i,
  /\btam|sam|som\b/i,
  /\bopportunit(y|ies)\b/i,
  /\breview(s)?\b/i,
  /\bcomplaint(s)?\b/i,
  /\breliab(le|ility)\b/i,
  /\bamazon\b/i,
  /https?:\/\//i,
];

const BRIEF_HELP_PATTERNS: RegExp[] = [
  /\bcommand(s)?\b/i,
  /\bhow (can|do) i use\b/i,
  /\bwhat can (you|brief) do\b/i,
  /\bhow does (this|brief) work\b/i,
  /\bshow (me )?(the )?commands\b/i,
  /\bwhich command(s)?\b/i,
  /\bhelp me use\b/i,
  /\bto my benefit\b/i,
];

const DEEP_RESEARCH_MIN_SOURCES = 20;
const DEEP_RESEARCH_MAX_SOURCES = 50;
const DEEP_RESEARCH_VISUAL_LIMIT = 10;

type NonCommandIntent =
  | "greeting"
  | "gratitude"
  | "help"
  | "research-request"
  | "general";

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

function absolutizeUrl(candidate: string, baseUrl: string): string {
  try {
    return new URL(candidate, baseUrl).toString();
  } catch {
    return candidate;
  }
}

function extractSourceImageUrl(html: string, pageUrl: string): string | null {
  const patterns = [
    /<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]*name=["']twitter:image["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<meta[^>]*name=["']twitter:image:src["'][^>]*content=["']([^"']+)["'][^>]*>/i,
    /<img[^>]*src=["']([^"']+)["'][^>]*>/i,
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);
    const candidate = match?.[1]?.trim();
    if (!candidate) continue;
    if (/^data:/i.test(candidate)) continue;
    return absolutizeUrl(candidate, pageUrl);
  }

  return null;
}

async function fetchVisualReferences(
  sources: Source[],
  limit = DEEP_RESEARCH_VISUAL_LIMIT
): Promise<VisualReference[]> {
  const targets = sources.slice(0, Math.max(0, limit));
  if (!targets.length) return [];

  const results = await Promise.allSettled(
    targets.map(async (source) => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 6500);
      try {
        const response = await fetch(source.url, {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
            "Accept-Language": "en-US,en;q=0.9",
          },
          signal: controller.signal,
          redirect: "follow",
        });

        if (!response.ok) return null;
        const html = await response.text();
        const imageUrl = extractSourceImageUrl(html, source.url);
        if (!imageUrl) return null;

        return {
          sourceTitle: source.title,
          sourceUrl: source.url,
          domain: source.domain,
          imageUrl,
        } satisfies VisualReference;
      } catch {
        return null;
      } finally {
        clearTimeout(timeout);
      }
    })
  );

  return results
    .filter((item): item is PromiseFulfilledResult<VisualReference | null> => item.status === "fulfilled")
    .map((item) => item.value)
    .filter((item): item is VisualReference => Boolean(item))
    .filter((item, index, arr) => arr.findIndex((other) => other.imageUrl === item.imageUrl) === index)
    .slice(0, limit);
}

function buildDeepResearchPromptVariants(basePrompt: string, effectiveArg: string): string[] {
  return [
    [
      basePrompt,
      "Focus on major global and regional news coverage (Reuters, Bloomberg, WSJ, FT, CNBC, AP, TechCrunch, The Information when available).",
      "Capture major moves, launches, funding, policy, and market share narratives with citations.",
    ].join("\n"),
    [
      basePrompt,
      "Prioritize journals, research reports, analyst publications, and reputable market intelligence datasets.",
      "Extract quantified trend evidence and methodology notes where available.",
    ].join("\n"),
    [
      basePrompt,
      "Include newsletters and operator analyses (high-signal Substack/newsletters, founder letters, technical deep dives).",
      "Separate opinion from evidence; keep only decision-relevant insights.",
    ].join("\n"),
    [
      basePrompt,
      "Add social and community pulse from credible threads/discussions (X/Twitter, Reddit, LinkedIn, Hacker News, GitHub issues when relevant).",
      "Treat social inputs as directional unless corroborated by stronger sources.",
    ].join("\n"),
    [
      basePrompt,
      `Expand direct source sweep for ${effectiveArg}. Include company releases, product docs, pricing pages, and regulator/government updates.`,
      "Prioritize high-authority primary sources.",
    ].join("\n"),
  ];
}

function dedupeLines(lines: Array<unknown>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  lines.forEach((line) => {
    let normalized = "";
    if (typeof line === "string") {
      normalized = line.trim();
    } else if (typeof line === "number" || typeof line === "boolean") {
      normalized = String(line).trim();
    } else if (
      line &&
      typeof line === "object" &&
      "text" in line &&
      typeof (line as { text?: unknown }).text === "string"
    ) {
      normalized = (line as { text: string }).text.trim();
    }

    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(normalized);
  });
  return out;
}

function normalizeForSimilarity(input: string): string {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function similarityScore(a: string, b: string): number {
  const aWords = new Set(normalizeForSimilarity(a).split(" ").filter(Boolean));
  const bWords = new Set(normalizeForSimilarity(b).split(" ").filter(Boolean));
  if (!aWords.size || !bWords.size) return 0;

  let overlap = 0;
  aWords.forEach((word) => {
    if (bWords.has(word)) overlap += 1;
  });

  return overlap / Math.max(aWords.size, bWords.size);
}

function listMissingDeepSections(sections: ReportSection[]): string[] {
  const available = sections.map((section) => section.title.toLowerCase());
  return DEEP_REQUIRED_SECTION_TITLES.filter(
    (required) => !available.some((title) => title.includes(required.toLowerCase()))
  );
}

function buildDeepReportIssues(overview: string, sections: ReportSection[]): string[] {
  const issues: string[] = [];
  const combinedText = [overview, ...sections.map((section) => `${section.title}\n${section.content}`)]
    .join("\n\n")
    .trim();
  const wordCount = combinedText.split(/\s+/).filter(Boolean).length;

  if (wordCount < 1800) {
    issues.push(
      `Report depth is too thin (${wordCount} words). Expand to a premium long-form level (roughly 5-10 page equivalent).`
    );
  }

  const missingSections = listMissingDeepSections(sections);
  if (missingSections.length) {
    issues.push(`Missing required sections: ${missingSections.join(", ")}.`);
  }

  sections.forEach((section) => {
    if (/fact-checked signal table/i.test(section.title)) {
      if (/\|\s*[^\n|]+\s*\|\s*\|\s*\|\s*\|/i.test(section.content)) {
        issues.push(
          "Fact-Checked Signal Table has empty classification cells. Fill verified/probable/uncertain content for each row."
        );
      }
    }
  });

  for (let i = 0; i < sections.length; i += 1) {
    for (let j = i + 1; j < sections.length; j += 1) {
      const similarity = similarityScore(sections[i].content, sections[j].content);
      if (similarity >= 0.72) {
        issues.push(
          `Sections '${sections[i].title}' and '${sections[j].title}' are overly repetitive. Make each section uniquely informative.`
        );
      }
    }
  }

  return dedupeLines(issues);
}

function buildReportQueryTitle(commandId: string | undefined, effectiveArg: string, fallbackQuery: string): string {
  if (commandId !== "deepresearch") {
    return fallbackQuery;
  }

  const lines = effectiveArg.split(/\r?\n/);
  const market =
    lines.find((line) => line.toLowerCase().startsWith("market:"))?.split(":").slice(1).join(":").trim() ||
    "Market";
  const niche =
    lines.find((line) => line.toLowerCase().startsWith("niche focus:"))?.split(":").slice(1).join(":").trim() ||
    "Deep Coverage";
  const geography =
    lines.find((line) => line.toLowerCase().startsWith("geography:"))?.split(":").slice(1).join(":").trim() ||
    "Global";

  // Create an exciting, eye-catching headline
  const excitingWords = ["🚀 Unleashing", "🔥 Igniting", "⚡ Revolutionizing", "💥 Dominating", "🌟 Transforming"];
  const randomWord = excitingWords[Math.floor(Math.random() * excitingWords.length)];
  
  return `${randomWord} ${market}: ${niche} in ${geography}`;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function formatSkillList(lines: string[]): string {
  if (!lines.length) return "";
  return lines.map((line, i) => `${i + 1}. ${line}`).join("\n");
}

function extractCommandSkillRequirements(markdown: string): string[] {
  const lines = markdown.split(/\r?\n/);
  const requirements: string[] = [];
  let inRelevantSection = false;

  const relevantHeader = /(output|checklist|framework|rubric|scoring|phase|how to execute|format|must|requirements)/i;

  for (const raw of lines) {
    const line = raw.trim();
    if (!line) continue;

    if (/^#{1,6}\s+/.test(line)) {
      inRelevantSection = relevantHeader.test(line);
      continue;
    }

    const isListItem = /^[-*]\s+/.test(line) || /^\d+\.\s+/.test(line);
    const hasDirectiveVerb = /(must|always|never|required|return|include|score|evaluate|analyze|prioritize|generate|verify|test)/i.test(line);
    if (!isListItem && !hasDirectiveVerb) continue;
    if (!inRelevantSection && !hasDirectiveVerb) continue;

    const cleaned = line
      .replace(/^[-*]\s+/, "")
      .replace(/^\d+\.\s+/, "")
      .replace(/`/g, "")
      .replace(/\*\*/g, "")
      .trim();

    if (cleaned.length < 12 || cleaned.length > 220) continue;
    requirements.push(cleaned);
    if (requirements.length >= 24) break;
  }

  return dedupeLines(requirements);
}

async function loadCommandSkillDoc(commandId?: string): Promise<CommandSkillDoc | null> {
  if (!commandId) return null;
  if (commandSkillDocCache.has(commandId)) {
    return commandSkillDocCache.get(commandId) || null;
  }

  const skillDir = COMMAND_SKILL_DIR_MAP[commandId];
  if (!skillDir) {
    commandSkillDocCache.set(commandId, null);
    return null;
  }

  const skillPath = path.resolve(
    process.cwd(),
    "..",
    "ai-marketing-claude",
    "skills",
    skillDir,
    "SKILL.md"
  );

  try {
    const markdown = await readFile(skillPath, "utf8");
    const doc: CommandSkillDoc = {
      skillPath,
      excerpt: markdown.slice(0, 9000),
      requirements: extractCommandSkillRequirements(markdown),
    };
    commandSkillDocCache.set(commandId, doc);
    return doc;
  } catch {
    commandSkillDocCache.set(commandId, null);
    return null;
  }
}

function requirementKeywords(requirement: string): string[] {
  const stop = new Set([
    "the", "and", "with", "from", "that", "this", "into", "your", "their", "for", "are", "was", "were", "have", "has", "had", "use", "using", "should", "must", "return", "include", "provide", "ensure", "when", "where", "what", "why", "how", "over", "under", "only", "each", "than", "then", "into", "out", "not"
  ]);
  return requirement
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 5 && !stop.has(token))
    .slice(0, 6);
}

function findUncoveredRequirements(requirements: string[], sections: ReportSection[]): string[] {
  if (!requirements.length) return [];
  const reportText = sections.map((s) => `${s.title}\n${s.content}`).join("\n").toLowerCase();

  return requirements.filter((req) => {
    const keys = requirementKeywords(req);
    if (!keys.length) return false;
    return !keys.some((key) => reportText.includes(key));
  });
}

function stripHtmlToText(input: string): string {
  return input
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeHtmlEntities(input: string): string {
  return input
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&nbsp;/gi, " ");
}

function extractJsonLdBlocks(html: string): string[] {
  const out: string[] = [];
  const re = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match: RegExpExecArray | null = null;
  while ((match = re.exec(html)) !== null) {
    if (match[1]) out.push(decodeHtmlEntities(match[1]).trim());
  }
  return out;
}

function collectReviewLikeStrings(node: unknown, out: string[], depth = 0): void {
  if (!node || depth > 8 || out.length >= 120) return;

  if (typeof node === "string") {
    const text = node.trim();
    if (text.length >= 8) out.push(text);
    return;
  }

  if (typeof node === "number" || typeof node === "boolean") {
    out.push(String(node));
    return;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectReviewLikeStrings(item, out, depth + 1));
    return;
  }

  if (typeof node === "object") {
    const reviewLikeKey = /(review|rating|score|headline|title|comment|body|text|author|date|count)/i;
    Object.entries(node as Record<string, unknown>).forEach(([key, value]) => {
      if (!reviewLikeKey.test(key)) return;
      collectReviewLikeStrings(value, out, depth + 1);
    });
  }
}

function extractStructuredReviewText(html: string): string {
  const lines: string[] = [];

  const jsonLdBlocks = extractJsonLdBlocks(html);
  jsonLdBlocks.forEach((block) => {
    const parsed = safeParseJson<unknown>(block);
    if (parsed) collectReviewLikeStrings(parsed, lines);
  });

  const nextDataMatch = html.match(/<script[^>]*id=["']__NEXT_DATA__["'][^>]*>([\s\S]*?)<\/script>/i);
  if (nextDataMatch?.[1]) {
    const parsed = safeParseJson<unknown>(decodeHtmlEntities(nextDataMatch[1]));
    if (parsed) collectReviewLikeStrings(parsed, lines);
  }

  return dedupeLines(lines)
    .slice(0, 80)
    .join("\n");
}

function buildScrapeText(rawBody: string): string {
  const visibleText = stripHtmlToText(rawBody);
  const structuredReviewText = extractStructuredReviewText(rawBody);

  return [
    visibleText,
    structuredReviewText ? "Structured review metadata and snippets:" : "",
    structuredReviewText,
  ]
    .filter(Boolean)
    .join("\n\n")
    .slice(0, 22000);
}

function sanitizeGeneratedText(input: unknown): string {
  let normalized = "";

  if (typeof input === "string") {
    normalized = input;
  } else if (typeof input === "number" || typeof input === "boolean") {
    normalized = String(input);
  } else if (Array.isArray(input)) {
    normalized = input
      .map((item) => (typeof item === "string" ? item : JSON.stringify(item)))
      .join(" ");
  } else if (input && typeof input === "object") {
    try {
      normalized = JSON.stringify(input);
    } catch {
      normalized = "";
    }
  }

  return normalized
    .replace(/\[\s*X\s*\]/gi, "available")
    .replace(/\[\s*Date\s*\]/gi, "latest available date")
    .replace(/\[\s*Number\s*\]/gi, "available")
    .replace(/\[\s*Value\s*\]/gi, "available")
    .replace(/\bTBD\b/gi, "to be confirmed")
    .trim();
}

async function fetchDirectPageResearch(
  targetUrl: string,
  deepMode: boolean
): Promise<PerplexityResearch> {
  const response = await fetch(targetUrl, {
    headers: {
      "User-Agent":
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
      "Accept-Language": "en-US,en;q=0.9",
    },
    redirect: "follow",
  });

  if (!response.ok) {
    throw new Error(`Direct fetch error ${response.status} for ${targetUrl}`);
  }

  const rawBody = await response.text();
  const text = buildScrapeText(rawBody);

  if (!text) {
    return {
      summary: "Direct page fetch returned no extractable content.",
      sources: [
        {
          title: `Direct source: ${getDomainFromUrl(targetUrl)}`,
          url: targetUrl,
          domain: getDomainFromUrl(targetUrl),
        },
      ],
      evidence: [],
    };
  }

  let summary = `Fetched and extracted content from ${targetUrl}.`;
  let evidence: string[] = [];

  try {
    const raw = await generateStructuredJson({
      mode: deepMode ? "deep" : "simple",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You summarize scraped web content into high-signal market evidence. Never use placeholders like [X], [Date], or TBD.",
        },
        {
          role: "user",
          content: [
            `Target URL: ${targetUrl}`,
            "Extract recurring customer pain points, praise themes, and buying frictions.",
            "If evidence is thin, state exactly what is present and what is missing.",
            "Return strict JSON with shape:",
            '{"summary":"string","evidence":["string"]}',
            "Scraped page text:",
            text,
          ].join("\n\n"),
        },
      ],
    });

    const parsed = safeParseJson<{
      summary?: string;
      evidence?: string[];
    }>(raw);

    summary = sanitizeGeneratedText(parsed?.summary?.trim() || summary);
    evidence = dedupeLines((parsed?.evidence || []).map(sanitizeGeneratedText));
  } catch {
    summary = `Fetched ${targetUrl} successfully, but synthesis failed. Raw content was captured for downstream analysis.`;
    evidence = [];
  }

  return {
    summary,
    evidence,
    sources: [
      {
        title: `Direct source: ${getDomainFromUrl(targetUrl)}`,
        url: targetUrl,
        domain: getDomainFromUrl(targetUrl),
      },
    ],
  };
}

function mergeResearchStreams(streams: PerplexityResearch[], maxSources = 20): PerplexityResearch {
  const summaries = streams.map((item) => item.summary.trim()).filter(Boolean);
  const evidence = dedupeLines(streams.flatMap((item) => item.evidence));
  const sources = streams
    .flatMap((item) => item.sources)
    .filter((src, index, arr) => arr.findIndex((s) => s.url === src.url) === index)
    .slice(0, maxSources);

  return {
    summary: summaries.length
      ? summaries.join("\n\n")
      : "No external web research stream returned usable content.",
    evidence,
    sources,
  };
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

function isValidUrlInput(value: string): boolean {
  const normalized = normalizeUrlInput(value);
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  const unwrapped = trimmed
    .replace(/^<|>$/g, "")
    .replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, "")
    .replace(/[\s\u200B\u200C\u200D\uFEFF]+$/g, "");

  if (/^https?:\/\//i.test(unwrapped)) {
    return unwrapped;
  }

  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(unwrapped)) {
    return `https://${unwrapped}`;
  }

  return unwrapped;
}

function looksLikeGreetingOrFiller(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return /^(hi|hello|hey|yo|sup|thanks|thank you|how are you|ok|okay|test)\b/.test(normalized);
}

function looksLikeGibberish(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  if (/^[a-z0-9]{7,}$/.test(normalized) && !/[aeiou]/.test(normalized)) return true;
  if (/^[a-z0-9]{10,}$/.test(normalized) && !/[\s.:/?-]/.test(normalized)) return true;
  return false;
}

function isSpecificResearchPrompt(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (looksLikeGreetingOrFiller(trimmed)) return false;
  if (looksLikeGibberish(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((w) => w.replace(/[^a-z0-9]/gi, "").length >= 3);

  if (meaningfulWords.length < 3) return false;
  if (trimmed.length < 16) return false;

  return true;
}

function validateCommandInput(command: (typeof MARKETING_COMMANDS)[number], arg: string): string | null {
  const trimmed = command.inputType === "url" ? normalizeUrlInput(arg) : arg.trim();
  if (!trimmed) {
    return `Missing ${command.inputType} for ${command.command}.`;
  }

  if (command.inputType === "url" && !isValidUrlInput(trimmed)) {
    return `Invalid URL for ${command.command}. Use a full URL like https://example.com.`;
  }

  if (command.inputType !== "url" && !isSpecificResearchPrompt(trimmed)) {
    return `Please be more specific for ${command.command}. Add clear market, audience, and problem context.`;
  }

  return null;
}

function shouldClarifyFollowUpInput(input: string): boolean {
  const trimmed = input.trim();
  if (!trimmed) return true;
  if (trimmed.length <= 2) return true;
  if (/^(hi|hello|hey|yo|sup|how are you)\b/i.test(trimmed)) return true;
  if (/^[a-z]{3,}$/i.test(trimmed) && !/[aeiou]/i.test(trimmed)) return true;
  if (/^[a-z0-9]{7,}$/i.test(trimmed) && !/[\s.:/?-]/.test(trimmed)) return true;
  return false;
}

function classifyNonCommandIntent(query: string): NonCommandIntent {
  const normalized = query.trim().toLowerCase();

  if (!normalized) return "help";
  if (CONVERSATIONAL_PATTERNS.some((pattern) => pattern.test(normalized))) {
    if (/\b(thanks|thank you|thx)\b/i.test(normalized)) return "gratitude";
    if (/^(hi|hello|hey|yo|sup)\b/i.test(normalized)) return "greeting";
    return "help";
  }

  if (BRIEF_HELP_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "help";
  }

  if (RESEARCH_INTENT_PATTERNS.some((pattern) => pattern.test(normalized))) {
    return "research-request";
  }

  return "general";
}

function buildAssistantSections(query: string): { overview: string; sections: ReportSection[] } {
  const intent = classifyNonCommandIntent(query);

  const responseByIntent: Record<NonCommandIntent, string> = {
    greeting:
      "Hi. Use /market for source-backed research.",
    gratitude:
      "You are welcome. Share your goal and I will suggest the right command.",
    help:
      "Assistant mode gives quick guidance. Use /market for research outputs.",
    "research-request":
      "I can not run web research from plain chat. Use /market to run full analysis with sources.",
    general:
      "I can help you choose the right command. Use /market for factual, sourced output.",
  };

  const overview = "";

  const sections: ReportSection[] = [
    {
      title: "Brief Assistant",
      content: responseByIntent[intent],
    },
    {
      title: "How To Use",
      content: [
        "1. Pick a command.",
        "2. Add input (url, topic, client, or product).",
        "3. Run: /market <command> <input>.",
        "4. Ask follow-ups to refine output.",
      ].join("\n"),
    },
  ];

  return { overview, sections };
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

  if (commandId === "scrape") {
    return [
      {
        id: "voice",
        title: "Voice-of-Customer Agent",
        systemPrompt: "You extract direct customer sentiment and pain language from evidence.",
        focus: "Cluster repeated complaints, praise themes, and urgency indicators.",
      },
      {
        id: "market",
        title: "Market Signal Agent",
        systemPrompt: "You connect scraped signals to broader market demand and positioning.",
        focus: "Identify what the scraped evidence implies about demand, switching triggers, and market pull.",
      },
      {
        id: "actions",
        title: "Action Prioritization Agent",
        systemPrompt: "You convert findings into concrete product and go-to-market actions.",
        focus: "Prioritize execution moves by impact, confidence, and speed to implement.",
      },
    ];
  }

  if (commandId === "deepresearch") {
    return [
      {
        id: "signals",
        title: "Signal Triage Agent",
        systemPrompt: "You identify high-signal market changes and remove low-value noise.",
        focus: "Prioritize meaningful shifts, demand changes, and competitor-relevant events.",
      },
      {
        id: "factcheck",
        title: "Fact-Check Agent",
        systemPrompt: "You verify critical claims and detect contradictions across sources.",
        focus: "Classify findings as verified, probable, or uncertain with explicit confidence rationale.",
      },
      {
        id: "implications",
        title: "Strategic Implications Agent",
        systemPrompt: "You convert verified market signals into business implications.",
        focus: "Explain why changes matter now for positioning, pricing, GTM, and risk exposure.",
      },
      {
        id: "actions",
        title: "Operator Action Agent",
        systemPrompt: "You produce practical execution steps for teams.",
        focus: "Return concrete actions ranked by impact, speed, confidence, and dependency risk.",
      },
    ];
  }

  return common;
}

async function fetchPerplexityResearch(
  prompt: string,
  deepMode: boolean,
  options?: {
    minSources?: number;
    maxSources?: number;
    enforceSourceMix?: boolean;
  }
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
  const minSources = options?.minSources ?? (deepMode ? 12 : 6);
  const maxSources = options?.maxSources ?? (deepMode ? 20 : 12);
  const user = [
    `Research prompt: ${prompt}`,
    deepMode
      ? "Depth: deep strategic and tactical research for market command execution."
      : "Depth: concise research summary for normal query.",
    "Return strict JSON with shape:",
    '{"summary":"string","sources":[{"title":"string","url":"https://..."}],"evidence":["bullet evidence with source context"]}',
    `Include ${minSources}-${maxSources} sources when available. Prioritize unique, high-signal sources.`,
    options?.enforceSourceMix
      ? "Source mix requirement: include major news, journals/reports, newsletters/operator analysis, and social/community signals where available."
      : "",
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

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Perplexity error ${response.status}: ${bodyText}`);
  }

  let payload: any;
  try {
    payload = JSON.parse(bodyText) as {
      citations?: string[];
      choices?: Array<{ message?: { content?: string } }>;
    };
  } catch (err) {
    throw new Error(`Perplexity returned non-JSON response: ${bodyText.slice(0,1000)}`);
  }

  const rawContent = payload.choices?.[0]?.message?.content?.trim() || "";

  const parsed = safeParseJson<{
    summary?: string;
    sources?: Array<{ title?: string; url?: string }>;
    evidence?: string[];
  }>(rawContent);

  const parsedSources = (parsed?.sources || [])
    .filter((s) => s.url)
    .slice(0, maxSources)
    .map((s) => ({
      title: s.title?.trim() || s.url || "Untitled source",
      url: s.url || "",
      domain: getDomainFromUrl(s.url || ""),
    }))
    .filter((s) => !!s.url);

  const citationSources = (payload.citations || [])
    .slice(0, maxSources)
    .map((url) => ({
      title: getDomainFromUrl(url),
      url,
      domain: getDomainFromUrl(url),
    }));

  const mergedSources: Source[] = [...parsedSources, ...citationSources]
    .filter((src, index, arr) => arr.findIndex((s) => s.url === src.url) === index)
    .slice(0, maxSources);

  return {
    summary: parsed?.summary || rawContent || "No summary returned.",
    evidence: parsed?.evidence || [],
    sources: mergedSources,
  };
}

async function fetchBrightDataResearch(
  targetUrl: string,
  deepMode: boolean
): Promise<PerplexityResearch> {
  const token = process.env.BRIGHTDATA_API_TOKEN;
  const zone = process.env.BRIGHTDATA_WEB_UNLOCKER_ZONE;

  if (!token || !zone) {
    return fetchDirectPageResearch(targetUrl, deepMode);
  }

  const response = await fetch("https://api.brightdata.com/request", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      zone,
      url: targetUrl,
      format: "raw",
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Bright Data error ${response.status}: ${body}`);
  }

  const payload = (await response.json()) as {
    body?: string;
  };

  const rawBody = typeof payload.body === "string" ? payload.body : "";
  const text = buildScrapeText(rawBody);

  if (!text) {
    return {
      summary: "Bright Data returned an empty page body for the target URL.",
      sources: [
        {
          title: `Scraped source: ${getDomainFromUrl(targetUrl)}`,
          url: targetUrl,
          domain: getDomainFromUrl(targetUrl),
        },
      ],
      evidence: [],
    };
  }

  let summary = `Scraped and extracted content from ${targetUrl}.`;
  let evidence: string[] = [];

  try {
    const raw = await generateStructuredJson({
      mode: deepMode ? "deep" : "simple",
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You summarize scraped web content into high-signal market evidence. Never use placeholders like [X], [Date], or TBD.",
        },
        {
          role: "user",
          content: [
            `Target URL: ${targetUrl}`,
            "Extract recurring customer pain points, praise themes, and buying frictions.",
            "If evidence is thin, state exactly what is present and what is missing.",
            "Return strict JSON with shape:",
            '{"summary":"string","evidence":["string"]}',
            "Scraped page text:",
            text,
          ].join("\n\n"),
        },
      ],
    });

    const parsed = safeParseJson<{
      summary?: string;
      evidence?: string[];
    }>(raw);

    summary = sanitizeGeneratedText(parsed?.summary?.trim() || summary);
    evidence = dedupeLines((parsed?.evidence || []).map(sanitizeGeneratedText));
  } catch {
    // Fall back to a deterministic summary when model synthesis fails.
    summary = `Scraped ${targetUrl} successfully, but model synthesis failed. Raw content was captured for downstream analysis.`;
    evidence = [];
  }

  return {
    summary: sanitizeGeneratedText(summary),
    evidence,
    sources: [
      {
        title: `Scraped source: ${getDomainFromUrl(targetUrl)}`,
        url: targetUrl,
        domain: getDomainFromUrl(targetUrl),
      },
    ],
  };
}

async function runSubagent(
  spec: SubagentSpec,
  mode: "simple" | "deep",
  commandContext: string,
  webResearch: PerplexityResearch,
  globalPreflight: string[],
  globalPostflight: string[],
  commandSkill: CommandSkillBlock | null,
  commandSkillDoc: CommandSkillDoc | null
): Promise<SubagentOutput> {
  const userPrompt = [
    `Agent: ${spec.title}`,
    `Focus: ${spec.focus}`,
    commandContext,
    "Global preflight rules:",
    formatSkillList(globalPreflight),
    commandSkill ? "Command-specific preflight rules:" : "",
    commandSkill ? formatSkillList(commandSkill.pre) : "",
    commandSkillDoc ? "Authoritative command skill requirements (must follow):" : "",
    commandSkillDoc ? formatSkillList(commandSkillDoc.requirements) : "",
    commandSkillDoc ? "Command skill excerpt:" : "",
    commandSkillDoc ? commandSkillDoc.excerpt : "",
    "Web research summary:",
    webResearch.summary,
    "Evidence bullets:",
    webResearch.evidence.map((item, idx) => `${idx + 1}. ${item}`).join("\n") || "No evidence provided.",
    "Global postflight rules:",
    formatSkillList(globalPostflight),
    commandSkill ? formatSkillList(commandSkill.post) : "",
    "Return strict JSON with shape:",
    '{"findings":[""],"opportunities":[""],"risks":[""],"metrics":[""],"confidence":0}',
    "Never use placeholders like [X], [Date], [Number], or TBD.",
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
    findings: dedupeLines((parsed?.findings || []).map(sanitizeGeneratedText)),
    opportunities: dedupeLines((parsed?.opportunities || []).map(sanitizeGeneratedText)),
    risks: dedupeLines((parsed?.risks || []).map(sanitizeGeneratedText)),
    metrics: dedupeLines((parsed?.metrics || []).map(sanitizeGeneratedText)),
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
  commandId: string | undefined,
  webResearch: PerplexityResearch,
  merged: MergedInsights,
  outputs: SubagentOutput[],
  commandSkill: CommandSkillBlock | null,
  commandSkillDoc: CommandSkillDoc | null,
  visualReferences: VisualReference[]
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
          commandSkillDoc ? "Authoritative command skill requirements (must explicitly cover):" : "",
          commandSkillDoc ? formatSkillList(commandSkillDoc.requirements) : "",
          commandSkillDoc ? `Skill Source: ${commandSkillDoc.skillPath}` : "",
          commandSkillDoc ? "Command skill excerpt:" : "",
          commandSkillDoc ? commandSkillDoc.excerpt : "",
          mode === "deep"
            ? "Deep quality bar: produce a premium long-form report (target roughly 2500-4500 words, ~5-10 pages equivalent), with dense operator insights and explicit evidence references."
            : "",
          mode === "deep"
            ? `Deep source bar: use the provided source set heavily and ensure final report is compatible with ${DEEP_RESEARCH_MIN_SOURCES}-${DEEP_RESEARCH_MAX_SOURCES} source coverage when available.`
            : "",
          visualReferences.length
            ? "Visual references from cited sources (you may embed markdown image links and source URLs where relevant):"
            : "",
          visualReferences.length
            ? visualReferences
                .map(
                  (item, idx) =>
                    `${idx + 1}. ${item.sourceTitle} | Source: ${item.sourceUrl} | Image: ${item.imageUrl}`
                )
                .join("\n")
            : "",
          "Return strict JSON with shape:",
          '{"overview":"string","whatMattersToday":["string"],"marketThesis":"string","executiveBriefing":[{"insight":"string","whyItMatters":"string","recommendedAction":"string"}],"signalStrength":{"highConfidence":["string"],"mediumConfidence":["string"],"lowConfidence":["string"]},"opportunityMap":[{"name":"string","marketPull":"string","competition":"string","speedToBuild":"string","priority":"string"}],"deepDiveSources":{"Strategic Reports":[{"title":"string","url":"string","domain":"string"}]},"sources":[{"title":"string","url":"string","domain":"string"}] }',
          "Never use placeholders like [X], [Date], [Number], or TBD.",
          "If evidence is thin for a required point, include it with a clear limitation note.",
        ].join("\n\n"),
      },
    ],
  });

  const parsed = safeParseJson<{
    overview?: string;
    sections?: Array<{ title?: string; content?: string }>;
    whatMattersToday?: string[];
    marketThesis?: string;
    executiveBriefing?: Array<{ insight?: string; whyItMatters?: string; recommendedAction?: string }>;
    signalStrength?: {
      highConfidence?: string[];
      mediumConfidence?: string[];
      lowConfidence?: string[];
    };
    opportunityMap?: Array<{
      name?: string;
      marketPull?: string;
      competition?: string;
      speedToBuild?: string;
      priority?: string;
    }>;
    deepDiveSources?: Record<string, Array<{ title?: string; url?: string; domain?: string }>>;
    sources?: Array<{ title?: string; url?: string; domain?: string }>;
  }>(raw);

  let sections: ReportSection[] = [];

  if (parsed?.whatMattersToday && parsed.whatMattersToday.length) {
    sections.push({
      title: "WHAT MATTERS TODAY",
      content: parsed.whatMattersToday.map((b) => `- ${sanitizeGeneratedText(b)}`).join("\n"),
    });
  }

  if (parsed?.marketThesis) {
    sections.push({ title: "MARKET THESIS", content: sanitizeGeneratedText(parsed.marketThesis) });
  }

  if (parsed?.executiveBriefing && parsed.executiveBriefing.length) {
    sections.push({
      title: "EXECUTIVE BRIEFING",
      content: parsed.executiveBriefing
        .slice(0, 4)
        .map((item, idx) =>
          [`${idx + 1}. Insight: ${sanitizeGeneratedText(item.insight || "")}`,
          `   Why It Matters: ${sanitizeGeneratedText(item.whyItMatters || "")}`,
          `   Recommended Action: ${sanitizeGeneratedText(item.recommendedAction || "")}`].join("\n")
        )
        .join("\n\n"),
    });
  }

  if (parsed?.signalStrength) {
    const high = (parsed.signalStrength.highConfidence || []).map((s) => `- ${sanitizeGeneratedText(s)}`).join("\n");
    const med = (parsed.signalStrength.mediumConfidence || []).map((s) => `- ${sanitizeGeneratedText(s)}`).join("\n");
    const low = (parsed.signalStrength.lowConfidence || []).map((s) => `- ${sanitizeGeneratedText(s)}`).join("\n");

    sections.push({
      title: "SIGNAL STRENGTH",
      content: [`**High Confidence (Act Now)**`, high || "- None", "", `**Medium Confidence (Monitor)**`, med || "- None", "", `**Low Confidence (Ignore / Speculative)**`, low || "- None"].join("\n\n"),
    });
  }

  if (parsed?.opportunityMap && parsed.opportunityMap.length) {
    sections.push({
      title: "OPPORTUNITY MAP",
      content: parsed.opportunityMap
        .map((opp, idx) =>
          `${idx + 1}. ${sanitizeGeneratedText(opp.name || 'Opportunity')}
Market Pull: ${sanitizeGeneratedText(opp.marketPull || '')}
Competition: ${sanitizeGeneratedText(opp.competition || '')}
Speed to Build: ${sanitizeGeneratedText(opp.speedToBuild || '')}
Priority: ${sanitizeGeneratedText(opp.priority || '')}`
        )
        .join("\n\n"),
    });
  }

  if (parsed?.deepDiveSources && Object.keys(parsed.deepDiveSources).length) {
    const groups = Object.entries(parsed.deepDiveSources)
      .map(([cat, items]) =>
        `### ${cat}\n\n` +
        (items || [])
          .map((it) => `- [${sanitizeGeneratedText(it.title || it.url || '')}](${sanitizeGeneratedText(it.url || '')}) (${sanitizeGeneratedText(it.domain || '')})`)
          .join("\n")
      )
      .join("\n\n");

    sections.push({ title: "DEEP DIVE SOURCES", content: groups });
  }

  if (parsed?.sources && parsed.sources.length) {
    sections.push({
      title: "SOURCES",
      content: parsed.sources.map((s) => `- [${sanitizeGeneratedText(s.title || s.url || '')}](${sanitizeGeneratedText(s.url || '')}) (${sanitizeGeneratedText(s.domain || '')})`).join("\n"),
    });
  }

  // Fallback: if model returned legacy sections, preserve them
  if (sections.length === 0 && parsed?.sections) {
    sections = (parsed.sections || [])
      .filter((section) => section?.title && section?.content)
      .map((section) => ({
        title: sanitizeGeneratedText(section.title || "Section"),
        content: sanitizeGeneratedText(section.content || ""),
      }));
  }

  const unmetRequirements = commandSkillDoc
    ? findUncoveredRequirements(commandSkillDoc.requirements, sections)
    : [];

  if (commandSkillDoc && unmetRequirements.length > 0) {
    const refinementRaw = await generateStructuredJson({
      mode,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You are a strict report quality gate. Rewrite the report to cover all unmet required items while staying factual and source-grounded.",
        },
        {
          role: "user",
          content: [
            `Original user query: ${query}`,
            "Current report draft:",
            JSON.stringify({ overview: parsed?.overview || "", sections }),
            "Unmet required items that must be explicitly addressed:",
            formatSkillList(unmetRequirements),
            "Return strict JSON with shape:",
            '{"overview":"string","whatMattersToday":["string"],"marketThesis":"string","executiveBriefing":[{"insight":"string","whyItMatters":"string","recommendedAction":"string"}],"signalStrength":{"highConfidence":["string"],"mediumConfidence":["string"],"lowConfidence":["string"]},"opportunityMap":[{"name":"string","marketPull":"string","competition":"string","speedToBuild":"string","priority":"string"}],"deepDiveSources":{"Strategic Reports":[{"title":"string","url":"string","domain":"string"}]},"sources":[{"title":"string","url":"string","domain":"string"}] }'
          ].join("\n\n"),
        },
      ],
    });

    const refined = safeParseJson<{
      sections?: Array<{ title?: string; content?: string }>;
    }>(refinementRaw);

    const refinedSections = (refined?.sections || [])
      .filter((section) => section?.title && section?.content)
      .map((section) => ({
        title: sanitizeGeneratedText(section.title || "Section"),
        content: sanitizeGeneratedText(section.content || ""),
      }));

    if (refinedSections.length) {
      sections = refinedSections;
    }
  }

  const shouldEnforcePremiumDeep = mode === "deep" && commandId === "deepresearch";
  const deepIssues = shouldEnforcePremiumDeep
    ? buildDeepReportIssues(parsed?.overview || "", sections)
    : [];

  if (shouldEnforcePremiumDeep && deepIssues.length > 0) {
    const deepRefineRaw = await generateStructuredJson({
      mode,
      temperature: 0.18,
      messages: [
        {
          role: "system",
          content:
            "You are a premium research editor. Rewrite into a subscription-grade deep report with strong structure, non-duplicative sections, and fully populated signal classification.",
        },
        {
          role: "user",
          content: [
            `Original query: ${query}`,
            "Current draft:",
            JSON.stringify({ overview: parsed?.overview || "", sections }),
            "Issues to fix:",
            formatSkillList(deepIssues),
            "Web research summary:",
            webResearch.summary,
            "Web evidence bullets:",
            webResearch.evidence.slice(0, 80).map((item, idx) => `${idx + 1}. ${item}`).join("\n"),
            "Sources to cite explicitly:",
            webResearch.sources
              .slice(0, DEEP_RESEARCH_MAX_SOURCES)
              .map((source, idx) => `${idx + 1}. ${source.title} | ${source.url}`)
              .join("\n"),
            "Return strict JSON with shape:",
            '{"overview":"string","whatMattersToday":["string"],"marketThesis":"string","executiveBriefing":[{"insight":"string","whyItMatters":"string","recommendedAction":"string"}],"signalStrength":{"highConfidence":["string"],"mediumConfidence":["string"],"lowConfidence":["string"]},"opportunityMap":[{"name":"string","marketPull":"string","competition":"string","speedToBuild":"string","priority":"string"}],"deepDiveSources":{"Strategic Reports":[{"title":"string","url":"string","domain":"string"}]},"sources":[{"title":"string","url":"string","domain":"string"}] }',
            "Do not leave empty table cells in Fact-Checked Signal Table.",
          ].join("\n\n"),
        },
      ],
    });

    const deepRefined = safeParseJson<{
      sections?: Array<{ title?: string; content?: string }>;
      overview?: string;
    }>(deepRefineRaw);

    const deepRefinedSections = (deepRefined?.sections || [])
      .filter((section) => section?.title && section?.content)
      .map((section) => ({
        title: sanitizeGeneratedText(section.title || "Section"),
        content: sanitizeGeneratedText(section.content || ""),
      }));

    if (deepRefinedSections.length) {
      sections = deepRefinedSections;
    }
  }

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

  const finalSections = sections.length ? sections : fallback;
  const hasVisualSection = finalSections.some((section) => /visual/i.test(section.title));

  if (mode === "deep" && visualReferences.length > 0 && !hasVisualSection) {
    finalSections.push({
      title: "Visual Evidence References",
      content: visualReferences
        .map(
          (item, idx) =>
            `${idx + 1}. ${item.sourceTitle} (${item.domain})\nSource: ${item.sourceUrl}\nImage: ${item.imageUrl}\nPreview: ![${item.domain}](${item.imageUrl})`
        )
        .join("\n\n"),
    });
  }

  return {
    overview:
      sanitizeGeneratedText(parsed?.overview ||
      (mode === "deep"
        ? "Deep market research synthesis completed through parallel specialist agents."
        : "Market research synthesis completed through concise specialist analysis.")),
    sections: finalSections,
  };
}

export async function runResearchPipeline({
  query,
  commandId,
  commandArg,
  responseDepth,
}: RunResearchInput): Promise<RunResearchResult> {
  const command = commandId
    ? MARKETING_COMMANDS.find((item) => item.id === commandId)
    : null;

  if (!command) {
    const conversational = buildAssistantSections(query);
    const report: Report = {
      id: crypto.randomUUID(),
      query,
      overview: conversational.overview,
      sections: conversational.sections,
      sources: [],
      createdAt: new Date(),
    };

    const artifacts = buildReportArtifacts(report, [], undefined, undefined);

    return {
      report,
      scores: [],
      overallScore: undefined,
      grade: undefined,
      orchestration: {
        mode: "simple",
        commandId: undefined,
        subagents: [],
        merged: {
          findings: [],
          opportunities: [],
          risks: [],
          metrics: [],
          averageConfidence: 100,
        },
      },
      artifacts,
    };
  }

  const resolvedArg = commandArg || query;
  const commandValidationError = validateCommandInput(command, resolvedArg);
  if (commandValidationError) {
    const report: Report = {
      id: crypto.randomUUID(),
      query: `${command.command} ${resolvedArg}`,
      overview: "",
      sections: [
        {
          title: "Brief Assistant",
          content: commandValidationError,
        },
        {
          title: "How To Use",
          content: `Run ${command.command} with a valid ${command.inputType}.`,
        },
      ],
      sources: [],
      createdAt: new Date(),
    };

    const artifacts = buildReportArtifacts(report, [], undefined, undefined);

    return {
      report,
      scores: [],
      overallScore: undefined,
      grade: undefined,
      orchestration: {
        mode: "simple",
        commandId: command.id,
        subagents: [],
        merged: {
          findings: [],
          opportunities: [],
          risks: [],
          metrics: [],
          averageConfidence: 100,
        },
      },
      artifacts,
    };
  }

  const mode: "simple" | "deep" = responseDepth === "simple" ? "simple" : "deep";
  const effectiveArg = command.inputType === "url"
    ? normalizeUrlInput(resolvedArg)
    : resolvedArg.trim();
  const commandSkill = getCommandSkill(command?.id);
  const commandSkillDoc = await loadCommandSkillDoc(command?.id);
  const isCommandFollowUp =
    Boolean(command) && query.trim().length > 0 && query.trim() !== effectiveArg.trim();

  if (command && isCommandFollowUp && shouldClarifyFollowUpInput(query)) {
    const report: Report = {
      id: crypto.randomUUID(),
      query: `${command.command} ${effectiveArg}`,
      overview: "",
      sections: [
        {
          title: "Brief Assistant",
          content:
            "I did not fully understand your follow-up. Do you want to refine the last output, run a new command, or switch target input?",
        },
        {
          title: "How To Use",
          content: [
            "1. Refine current result: ask specific edits (for example, shorten section 2).",
            `2. Run new command: ${command.command} <${command.inputType}>.`,
            "3. Switch target: provide a new valid input for the command.",
          ].join("\n"),
        },
      ],
      sources: [],
      createdAt: new Date(),
    };

    const artifacts = buildReportArtifacts(report, [], undefined, undefined);

    return {
      report,
      scores: [],
      overallScore: undefined,
      grade: undefined,
      orchestration: {
        mode: "simple",
        commandId: command.id,
        subagents: [],
        merged: {
          findings: [],
          opportunities: [],
          risks: [],
          metrics: [],
          averageConfidence: 100,
        },
      },
      artifacts,
    };
  }

  if (command?.id === "fullmarketing") {
    const fullResult = await runFullMarketingAgent(effectiveArg);
    return fullResult as unknown as RunResearchResult;
  }

  const commandContext = command
    ? [
        `Command ID: ${command.id}`,
        `Command Label: ${command.label}`,
        `Command Description: ${command.description}`,
        `Command Phases: ${command.phases.join(" | ")}`,
        isCommandFollowUp ? `Follow-up Request: ${query}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : "No command mode. Use concise direct market research synthesis.";

  const researchPrompt = command
    ? [
        `${command.command} ${effectiveArg}`,
        isCommandFollowUp ? `Follow-up refinement request: ${query}` : "",
      ]
        .filter(Boolean)
        .join("\n")
    : query;

  let webResearch: PerplexityResearch;

  if (command.id === "scrape") {
    const settled = await Promise.allSettled([
      fetchBrightDataResearch(effectiveArg, mode === "deep"),
      fetchPerplexityResearch(researchPrompt, mode === "deep"),
    ]);

    const streams = settled
      .filter((result): result is PromiseFulfilledResult<PerplexityResearch> => result.status === "fulfilled")
      .map((result) => result.value);

    if (!streams.length) {
      webResearch = {
        summary: "All web research streams failed for this scrape command.",
        sources: [],
        evidence: [],
      };
    } else {
      webResearch = mergeResearchStreams(streams);
    }
  } else if (command.id === "deepresearch" && mode === "deep") {
    const deepPrompts = buildDeepResearchPromptVariants(researchPrompt, effectiveArg);

    const settled = await Promise.allSettled(
      deepPrompts.map((variantPrompt) =>
        fetchPerplexityResearch(variantPrompt, true, {
          minSources: 10,
          maxSources: 18,
          enforceSourceMix: true,
        })
      )
    );

    const streams = settled
      .filter((result): result is PromiseFulfilledResult<PerplexityResearch> => result.status === "fulfilled")
      .map((result) => result.value);

    if (!streams.length) {
      webResearch = await fetchPerplexityResearch(researchPrompt, true, {
        minSources: DEEP_RESEARCH_MIN_SOURCES,
        maxSources: DEEP_RESEARCH_MAX_SOURCES,
        enforceSourceMix: true,
      });
    } else {
      webResearch = mergeResearchStreams(streams, DEEP_RESEARCH_MAX_SOURCES);
    }

    if (webResearch.sources.length < DEEP_RESEARCH_MIN_SOURCES) {
      const fallbackExpansion = await fetchPerplexityResearch(
        `${researchPrompt}\n\nNeed additional unique sources to reach high-confidence coverage. Prioritize journals, major news, newsletters, and social/community evidence with links.`,
        true,
        {
          minSources: DEEP_RESEARCH_MIN_SOURCES,
          maxSources: DEEP_RESEARCH_MAX_SOURCES,
          enforceSourceMix: true,
        }
      );

      webResearch = mergeResearchStreams([webResearch, fallbackExpansion], DEEP_RESEARCH_MAX_SOURCES);
    }
  } else {
    webResearch = await fetchPerplexityResearch(researchPrompt, mode === "deep");
  }

  const visualReferences =
    command.id === "deepresearch" && mode === "deep"
      ? await fetchVisualReferences(webResearch.sources, DEEP_RESEARCH_VISUAL_LIMIT)
      : [];

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
        commandSkill,
        commandSkillDoc
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
    command
      ? [
          `${command.command} ${effectiveArg}`,
          isCommandFollowUp ? `Follow-up refinement request: ${query}` : "",
        ]
          .filter(Boolean)
          .join("\n")
      : query,
    commandContext,
    command?.id,
    webResearch,
    merged,
    successfulOutputs,
    commandSkill,
    commandSkillDoc,
    visualReferences
  );

  const scores = command?.id === "audit" ? buildAuditScoresFromSubagents(successfulOutputs) : [];
  const overallScore =
    scores.length > 0
      ? Math.round(scores.reduce((acc, item) => acc + item.score * (item.weight / 100), 0))
      : undefined;

  const report: Report = {
    id: crypto.randomUUID(),
    query: command
      ? buildReportQueryTitle(command.id, effectiveArg, `${command.command} ${effectiveArg}`)
      : query,
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
