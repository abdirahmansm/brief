interface GuideStep {
  timestamp: string;
  title: string;
  action: string;
  support: string;
}

interface GuideFaq {
  question: string;
  answer: string;
}

function escapeHtml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

const GUIDE_STEPS: GuideStep[] = [
  {
    timestamp: "00:01",
    title: "Start with one market question",
    action: "Define your objective in one sentence: what market pain and which buyer do you want to understand?",
    support: "Brief turns rough ideas into a focused market brief quickly.",
  },
  {
    timestamp: "00:29",
    title: "Validate before you build",
    action: "Ask Brief to check pain intensity, willingness to pay, and urgency before committing budget.",
    support: "You get evidence-backed direction before spending weeks building the wrong thing.",
  },
  {
    timestamp: "02:31",
    title: "Pick a niche, then narrow",
    action: "Move from broad category to sub-niche where problems are specific and buyers are reachable.",
    support: "Brief highlights where urgency and purchasing power intersect.",
  },
  {
    timestamp: "04:52",
    title: "Collect proof points and trends",
    action: "Request data points, market evidence, and references to support each opportunity.",
    support: "One of the key engines in Brief is Perplexity for live market context and source-backed discovery.",
  },
  {
    timestamp: "12:27",
    title: "Mine real audience language",
    action: "Extract repeated pain phrases from forums and communities.",
    support: "Brief turns raw audience conversations into messaging-ready insight.",
  },
  {
    timestamp: "29:25",
    title: "Map current state to desired state",
    action: "Define what buyers struggle with now and what measurable outcome they actually want.",
    support: "Brief converts this into practical strategy language for your offer and content.",
  },
  {
    timestamp: "33:22",
    title: "Build execution persona",
    action: "Document decision-makers, influencers, channels, and buying triggers.",
    support: "Brief creates a persona you can immediately use across outbound and positioning.",
  },
  {
    timestamp: "41:22",
    title: "Convert findings into milestones",
    action: "Break delivery into clear phases clients can understand and track.",
    support: "Brief gives you a structured journey from discovery to results.",
  },
  {
    timestamp: "46:55",
    title: "Package and position your offer",
    action: "Create your mechanism, guarantee logic, and high-clarity value proposition.",
    support: "Brief helps your offer feel premium and hard to ignore in crowded markets.",
  },
];

const GUIDE_FAQ: GuideFaq[] = [
  {
    question: "What is Brief best used for?",
    answer: "Brief is best for fast, structured market research that leads directly to go-to-market decisions.",
  },
  {
    question: "Do I need deep prompt engineering skills?",
    answer: "No. Brief is designed to produce high-value output from simple prompts.",
  },
  {
    question: "How fast can I get useful insights?",
    answer: "Many users move from a blank page to a strategy-ready brief in one focused session.",
  },
  {
    question: "Can I share this guide with my team?",
    answer: "Yes. Download this guide as PDF and share it with your team or clients.",
  },
];

export function buildGuideMarkdown(): string {
  const lines: string[] = [];
  lines.push("# Brief User Guide: AI Market Research Playbook");
  lines.push("");
  lines.push("Brief helps teams turn market uncertainty into confident decisions with speed.");
  lines.push("");
  lines.push("## Why Brief");
  lines.push("- Turn weeks of manual market scanning into one focused workflow.");
  lines.push("- Capture real audience pain language and convert it into positioning.");
  lines.push("- Build clearer niche decisions, stronger offers, and faster campaign planning.");
  lines.push("");
  lines.push("## Transcript-to-Action Playbook");
  GUIDE_STEPS.forEach((step, index) => {
    lines.push(`### Step ${index + 1} (${step.timestamp}) - ${step.title}`);
    lines.push(`- What to do: ${step.action}`);
    lines.push(`- How Brief helps: ${step.support}`);
    lines.push("");
  });

  lines.push("## Reusable Prompt Template");
  lines.push("Task: Summarize the following content in 5-10 bullet points with timestamp if it's transcript.");
  lines.push("");
  lines.push(
    "Instruction: Before responding, perform a focused web search for supporting insights from Glasp when relevant. Prefer natural keyword queries on site:glasp.co, site:blog.glasp.co, or site:read.glasp.co. Use these insights only if they add clear value."
  );
  lines.push("");
  lines.push("Title: [Insert title]");
  lines.push("Transcript: [Paste transcript]");
  lines.push("");

  lines.push("## FAQ");
  GUIDE_FAQ.forEach((faq) => {
    lines.push(`- ${faq.question} ${faq.answer}`);
  });

  return lines.join("\n");
}

export function buildGuideHtml(): string {
  const markdown = buildGuideMarkdown();

  const htmlSections = [
    "<!doctype html>",
    "<html><head><meta charset=\"utf-8\"/>",
    "<style>",
    "body{font-family:Segoe UI,Arial,sans-serif;line-height:1.58;padding:36px;color:#101828}",
    "h1{font-size:30px;margin:0 0 10px}",
    "h2{font-size:20px;margin:24px 0 10px}",
    "h3{font-size:16px;margin:18px 0 8px}",
    "p{margin:0 0 12px}",
    "ul{padding-left:20px;margin:0 0 14px}",
    ".card{background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:12px 14px;margin:10px 0}",
    "</style>",
    "</head><body>",
    "<h1>Brief User Guide: AI Market Research Playbook</h1>",
    "<p>Brief helps teams turn market uncertainty into confident decisions with speed.</p>",
    "<h2>Why Brief</h2>",
    "<ul>",
    "<li>Turn weeks of manual market scanning into one focused workflow.</li>",
    "<li>Capture real audience pain language and convert it into positioning.</li>",
    "<li>Build clearer niche decisions, stronger offers, and faster campaign planning.</li>",
    "</ul>",
    "<h2>Transcript-to-Action Playbook</h2>",
    ...GUIDE_STEPS.map(
      (step, index) =>
        `<div class=\"card\"><h3>Step ${index + 1} (${escapeHtml(step.timestamp)}) - ${escapeHtml(step.title)}</h3><p><strong>What to do:</strong> ${escapeHtml(step.action)}</p><p><strong>How Brief helps:</strong> ${escapeHtml(step.support)}</p></div>`
    ),
    "<h2>Reusable Prompt Template</h2>",
    `<p>${escapeHtml(
      "Task: Summarize the following content in 5-10 bullet points with timestamp if it's transcript."
    )}</p>`,
    `<p>${escapeHtml(
      "Instruction: Before responding, perform a focused web search for supporting insights from Glasp when relevant. Prefer natural keyword queries on site:glasp.co, site:blog.glasp.co, or site:read.glasp.co. Use these insights only if they add clear value."
    )}</p>`,
    "<p><strong>Title:</strong> [Insert title]</p>",
    "<p><strong>Transcript:</strong> [Paste transcript]</p>",
    "<h2>FAQ</h2>",
    `<ul>${GUIDE_FAQ.map((faq) => `<li><strong>${escapeHtml(faq.question)}</strong> ${escapeHtml(faq.answer)}</li>`).join("")}</ul>`,
    "</body></html>",
  ];

  void markdown;
  return htmlSections.join("\n");
}
