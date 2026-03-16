import Link from "next/link";
import BriefLogo from "@/components/BriefLogo";

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[#f0f0f0] relative overflow-hidden">
      {/* Subtle gradient blobs */}
      <div className="pointer-events-none absolute top-[60%] -left-32 w-[500px] h-[500px] rounded-full bg-gradient-to-tr from-pink-200/40 to-orange-100/30 blur-3xl" />
      <div className="pointer-events-none absolute top-[30%] -right-32 w-[400px] h-[400px] rounded-full bg-gradient-to-bl from-indigo-200/30 to-blue-100/20 blur-3xl" />

      {/* Nav */}
      <nav className="relative z-10 flex items-center justify-between px-6 sm:px-12 py-5 max-w-6xl mx-auto">
        <div className="flex items-center gap-2">
          <BriefLogo size={22} />
          <span className="text-[15px] font-medium text-[#111111] tracking-[-0.01em]">
            brıef
          </span>
        </div>
        <Link
          href="/app"
          className="text-sm font-medium text-[#111] border border-[#d4d4d4] rounded-full px-5 py-2 hover:bg-white hover:shadow-sm"
        >
          Sign in
        </Link>
      </nav>

      {/* Hero */}
      <section className="relative z-10 flex flex-col items-center text-center pt-16 sm:pt-24 pb-12 px-6">
        <h1 className="text-4xl sm:text-[52px] font-semibold text-[#111] leading-[1.15] tracking-tight max-w-2xl">
          AI-powered market
          <br />
          research agent
        </h1>
        <p className="mt-5 text-[#737373] text-base sm:text-lg max-w-lg leading-relaxed">
          Transform any topic into comprehensive market insights in seconds.
          Let AI scan, analyze, and deliver actionable research while you focus
          on building.
        </p>
        <Link
          href="/app"
          className="mt-8 inline-flex items-center justify-center bg-[#111] text-white text-sm font-medium rounded-full px-7 py-3 hover:bg-[#333] shadow-sm"
        >
          Get started for free
        </Link>
      </section>

      {/* Product preview */}
      <section className="relative z-10 max-w-4xl mx-auto px-6 pb-20">
        <div className="rounded-2xl bg-white shadow-[0_2px_40px_rgba(0,0,0,0.06)] border border-[#e5e5e5] overflow-hidden">
          {/* Mock browser bar */}
          <div className="flex items-center gap-2 px-5 py-3 border-b border-[#f0f0f0]">
            <div className="flex gap-1.5">
              <span className="w-3 h-3 rounded-full bg-[#e5e5e5]" />
              <span className="w-3 h-3 rounded-full bg-[#e5e5e5]" />
              <span className="w-3 h-3 rounded-full bg-[#e5e5e5]" />
            </div>
            <div className="flex-1 flex justify-center">
              <div className="bg-[#f5f5f5] rounded-lg px-4 py-1.5 text-xs text-[#999] w-64 text-center">
                brief.ai
              </div>
            </div>
          </div>

          {/* Mock app content */}
          <div className="p-8 sm:p-12">
            {/* Mock idle state */}
            <div className="flex flex-col items-center">
              <h2 className="text-xl sm:text-2xl font-semibold text-[#111] mb-2">
                What do you want to research?
              </h2>
              <p className="text-sm text-[#999] mb-6">
                Enter a topic and Brief will scan the market for you.
              </p>

              {/* Mock input */}
              <div className="w-full max-w-md rounded-xl border border-[#e5e5e5] bg-white px-4 py-3 flex items-center justify-between shadow-sm">
                <span className="text-sm text-[#ccc]">
                  e.g. &quot;AI startup landscape in healthcare&quot;
                </span>
                <div className="w-8 h-8 rounded-lg bg-[#111] flex items-center justify-center">
                  <svg
                    className="w-4 h-4 text-white"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M5 12h14M12 5l7 7-7 7" />
                  </svg>
                </div>
              </div>

              {/* Mock suggestions */}
              <div className="flex flex-wrap gap-2 mt-5 justify-center">
                {[
                  "Market Research",
                  "Competitor Analysis",
                  "Trend Reports",
                  "Customer Insights",
                ].map((label) => (
                  <span
                    key={label}
                    className="px-3 py-1.5 rounded-full text-xs border border-[#e5e5e5] text-[#999]"
                  >
                    {label}
                  </span>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Floating card — right side, overlapping preview */}
        <div className="hidden sm:block absolute -right-2 top-1/2 -translate-y-1/4 w-56 rounded-2xl bg-white shadow-[0_4px_30px_rgba(0,0,0,0.08)] border border-[#e5e5e5] p-5">
          <p className="text-xs font-semibold text-[#111] mb-3">
            What you get
          </p>
          <div className="space-y-3">
            {[
              { icon: "📊", label: "Market Overview" },
              { icon: "🏢", label: "Key Competitors" },
              { icon: "💡", label: "Emerging Trends" },
              { icon: "🎯", label: "Opportunities" },
            ].map(({ icon, label }) => (
              <div key={label} className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#f5f5f5] flex items-center justify-center text-sm">
                  {icon}
                </div>
                <span className="text-sm text-[#555]">{label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 text-center pb-10">
        <p className="text-xs text-[#999]">
          Free to start · No credit card required
        </p>
      </footer>
    </div>
  );
}
