import { MarketingMeta } from "@/types/research";

const COMMAND_COPY: Record<string, string> = {
  audit: "Full multi-agent marketing audit",
  fullmarketing: "Full marketing intelligence",
  quick: "Quick marketing snapshot",
  copy: "Copy analysis",
  emails: "Email sequence strategy",
  social: "Social content calendar",
  ads: "Ad campaign strategy",
  funnel: "Funnel analysis",
  competitors: "Competitor intelligence",
  landing: "Landing page CRO",
  launch: "Product launch playbook",
  proposal: "Client proposal",
  report: "Marketing report",
  seo: "SEO content audit",
  brand: "Brand voice analysis",
  sizing: "Market sizing",
  segments: "Customer segmentation",
  demand: "Demand validation",
  landscape: "Industry landscape map",
  whitespace: "Whitespace opportunities",
  regulatory: "Regulatory and risk scan",
};

function extractDomain(value: string): string {
  const trimmed = value.trim();

  if (!trimmed) return "";

  try {
    const normalized = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
    return new URL(normalized).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

export function formatMarketingTarget(meta: MarketingMeta): string {
  const copy = COMMAND_COPY[meta.commandId] || meta.commandLabel;

  if (meta.inputType === "url") {
    const domain = extractDomain(meta.arg);
    if (domain) return `${copy} @${domain}`;
  }

  return `${copy}: ${meta.arg}`;
}
