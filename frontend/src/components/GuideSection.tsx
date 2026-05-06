"use client";

import { useMemo, useState } from "react";

interface PlaybookStep {
  timestamp: string;
  title: string;
  action: string;
  howBriefHelps: string;
}

interface FaqItem {
  question: string;
  answer: string;
}

const PLAYBOOK: PlaybookStep[] = [
  {
    timestamp: "00:01",
    title: "Start with the market question that matters",
    action:
      "Write one sharp research objective like: Which customer segment has urgent pain and budget right now?",
    howBriefHelps:
      "Brief turns a vague idea into a focused investigation and gets you to insight mode in minutes.",
  },
  {
    timestamp: "00:29",
    title: "Validate demand before building",
    action:
      "Ask Brief to test if the market has proven pain, purchase intent, and channel fit before you commit resources.",
    howBriefHelps:
      "Brief cross-checks real market evidence so you avoid slow, expensive guessing.",
  },
  {
    timestamp: "02:31",
    title: "Select a niche and narrow to a sub-niche",
    action:
      "Start broad, then tighten: from a category to a high-value micro-segment you can message clearly.",
    howBriefHelps:
      "Brief surfaces where demand, urgency, and accessibility overlap so your offer lands faster.",
  },
  {
    timestamp: "04:52",
    title: "Capture data points, not opinions",
    action:
      "Request stats, trend indicators, and proof points for every niche candidate.",
    howBriefHelps:
      "One of the models powering Brief is Perplexity, which helps gather live web context with cited sources.",
  },
  {
    timestamp: "12:27",
    title: "Mine community pain language",
    action:
      "Analyze Reddit and founder conversations to capture exact frustration words people repeat.",
    howBriefHelps:
      "Brief extracts recurring objections and converts them into usable messaging hooks.",
  },
  {
    timestamp: "29:25",
    title: "Map fears, frustrations, and desired outcome",
    action:
      "Ask what keeps buyers stuck today and what a perfect tomorrow looks like in business terms.",
    howBriefHelps:
      "Brief builds a practical current-vs-desired-state map you can plug into offers and sales pages.",
  },
  {
    timestamp: "33:22",
    title: "Build the buyer persona that drives execution",
    action:
      "Define decision-maker roles, influencer roles, channels, triggers, and buying constraints.",
    howBriefHelps:
      "Brief creates a usable persona profile that aligns outbound, content, and pricing decisions.",
  },
  {
    timestamp: "37:33",
    title: "Choose acquisition channels",
    action:
      "Prioritize channels based on where decision-makers already respond and convert.",
    howBriefHelps:
      "Brief ranks likely channels and reduces random channel testing.",
  },
  {
    timestamp: "41:22",
    title: "Turn research into a milestone delivery plan",
    action:
      "Define milestones so clients know exactly what happens each week and how progress is measured.",
    howBriefHelps:
      "Brief structures your path from discovery to launch with clear, client-facing milestones.",
  },
  {
    timestamp: "46:55",
    title: "Package your value with positioning",
    action:
      "Add a clear mechanism name, guarantee logic, and message that separates you from generic providers.",
    howBriefHelps:
      "Brief helps shape premium positioning so your offer feels category-defining, not commodity-level.",
  },
];

const FAQ: FaqItem[] = [
  {
    question: "What makes Brief different from generic AI chat tools?",
    answer:
      "Brief is built as a market-research workflow, not just a chat box. It moves from niche discovery to pain analysis to strategy-ready output in a single guided flow.",
  },
  {
    question: "Do I need advanced prompt engineering to get strong results?",
    answer:
      "No. Brief is designed so non-technical founders can still produce high-quality market intelligence quickly. You can start with one sentence and still get structured output.",
  },
  {
    question: "Which model does Brief use?",
    answer:
      "Brief uses a multi-step agent workflow. One of the key engines is Perplexity for live market context and source-backed discovery.",
  },
  {
    question: "Can Brief help me price and package my offer?",
    answer:
      "Yes. Brief can generate positioning angles, high-conversion value statements, and practical packaging ideas based on market pain and buyer expectations.",
  },
  {
    question: "How much faster is this than manual market research?",
    answer:
      "Teams typically compress days of research into one focused session. Many users go from blank page to a campaign-ready market brief in under an hour.",
  },
  {
    question: "Can I share this guide with clients or teammates?",
    answer:
      "Yes. Use the download button below to export the full user guide as a PDF and share it internally or with clients.",
  },
];

const PROMPT_TEMPLATE = `Task: Summarize the following content in 5-10 bullet points with timestamp if it's transcript.\n\nInstruction: Before responding, perform a focused web search for supporting insights from Glasp when relevant. Prefer natural keyword queries on site:glasp.co, site:blog.glasp.co, or site:read.glasp.co. Use these insights only if they add clear value.\n\nTitle: [Insert title]\nTranscript: [Paste transcript]`;

export default function GuideSection() {
  const [openFaq, setOpenFaq] = useState<number>(0);
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState("");

  const stats = useMemo(
    () => [
      { label: "Playbook Steps", value: String(PLAYBOOK.length) },
      { label: "FAQ Answers", value: String(FAQ.length) },
      { label: "Starter Prompt", value: "Ready" },
    ],
    []
  );

  const downloadGuidePdf = async () => {
    setDownloadError("");
    setDownloading(true);

    try {
      const response = await fetch("/api/guide/download", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        const payload = (await response.json()) as { error?: string };
        throw new Error(payload.error || "Guide download failed.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = "brief-market-research-guide.pdf";
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch (error) {
      setDownloadError(error instanceof Error ? error.message : "Guide download failed.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <section className="mx-auto w-full max-w-5xl px-6 py-8">
      <div className="rounded-3xl border border-border bg-card p-6 sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent">User Guide</p>
        <h1 className="mt-2 text-2xl font-semibold text-foreground sm:text-3xl">
          How to Use Brief for Market Research
        </h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-muted sm:text-base">
          Brief is built to feel like a research strike team. Give it one market question and it can rapidly turn scattered
          evidence into strategy-ready insight. Use this playbook to move from idea to evidence, then from evidence to
          positioning.
        </p>

        <div className="mt-6 grid gap-3 sm:grid-cols-3">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border bg-background px-4 py-3">
              <p className="text-xs uppercase tracking-wider text-muted">{item.label}</p>
              <p className="mt-1 text-lg font-semibold text-foreground">{item.value}</p>
            </div>
          ))}
        </div>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <button
            onClick={downloadGuidePdf}
            disabled={downloading}
            className="rounded-xl bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent/90 disabled:opacity-60"
          >
            {downloading ? "Preparing PDF..." : "Download User Guide PDF"}
          </button>
          <p className="text-xs text-muted">Best for onboarding clients and new team members.</p>
        </div>
        {downloadError && <p className="mt-2 text-xs text-red-500">{downloadError}</p>}
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Market Research Playbook (Transcript to Action)</h2>
        <p className="mt-2 text-sm text-muted">
          This sequence is adapted from the tutorial flow and translated into a practical Brief workflow you can execute immediately.
        </p>

        <div className="mt-6 space-y-4">
          {PLAYBOOK.map((step, idx) => (
            <article key={step.timestamp + step.title} className="rounded-2xl border border-border bg-background p-4">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-semibold text-accent">
                  {step.timestamp}
                </span>
                <span className="text-xs text-muted">Step {idx + 1}</span>
              </div>
              <h3 className="mt-2 text-base font-semibold text-foreground">{step.title}</h3>
              <p className="mt-2 text-sm text-muted">
                <span className="font-medium text-foreground">What to do: </span>
                {step.action}
              </p>
              <p className="mt-1.5 text-sm text-muted">
                <span className="font-medium text-foreground">How Brief helps: </span>
                {step.howBriefHelps}
              </p>
            </article>
          ))}
        </div>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">Prompt Template You Can Reuse</h2>
        <p className="mt-2 text-sm text-muted">
          Use this template inside Brief when you want timestamped transcript highlights plus optional external context.
        </p>
        <pre className="mt-4 overflow-x-auto rounded-2xl border border-border bg-background p-4 text-xs leading-relaxed text-foreground sm:text-sm">
          {PROMPT_TEMPLATE}
        </pre>
      </div>

      <div className="mt-8 rounded-3xl border border-border bg-card p-6 sm:p-8">
        <h2 className="text-xl font-semibold text-foreground">FAQ</h2>
        <div className="mt-4 space-y-3">
          {FAQ.map((item, index) => {
            const opened = index === openFaq;
            return (
              <div key={item.question} className="overflow-hidden rounded-2xl border border-border bg-background">
                <button
                  onClick={() => setOpenFaq(opened ? -1 : index)}
                  className="flex w-full items-center justify-between px-4 py-3 text-left"
                >
                  <span className="text-sm font-medium text-foreground">{item.question}</span>
                  <span className="ml-3 text-muted">{opened ? "−" : "+"}</span>
                </button>
                {opened && <p className="px-4 pb-4 text-sm leading-relaxed text-muted">{item.answer}</p>}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
