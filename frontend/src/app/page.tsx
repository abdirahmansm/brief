"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import LogoMark from "@/components/LogoMark";

const workflowSteps = [
  { title: "Define the market question", icon: "◌", status: "completed" },
  { title: "Scan live sources in flight", icon: "◐", status: "active" },
  { title: "Synthesize recurring signals", icon: "◑", status: "inactive" },
  { title: "Ship a report with citations", icon: "◒", status: "inactive" },
] as const;

const statCards = [
  { value: 20, suffix: "+", label: "cited sources per deep run" },
  { value: 6, suffix: "x", label: "faster insight cycles" },
  { value: 95, suffix: "%", label: "less manual research overhead" },
];

const sources = [
  {
    name: "Review platforms",
    points: 1842,
    icon: "RP",
    gradient: "from-fuchsia-500 to-violet-600",
    bars: ["h-[46%]", "h-[74%]", "h-[55%]", "h-[80%]", "h-[38%]", "h-[66%]"],
    delays: ["anim-delay-0", "anim-delay-100", "anim-delay-200", "anim-delay-300", "anim-delay-400", "anim-delay-500"],
  },
  {
    name: "Industry news",
    points: 928,
    icon: "IN",
    gradient: "from-sky-500 to-cyan-400",
    bars: ["h-[30%]", "h-[64%]", "h-[42%]", "h-[70%]", "h-[38%]", "h-[58%]"],
    delays: ["anim-delay-0", "anim-delay-100", "anim-delay-200", "anim-delay-300", "anim-delay-400", "anim-delay-500"],
  },
  {
    name: "Community threads",
    points: 1216,
    icon: "CT",
    gradient: "from-emerald-500 to-teal-400",
    bars: ["h-[52%]", "h-[70%]", "h-[35%]", "h-[78%]", "h-[48%]", "h-[64%]"],
    delays: ["anim-delay-0", "anim-delay-100", "anim-delay-200", "anim-delay-300", "anim-delay-400", "anim-delay-500"],
  },
  {
    name: "Competitor pages",
    points: 642,
    icon: "CP",
    gradient: "from-amber-500 to-orange-400",
    bars: ["h-[22%]", "h-[48%]", "h-[32%]", "h-[62%]", "h-[26%]", "h-[54%]"],
    delays: ["anim-delay-0", "anim-delay-100", "anim-delay-200", "anim-delay-300", "anim-delay-400", "anim-delay-500"],
  },
] as const;

const sourceInsights = [
  "Customers keep asking for faster setup, better integration depth, and fewer manual exports.",
  "Pricing pages are converging on similar tiers, but packaging clarity is still inconsistent.",
  "The strongest opportunities are clustered around trust, speed, and evidence-rich summaries.",
] as const;

const featureCards = [
  {
    title: "Living research loops",
    description: "Live workflows stay visible while data flows from scanning to synthesis in a single story.",
    details: ["Auto-cycling step states", "Source visibility at every stage", "Manual control with instant feedback"],
  },
  {
    title: "Clear progress signals",
    description: "Status updates, counters, and source activity help teams understand what is happening in real time.",
    details: ["Real-time progress counters", "Source coverage indicators", "Readable status-first layout"],
  },
  {
    title: "Actionable delivery",
    description: "The output is structured for founders, PMs, and growth teams who need decisions, not noise.",
    details: ["Cited sources", "Opportunity framing", "Conversion-ready CTA paths"],
  },
] as const;

const testimonials = [
  { quote: "Brief turned a scattered research process into a calm, credible workflow our team trusts.", name: "Ava Chen", title: "Founder, Northstar Studio", avatar: "A" },
  { quote: "The live source story is what sold us. It feels like seeing the research think in front of you.", name: "Marcus Lee", title: "Product Lead, Orbit Cloud", avatar: "M" },
  { quote: "We replaced three tools and a lot of manual synthesis with one interface that keeps moving.", name: "Priya Shah", title: "Growth Director, SignalFrame", avatar: "P" },
] as const;

const footerColumns = [
  { title: "Product", links: ["Overview", "Research flow", "Reports", "Pricing"] },
  { title: "Company", links: ["About", "Careers", "Contact", "Press"] },
  { title: "Legal", links: ["Privacy", "Terms", "Security", "Cookies"] },
] as const;

function useInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  return { ref, inView };
}

function AnimatedCounter({ target, suffix = "" }: { target: number; suffix?: string }) {
  const { ref, inView } = useInView<HTMLSpanElement>();
  const [value, setValue] = useState(0);

  useEffect(() => {
    if (!inView) return;

    let frame = 0;
    const duration = 2000;
    const start = performance.now();

    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(target * eased));
      if (progress < 1) {
        frame = window.requestAnimationFrame(tick);
      }
    };

    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [inView, target]);

  return (
    <span ref={ref} className={inView ? "animate-counter-up" : "opacity-0"}>
      {value}
      {suffix}
    </span>
  );
}

function SectionReveal({ children, delay = 0 }: { children: React.ReactNode; delay?: number }) {
  const { ref, inView } = useInView<HTMLDivElement>();
  const delayClass =
    delay === 100
      ? "anim-delay-100"
      : delay === 150
        ? "anim-delay-150"
        : delay === 200
          ? "anim-delay-200"
          : delay === 300
            ? "anim-delay-300"
            : delay === 400
              ? "anim-delay-400"
              : delay === 500
                ? "anim-delay-500"
                : "anim-delay-0";

  return (
    <div ref={ref} className={`${inView ? "section-fade" : "opacity-0 translate-y-5"} ${delayClass}`}>
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [activeStep, setActiveStep] = useState(1);
  const [activeFeature, setActiveFeature] = useState(0);
  const [activeTestimonial, setActiveTestimonial] = useState(0);
  const [activeInsight, setActiveInsight] = useState(0);

  useEffect(() => {
    const stepTimer = window.setInterval(() => {
      setActiveStep((current) => (current + 1) % workflowSteps.length);
    }, 3000);

    const testimonialTimer = window.setInterval(() => {
      setActiveTestimonial((current) => (current + 1) % testimonials.length);
    }, 5000);

    const insightTimer = window.setInterval(() => {
      setActiveInsight((current) => (current + 1) % sourceInsights.length);
    }, 4000);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(testimonialTimer);
      window.clearInterval(insightTimer);
    };
  }, []);

  return (
    <div className="relative min-h-screen overflow-hidden text-[var(--foreground)]">
      <a href="#content" className="skip-link focus-ring">
        Skip to content
      </a>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-[rgba(139,92,246,0.12)] bg-[rgba(20,20,40,0.55)] backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1280px] items-center justify-between px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-2">
            <LogoMark />
            <span className="text-[20px] font-bold tracking-tight text-[var(--foreground)]">Brief</span>
          </div>

          <div className="hidden items-center text-sm text-[var(--muted-foreground)] md:flex">Real-time web intelligence</div>

          <div className="flex items-center gap-3">
            <Link href="/app" className="focus-ring rounded-full px-4 py-3 text-sm font-medium text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--card)_50%,transparent)]">
              Sign in
            </Link>
            <Link href="/app" className="focus-ring glow-hover rounded-full bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-5 py-3 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
              Get started
            </Link>
          </div>
        </div>
      </header>

      <main id="content" className="relative z-10 pt-24 sm:pt-28">
        <section className="mx-auto grid max-w-[1280px] gap-12 px-4 pb-20 sm:px-6 lg:grid-cols-[1.02fr_0.98fr] lg:gap-12 lg:px-8 lg:pb-28">
          <div className="flex flex-col justify-center">
            <SectionReveal delay={0}>
              <span className="inline-flex rounded-full border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)] px-4 py-2 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                Built for founders, PMs, and growth teams
              </span>
            </SectionReveal>

            <SectionReveal delay={100}>
              <h1 className="mt-6 max-w-3xl text-[40px] font-bold leading-[1.05] tracking-[-0.03em] sm:text-[56px] lg:text-[80px]">
                Market Research, <span className="gradient-text text-shadow-soft">Automated</span>
              </h1>
            </SectionReveal>

            <SectionReveal delay={200}>
              <p className="mt-6 max-w-[28rem] text-[18px] leading-[1.6] text-[var(--muted-foreground)]">
                Brief turns noisy market signals into a living research workflow. Scan sources, surface patterns, and deliver cited insights that help teams move faster with less manual work.
              </p>
            </SectionReveal>

            <SectionReveal delay={300}>
              <div className="mt-8 flex flex-col gap-4 sm:flex-row">
                <Link href="/app" className="focus-ring glow-hover inline-flex h-12 items-center justify-center rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-8 text-[16px] font-semibold text-[var(--accent-foreground)] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                  Launch Brief
                </Link>
                <Link href="#workflow" className="focus-ring inline-flex h-12 items-center justify-center rounded-lg border border-[var(--border)] px-8 text-[16px] font-semibold text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--card)_50%,transparent)]">
                  Explore demo flow
                </Link>
              </div>
            </SectionReveal>

            <SectionReveal delay={400}>
              <div className="mt-10 border-t border-[rgba(255,255,255,0.08)] pt-8">
                <p className="mb-4 text-[12px] font-medium uppercase tracking-[0.18em] text-[var(--muted-foreground)]">Trusted by teams that need proof, not hype</p>
                <div className="flex flex-wrap gap-3">
                  {[
                    "Market signal mapping",
                    "Cited source trails",
                    "Founder-ready summaries",
                    "Fast opportunity framing",
                  ].map((item) => (
                    <span key={item} className="glass-panel rounded-full px-3 py-2 text-[12px] font-medium text-[var(--muted-foreground)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            </SectionReveal>
          </div>

          <SectionReveal delay={150}>
            <div id="workflow" className="panel-sheen relative overflow-hidden rounded-[20px] border border-[rgba(139,92,246,0.2)] bg-[rgba(20,20,40,0.5)] p-6 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-md sm:p-8">
              <div className="pointer-events-none absolute -left-14 top-10 h-44 w-44 rounded-full bg-[rgba(139,92,246,0.12)] blur-3xl" />
              <div className="pointer-events-none absolute bottom-10 right-0 h-36 w-36 rounded-full bg-[rgba(139,92,246,0.08)] blur-3xl" />

              <div className="relative z-10 mb-8 flex items-start justify-between gap-4">
                <div>
                  <p className="text-[20px] font-semibold text-[var(--foreground)]">Workflow visualization</p>
                  <p className="mt-1 text-[14px] text-[var(--muted-foreground)]">A live view of research moving from question to citation.</p>
                </div>
                <div className="glass-panel flex items-center gap-2 rounded-full px-3 py-2 text-[12px] font-semibold text-[var(--accent)]">
                  <span className="animate-pulse-glow h-2 w-2 rounded-full bg-[var(--accent)]" />
                  Deep mode
                </div>
              </div>

              <div className="relative z-10 space-y-4">
                {workflowSteps.map((step, index) => {
                  const isActive = index === activeStep;
                  const isCompleted = index < activeStep;

                  return (
                    <button
                      key={step.title}
                      type="button"
                      onClick={() => setActiveStep(index)}
                      className={`focus-ring relative flex w-full items-center gap-4 overflow-hidden rounded-lg border p-4 text-left transition-all duration-300 ${
                        isActive
                          ? "border-[rgba(139,92,246,0.5)] bg-[rgba(139,92,246,0.1)] text-[var(--foreground)] shadow-[0_8px_16px_rgba(139,92,246,0.2)]"
                          : "border-[rgba(255,255,255,0.08)] bg-[var(--card)] text-[var(--muted-foreground)]"
                      }`}
                    >
                      {isActive ? <span className="animate-scan-line absolute inset-0 rounded-lg bg-[linear-gradient(to_right,transparent,rgba(139,92,246,0.2),transparent)]" /> : null}
                      <span className={`relative z-10 flex h-8 w-8 items-center justify-center rounded-full text-[14px] font-semibold ${
                        isActive
                          ? "bg-[var(--accent)] text-[var(--accent-foreground)]"
                          : isCompleted
                            ? "bg-[rgba(139,92,246,0.3)] text-[var(--accent)]"
                            : "border border-[var(--border)] bg-[var(--card)] text-[var(--muted-foreground)]"
                      }`}>
                        {isCompleted ? "✓" : index + 1}
                      </span>
                      <span className="relative z-10 flex-1 text-[14px] font-medium">{step.title}</span>
                      <span className={`relative z-10 text-[20px] transition-transform duration-300 ${isActive ? "scale-110" : ""}`}>
                        {step.icon}
                      </span>
                      {isActive ? <span className="absolute bottom-0 left-0 h-1 w-full rounded-br-lg rounded-bl-lg bg-[linear-gradient(to_right,oklch(0.55_0.24_262),rgba(139,92,246,0.3))] animate-pulse-glow" /> : null}
                    </button>
                  );
                })}
              </div>

              <div className="relative z-10 mt-8 border-t border-[rgba(255,255,255,0.08)] pt-6">
                <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--muted-foreground)]">Sources in flight</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {["Industry news", "Review platforms", "Community threads", "Competitor pages"].map((item) => (
                    <span key={item} className="glass-panel hover-lift cursor-pointer rounded-full border border-[rgba(139,92,246,0.2)] px-3 py-2 text-[12px] font-medium text-[var(--muted-foreground)] hover:border-[rgba(139,92,246,0.5)] hover:bg-[rgba(139,92,246,0.05)]">
                      {item}
                    </span>
                  ))}
                </div>
              </div>

              <div className="pointer-events-none absolute left-8 top-8 h-3 w-3 rounded-full bg-[var(--accent)] blur-[2px] animate-pulse-glow" />
              <div className="pointer-events-none absolute right-10 top-28 h-5 w-5 rounded-full bg-[rgba(139,92,246,0.2)] blur-xl animate-float-up" />
            </div>
          </SectionReveal>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <div className="grid gap-6 md:grid-cols-3">
            {statCards.map((card, index) => (
              <SectionReveal key={card.label} delay={index * 100}>
                <article className="glass-panel hover-lift relative overflow-hidden rounded-[16px] p-8 transition-all duration-300 hover:border-[rgba(139,92,246,0.5)] hover:shadow-[0_8px_32px_rgba(139,92,246,0.15)]">
                  <div className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(to_right,transparent,oklch(0.55_0.24_262),transparent)] opacity-0 transition-opacity duration-300 hover:opacity-100" />
                  <p className="text-[56px] font-bold leading-none text-[var(--accent)] sm:text-[64px]"><AnimatedCounter target={card.value} suffix={card.suffix} /></p>
                  <p className="mt-4 max-w-[14rem] text-[18px] font-medium text-[var(--muted-foreground)]">{card.label}</p>
                  <span className="pointer-events-none absolute bottom-4 right-4 h-12 w-12 rounded-full bg-[rgba(139,92,246,0.1)] opacity-0 transition-opacity duration-300 hover:opacity-100" />
                </article>
              </SectionReveal>
            ))}
          </div>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <SectionReveal>
            <header className="mb-8 max-w-3xl">
              <p className="text-[36px] font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-[48px]">Sources in flight</p>
              <p className="mt-4 text-[18px] leading-[1.6] text-[var(--muted-foreground)]">Brief keeps its research loop visible, so every source is part of a story the user can understand and trust.</p>
            </header>
          </SectionReveal>

          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
            {sources.map((source, index) => (
              <SectionReveal key={source.name} delay={index * 100}>
                <article className="glass-panel hover-lift relative rounded-[16px] p-6 transition-all duration-300 hover:border-[rgba(139,92,246,0.5)]">
                  <div className="absolute right-4 top-4 flex items-center gap-2 text-[12px] font-semibold text-[var(--accent)]">
                    <span className="animate-pulse-glow h-2 w-2 rounded-full bg-[var(--accent)]" />
                    Live
                  </div>

                  <div className={`mb-4 flex h-12 w-12 items-center justify-center rounded-lg bg-gradient-to-br ${source.gradient} text-[12px] font-bold text-white transition-transform duration-300 hover:scale-110`}>
                    {source.icon}
                  </div>
                  <h3 className="text-[16px] font-semibold text-[var(--foreground)]">{source.name}</h3>
                  <p className="mt-2 text-[32px] font-bold text-[var(--accent)]">{source.points.toLocaleString()}</p>
                  <p className="text-[12px] text-[var(--muted-foreground)]">indexed data points</p>

                  <div className="mt-5 flex h-8 items-end gap-1.5">
                    {source.bars.map((bar, barIndex) => (
                      <div key={`${source.name}-${barIndex}`} className="flex-1 overflow-hidden rounded-t-md bg-[rgba(139,92,246,0.2)]">
                        <div className={`animate-pulse-glow w-full rounded-t-md bg-[linear-gradient(to_top,oklch(0.55_0.24_262),rgba(139,92,246,0.5))] ${bar} ${source.delays[barIndex]}`} />
                      </div>
                    ))}
                  </div>
                </article>
              </SectionReveal>
            ))}
          </div>

          <SectionReveal delay={200}>
            <div className="mt-6 overflow-hidden rounded-[16px] border border-[rgba(139,92,246,0.3)] bg-[rgba(139,92,246,0.05)] p-8 shadow-[0_8px_32px_rgba(139,92,246,0.12)]">
              <div className="relative">
                <div className="mb-6 flex items-center gap-3">
                  <span className="animate-pulse-glow h-3 w-3 rounded-full bg-[var(--accent)]" />
                  <h3 className="text-[18px] font-semibold text-[var(--foreground)]">Live insights</h3>
                </div>

                <div className="relative min-h-[80px] overflow-hidden">
                  {sourceInsights.map((insight, index) => {
                    const isActive = index === activeInsight;
                    return (
                      <p key={insight} className={`absolute inset-0 text-[16px] leading-[1.6] text-[var(--foreground)] transition-all duration-500 ${isActive ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"}`}>
                        {insight}
                      </p>
                    );
                  })}
                </div>

                <div className="mt-6 flex gap-2">
                  {sourceInsights.map((_, index) => (
                    <button key={index} type="button" onClick={() => setActiveInsight(index)} className={`focus-ring h-2 rounded-full transition-all duration-300 ${index === activeInsight ? "w-8 bg-[var(--accent)]" : "w-2 bg-[rgba(139,92,246,0.3)]"}`} aria-label={`View insight ${index + 1}`} />
                  ))}
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <SectionReveal>
            <header className="mx-auto mb-8 max-w-3xl text-center">
              <p className="text-[36px] font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-[48px]">Why teams trust this workflow</p>
              <p className="mx-auto mt-4 max-w-2xl text-[18px] leading-[1.6] text-[var(--muted-foreground)]">Each state change reflects real work in progress so teams can verify momentum at every step.</p>
            </header>
          </SectionReveal>

          <div className="grid gap-6 lg:grid-cols-3">
            {featureCards.map((feature, index) => {
              const isActive = activeFeature === index;

              return (
                <SectionReveal key={feature.title} delay={index * 100}>
                  <button type="button" onClick={() => setActiveFeature(index)} className={`focus-ring group relative flex h-full w-full flex-col overflow-hidden rounded-[16px] border p-8 text-left transition-all duration-300 ${isActive ? "border-[rgba(139,92,246,0.5)] bg-[rgba(139,92,246,0.05)] shadow-[0_8px_32px_rgba(139,92,246,0.2)]" : "border-[rgba(255,255,255,0.08)] bg-[var(--card)]"}`}>
                    {isActive ? <span className="absolute inset-x-0 top-0 h-1 bg-[linear-gradient(to_right,transparent,oklch(0.55_0.24_262),transparent)]" /> : null}
                    <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-lg bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.05))] text-[24px] transition-transform duration-300 group-hover:scale-110">
                      {index === 0 ? "↗" : index === 1 ? "◔" : "∞"}
                    </div>
                    <h3 className="text-[24px] font-bold text-[var(--foreground)]">{feature.title}</h3>
                    <p className="mt-3 text-[16px] leading-[1.6] text-[var(--muted-foreground)]">{feature.description}</p>

                    <div className={`mt-6 overflow-hidden transition-all duration-300 ${isActive ? "max-h-40 opacity-100" : "max-h-0 opacity-0"}`}>
                      <p className="mb-3 text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--accent)]">Details</p>
                      <div className="space-y-2">
                        {feature.details.map((detail) => (
                          <div key={detail} className="flex items-start gap-3 text-[14px] text-[var(--muted-foreground)]">
                            <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--accent)]" />
                            <span>{detail}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <span className="absolute bottom-4 right-4 h-8 w-8 rounded-full border border-[var(--accent)] bg-[rgba(139,92,246,0.1)] opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
                  </button>
                </SectionReveal>
              );
            })}
          </div>

          <SectionReveal delay={200}>
            <div className="mt-8 grid gap-8 rounded-[16px] border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.05)] p-8 lg:grid-cols-[1.05fr_0.95fr] lg:p-12">
              <div className="relative overflow-hidden">
                <p className="mb-4 text-[32px] font-bold text-[var(--foreground)]">Operational value</p>
                <div className="space-y-3 text-[16px] leading-[1.6] text-[var(--muted-foreground)]">
                  {[
                    "Research status is visible from scan to synthesis, reducing uncertainty during active runs.",
                    "Source updates and step tracking help teams validate findings before sharing decisions.",
                    "The interface stays readable under load so analysts can move quickly without losing context.",
                  ].map((item) => (
                    <div key={item} className="flex gap-3">
                      <span className="mt-2 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[rgba(139,92,246,0.2)] text-[12px] text-[var(--accent)]">•</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-center rounded-lg bg-[linear-gradient(135deg,rgba(139,92,246,0.2),rgba(139,92,246,0.05))] p-10 text-center">
                <div>
                  <div className="text-[64px] font-bold leading-none text-[var(--accent)]">24/7</div>
                  <p className="mt-3 text-[16px] text-[var(--muted-foreground)]">Built for continuous research cycles and production reporting.</p>
                </div>
              </div>
            </div>
          </SectionReveal>
        </section>

        <section className="mx-auto max-w-[1280px] px-4 pb-20 sm:px-6 lg:px-8 lg:pb-28">
          <SectionReveal>
            <header className="mx-auto mb-8 max-w-3xl text-center">
              <p className="text-[36px] font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-[48px]">What teams say after using it</p>
              <p className="mx-auto mt-4 max-w-2xl text-[18px] leading-[1.6] text-[var(--muted-foreground)]">The page and the product should both feel like they are already in motion.</p>
            </header>
          </SectionReveal>

          <div className="grid gap-6 lg:grid-cols-3">
            {testimonials.map((testimonial, index) => {
              const isActive = index === activeTestimonial;

              return (
                <SectionReveal key={testimonial.name} delay={index * 100}>
                  <article className={`relative flex h-full flex-col rounded-[16px] border p-8 transition-all duration-300 ${isActive ? "border-[rgba(139,92,246,0.5)] bg-[rgba(139,92,246,0.05)] shadow-[0_8px_32px_rgba(139,92,246,0.2)]" : "border-[rgba(255,255,255,0.08)] bg-[var(--card)]"}`}>
                    {isActive ? <span className="absolute inset-x-0 top-0 h-1 rounded-t-[16px] bg-[linear-gradient(to_right,transparent,oklch(0.55_0.24_262),transparent)]" /> : null}

                    <div className="mb-4 flex gap-1 text-[var(--accent)]">
                      {Array.from({ length: 5 }).map((_, star) => (
                        <span key={star} aria-hidden>★</span>
                      ))}
                    </div>

                    <p className="flex-1 text-[18px] leading-[1.6] italic text-[var(--foreground)]">“{testimonial.quote}”</p>

                    <div className="mt-8 flex items-center gap-4">
                      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[rgba(139,92,246,0.2)] text-[24px] font-bold text-[var(--accent)]">{testimonial.avatar}</div>
                      <div>
                        <p className="text-[16px] font-semibold text-[var(--foreground)]">{testimonial.name}</p>
                        <p className="text-[12px] text-[var(--muted-foreground)]">{testimonial.title}</p>
                      </div>
                    </div>
                  </article>
                </SectionReveal>
              );
            })}
          </div>

          <div className="mt-6 flex justify-center gap-3">
            {testimonials.map((_, index) => (
              <button key={index} type="button" onClick={() => setActiveTestimonial(index)} className={`focus-ring h-2 rounded-full transition-all duration-300 ${index === activeTestimonial ? "w-8 bg-[var(--accent)]" : "w-2 bg-[rgba(139,92,246,0.3)]"}`} aria-label={`View testimonial ${index + 1}`} />
            ))}
          </div>

          <SectionReveal delay={200}>
            <div className="mx-auto mt-8 flex max-w-3xl items-center justify-center gap-3 rounded-full border border-[rgba(255,255,255,0.08)] bg-[rgba(20,20,40,0.5)] px-5 py-3 backdrop-blur-md">
              <div className="-space-x-2 flex">
                {["A", "M", "P"].map((letter) => (
                  <span key={letter} className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-[var(--background)] bg-[rgba(139,92,246,0.2)] text-[12px] font-bold text-[var(--accent)]">{letter}</span>
                ))}
              </div>
              <p className="text-[14px] text-[var(--muted-foreground)]">
                Trusted by <span className="font-semibold text-[var(--foreground)]">founders</span>, <span className="font-semibold text-[var(--foreground)]">PMs</span>, and <span className="font-semibold text-[var(--foreground)]">growth teams</span> that need research with receipts.
              </p>
            </div>
          </SectionReveal>
        </section>

        <section className="mx-auto max-w-[1024px] px-4 pb-20 text-center sm:px-6 lg:px-8 lg:pb-28">
          <SectionReveal>
            <h2 className="text-[36px] font-bold tracking-[-0.03em] text-[var(--foreground)] sm:text-[48px]">Ready to launch your research loop?</h2>
            <p className="mx-auto mt-6 max-w-3xl text-[20px] leading-[1.6] text-[var(--muted-foreground)]">Start with one prompt and move from uncertainty to cited market insight in a single workflow.</p>

            <div className="mt-8 flex flex-col justify-center gap-4 sm:flex-row">
              <Link href="/app" className="focus-ring glow-hover inline-flex h-12 items-center justify-center rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-8 text-[16px] font-semibold text-[var(--accent-foreground)] shadow-[0_0_20px_rgba(139,92,246,0.3)]">
                Launch Brief
              </Link>
              <Link href="#content" className="focus-ring inline-flex h-12 items-center justify-center rounded-lg border border-[var(--border)] px-8 text-[16px] font-semibold text-[var(--foreground)] hover:bg-[color-mix(in_oklab,var(--card)_50%,transparent)]">
                Back to top
              </Link>
            </div>
          </SectionReveal>
        </section>
      </main>

      <footer className="border-t border-[rgba(255,255,255,0.08)] bg-[linear-gradient(to_bottom,transparent,rgba(139,92,246,0.05))] px-4 py-12 sm:px-6 lg:px-8 lg:py-16">
        <div className="mx-auto max-w-[1280px]">
          <div className="grid gap-8 pb-12 lg:grid-cols-4">
            <div className="space-y-4">
              <div className="flex items-center gap-2">
                <LogoMark />
                <span className="text-[18px] font-bold text-[var(--foreground)]">Brief</span>
              </div>
              <p className="max-w-sm text-[14px] leading-[1.6] text-[var(--muted-foreground)]">Living market intelligence for teams that need a premium, source-backed workflow.</p>
            </div>

            {footerColumns.map((column) => (
              <div key={column.title}>
                <h3 className="mb-3 text-[16px] font-semibold text-[var(--foreground)]">{column.title}</h3>
                <div className="space-y-2">
                  {column.links.map((link) => (
                    <a key={link} href="#" className="block text-[14px] text-[var(--muted-foreground)] hover:text-[var(--accent)]">
                      {link}
                    </a>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <div className="flex flex-col items-center justify-between gap-4 border-t border-[rgba(255,255,255,0.08)] pt-8 text-center sm:flex-row sm:text-left">
            <p className="text-[14px] text-[var(--muted-foreground)]">© 2026 Brief AI. Source-backed outputs for execution.</p>
            <div className="flex gap-6 text-[14px] text-[var(--muted-foreground)]">
              <a href="#" className="hover:text-[var(--accent)]">X</a>
              <a href="#" className="hover:text-[var(--accent)]">LinkedIn</a>
              <a href="#" className="hover:text-[var(--accent)]">Contact</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
