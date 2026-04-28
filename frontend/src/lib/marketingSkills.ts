export interface MarketingCommand {
  id: string;
  command: string;
  label: string;
  description: string;
  inputType: "url" | "topic" | "client" | "product";
  placeholder: string;
  category: "analysis" | "content" | "strategy" | "reporting";
  icon: string;
  outputFile: string;
  /** Phases the research flow shows while processing */
  phases: string[];
}

export const MARKETING_COMMANDS: MarketingCommand[] = [
  {
    id: "audit",
    command: "/market audit",
    label: "Full Marketing Audit",
    description: "Full marketing audit with 5 parallel agents — scores content, conversion, SEO, competitive positioning, brand & trust, growth.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "analysis",
    icon: "📊",
    outputFile: "MARKETING-AUDIT.md",
    phases: ["Fetching website content", "Analyzing content & messaging", "Evaluating conversion optimization", "Auditing SEO & discoverability", "Assessing competitive positioning", "Reviewing brand & trust signals", "Scoring growth & strategy", "Compiling final report"],
  },
  {
    id: "quick",
    command: "/market quick",
    label: "Quick Snapshot",
    description: "60-second marketing snapshot — headline clarity, CTA strength, trust signals, top 3 wins & fixes.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "analysis",
    icon: "⚡",
    outputFile: "",
    phases: ["Fetching homepage", "Evaluating key signals", "Generating snapshot"],
  },
  {
    id: "deepresearch",
    command: "/market deep",
    label: "Deep Research Brief",
    description: "Fact-checked deep market briefing for a niche (tech, AI, sports, etc.) with verified signals, trend shifts, and operator actions.",
    inputType: "topic",
    placeholder: "AI developer tools",
    category: "analysis",
    icon: "🧠",
    outputFile: "DEEP-MARKET-BRIEF.md",
    phases: ["Scoping market niche", "Gathering cross-source evidence", "Fact-checking critical claims", "Synthesizing strategic shifts", "Producing operator-grade brief"],
  },
  {
    id: "scrape",
    command: "/market scrape",
    label: "Market Scrape",
    description: "Live web scraping scan for customer signals — extracts complaints, praise themes, and evidence from target pages.",
    inputType: "url",
    placeholder: "https://example.com/reviews",
    category: "analysis",
    icon: "🕸️",
    outputFile: "SIGNAL-SCRAPE.md",
    phases: ["Unlocking page with Bright Data", "Extracting customer signals", "Merging with live web intelligence", "Building source-backed insights"],
  },
  {
    id: "copy",
    command: "/market copy",
    label: "Copy Analysis",
    description: "Analyze existing copy, score it, and generate optimized alternatives with before/after examples.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "content",
    icon: "✍️",
    outputFile: "COPY-SUGGESTIONS.md",
    phases: ["Fetching page content", "Analyzing headlines & CTAs", "Scoring copy quality", "Generating optimized alternatives"],
  },
  {
    id: "emails",
    command: "/market emails",
    label: "Email Sequences",
    description: "Generate complete email sequences — welcome, nurture, launch, cart abandonment, cold outreach.",
    inputType: "topic",
    placeholder: "SaaS onboarding for project management tool",
    category: "content",
    icon: "📧",
    outputFile: "EMAIL-SEQUENCES.md",
    phases: ["Analyzing business context", "Selecting sequence types", "Writing email copy", "Adding subject lines & timing"],
  },
  {
    id: "social",
    command: "/market social",
    label: "Social Media Calendar",
    description: "30-day social media content calendar with hooks, hashtags, and content repurposing strategy.",
    inputType: "topic",
    placeholder: "AI productivity tools for remote teams",
    category: "content",
    icon: "📱",
    outputFile: "SOCIAL-CALENDAR.md",
    phases: ["Discovering brand context", "Defining content pillars", "Generating 30-day calendar", "Adding hashtags & hooks"],
  },
  {
    id: "ads",
    command: "/market ads",
    label: "Ad Campaigns",
    description: "Ad creative and copy for Google, Meta, LinkedIn, TikTok — with targeting, budgets, and retargeting sequences.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "content",
    icon: "📢",
    outputFile: "AD-CAMPAIGNS.md",
    phases: ["Analyzing business & audience", "Generating Google Ads copy", "Creating Meta ad variations", "Building retargeting sequences"],
  },
  {
    id: "funnel",
    command: "/market funnel",
    label: "Funnel Analysis",
    description: "Map the complete conversion path, identify drop-off points, and recommend optimizations with revenue impact.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "analysis",
    icon: "🔄",
    outputFile: "FUNNEL-ANALYSIS.md",
    phases: ["Mapping funnel steps", "Analyzing page-by-page", "Calculating conversion metrics", "Prioritizing optimizations"],
  },
  {
    id: "competitors",
    command: "/market competitors",
    label: "Competitor Intelligence",
    description: "Competitive intelligence report — pricing, features, SWOT, content gaps, and steal-worthy tactics.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "strategy",
    icon: "🏆",
    outputFile: "COMPETITOR-REPORT.md",
    phases: ["Identifying competitors", "Analyzing messaging & pricing", "Building feature matrix", "Generating SWOT & recommendations"],
  },
  {
    id: "landing",
    command: "/market landing",
    label: "Landing Page CRO",
    description: "Landing page conversion rate optimization — scoring, friction analysis, and specific fixes.",
    inputType: "url",
    placeholder: "https://example.com/pricing",
    category: "analysis",
    icon: "🎯",
    outputFile: "LANDING-CRO.md",
    phases: ["Fetching landing page", "Scoring conversion elements", "Identifying friction points", "Generating CRO recommendations"],
  },
  {
    id: "launch",
    command: "/market launch",
    label: "Launch Playbook",
    description: "Complete product launch playbook — pre-launch, launch day, and post-launch strategies.",
    inputType: "product",
    placeholder: "AI-powered CRM for small businesses",
    category: "strategy",
    icon: "🚀",
    outputFile: "LAUNCH-PLAYBOOK.md",
    phases: ["Analyzing product context", "Building pre-launch plan", "Creating launch day strategy", "Designing post-launch growth plan"],
  },
  {
    id: "proposal",
    command: "/market proposal",
    label: "Client Proposal",
    description: "Generate a client-ready marketing proposal with findings, scope, pricing, and timeline.",
    inputType: "client",
    placeholder: "Acme Corp — e-commerce redesign",
    category: "reporting",
    icon: "📋",
    outputFile: "CLIENT-PROPOSAL.md",
    phases: ["Gathering client context", "Outlining scope & deliverables", "Drafting proposal copy", "Adding pricing & timeline"],
  },
  {
    id: "report",
    command: "/market report",
    label: "Marketing Report",
    description: "Full marketing report combining all available analysis into a client-ready document.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "reporting",
    icon: "📑",
    outputFile: "MARKETING-REPORT.md",
    phases: ["Compiling analysis data", "Writing executive summary", "Formatting sections", "Finalizing report"],
  },
  {
    id: "seo",
    command: "/market seo",
    label: "SEO Content Audit",
    description: "SEO content audit — on-page SEO, technical SEO, content structure, and keyword opportunities.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "analysis",
    icon: "🔍",
    outputFile: "SEO-AUDIT.md",
    phases: ["Fetching site content", "Analyzing on-page SEO", "Checking technical SEO", "Identifying keyword opportunities"],
  },
  {
    id: "brand",
    command: "/market brand",
    label: "Brand Voice Analysis",
    description: "Brand voice analysis and guidelines — tone, messaging, visual identity, and consistency.",
    inputType: "url",
    placeholder: "https://example.com",
    category: "strategy",
    icon: "🎨",
    outputFile: "BRAND-VOICE.md",
    phases: ["Analyzing brand presence", "Profiling voice & tone", "Assessing visual identity", "Generating brand guidelines"],
  },
  {
    id: "sizing",
    command: "/market sizing",
    label: "Market Sizing (TAM/SAM/SOM)",
    description: "Estimate TAM/SAM/SOM, growth rates, assumptions, and scenario sensitivity for a target market.",
    inputType: "topic",
    placeholder: "AI accounting software for SMBs in North America",
    category: "analysis",
    icon: "📐",
    outputFile: "MARKET-SIZING.md",
    phases: ["Defining market scope", "Collecting benchmark data", "Estimating TAM/SAM/SOM", "Stress-testing assumptions", "Producing sizing summary"],
  },
  {
    id: "segments",
    command: "/market segments",
    label: "Customer Segmentation",
    description: "Identify key market segments, purchase drivers, willingness-to-pay ranges, and segment attractiveness.",
    inputType: "topic",
    placeholder: "Cybersecurity tools for remote-first startups",
    category: "analysis",
    icon: "🧩",
    outputFile: "MARKET-SEGMENTS.md",
    phases: ["Collecting audience signals", "Clustering segments", "Mapping jobs-to-be-done", "Scoring segment attractiveness", "Generating segment playbook"],
  },
  {
    id: "demand",
    command: "/market demand",
    label: "Demand Validation",
    description: "Validate demand using search trends, community signals, job posts, and buyer-intent indicators.",
    inputType: "topic",
    placeholder: "AI voice agents for insurance claims",
    category: "analysis",
    icon: "📈",
    outputFile: "DEMAND-VALIDATION.md",
    phases: ["Gathering intent signals", "Measuring trend strength", "Comparing substitute demand", "Assessing timing risk", "Delivering demand verdict"],
  },
  {
    id: "landscape",
    command: "/market landscape",
    label: "Industry Landscape Map",
    description: "Map ecosystem players, value chain, substitute categories, and strategic positioning clusters.",
    inputType: "topic",
    placeholder: "B2B procurement automation",
    category: "strategy",
    icon: "🗺️",
    outputFile: "INDUSTRY-LANDSCAPE.md",
    phases: ["Defining landscape boundaries", "Mapping ecosystem players", "Grouping by positioning", "Identifying strategic gaps", "Compiling landscape map"],
  },
  {
    id: "whitespace",
    command: "/market whitespace",
    label: "Whitespace Opportunities",
    description: "Find underserved niches and unmet needs using competitor gaps, pain points, and segment blind spots.",
    inputType: "topic",
    placeholder: "Workflow automation for legal operations",
    category: "strategy",
    icon: "🧭",
    outputFile: "WHITESPACE-OPPORTUNITIES.md",
    phases: ["Analyzing current solutions", "Extracting unmet needs", "Ranking opportunity spaces", "Estimating monetization potential", "Producing whitespace roadmap"],
  },
  {
    id: "regulatory",
    command: "/market regulatory",
    label: "Regulatory & Risk Scan",
    description: "Assess regulatory constraints, compliance requirements, and go-to-market risk factors by region/industry.",
    inputType: "topic",
    placeholder: "AI diagnostics for EU healthcare providers",
    category: "reporting",
    icon: "⚖️",
    outputFile: "REGULATORY-RISK-SCAN.md",
    phases: ["Identifying relevant frameworks", "Collecting jurisdictional requirements", "Scoring compliance risk", "Recommending mitigation actions", "Finalizing risk brief"],
  },
];

/** Find a marketing command by its slash command prefix */
export function findCommand(input: string): MarketingCommand | null {
  const normalized = input.toLowerCase().trim();
  return MARKETING_COMMANDS.find((cmd) => normalized.startsWith(cmd.command)) ?? null;
}

/** Extract the argument (URL/topic) from a slash command input */
export function extractCommandArg(input: string, command: MarketingCommand): string {
  return input.slice(command.command.length).trim();
}

/** Check if input looks like a slash command being typed */
export function isTypingCommand(input: string): boolean {
  return input.startsWith("/");
}

/** Filter commands that match partial input */
export function filterCommands(input: string): MarketingCommand[] {
  if (!input.startsWith("/")) return [];
  const normalized = input.toLowerCase().trim();
  return MARKETING_COMMANDS.filter(
    (cmd) =>
      cmd.command.startsWith(normalized) ||
      cmd.label.toLowerCase().includes(normalized.replace("/market ", "").replace("/", ""))
  );
}

/** Category metadata for grouping in UI */
export const COMMAND_CATEGORIES = {
  analysis: { label: "Analysis", icon: "📊" },
  content: { label: "Content Generation", icon: "✍️" },
  strategy: { label: "Strategy", icon: "🎯" },
  reporting: { label: "Reporting", icon: "📑" },
} as const;
