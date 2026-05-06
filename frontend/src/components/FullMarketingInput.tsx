"use client";

import { useEffect, useState } from "react";

interface FullMarketingInputProps {
  onGenerate: (websiteUrl: string) => void;
  loading?: boolean;
}

function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(normalizeUrlInput(value));
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

export default function FullMarketingInput({ onGenerate, loading = false }: FullMarketingInputProps) {
  const [websiteUrl, setWebsiteUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    if (!websiteUrl) setError("");
  }, [websiteUrl]);

  const handleSubmit = () => {
    const normalized = normalizeUrlInput(websiteUrl);
    if (!isValidUrl(normalized)) {
      setError("Enter a valid website URL, for example https://example.com");
      return;
    }

    setError("");
    onGenerate(normalized);
  };

  return (
    <div className="w-full rounded-[28px] border border-[rgba(59,130,246,0.14)] bg-[linear-gradient(180deg,rgba(20,20,40,0.68)_0%,rgba(10,10,26,0.86)_100%)] p-5 text-[var(--foreground)] shadow-[0_18px_50px_rgba(0,0,0,0.28)] sm:p-6">
      <div className="mb-4 grid gap-3 sm:grid-cols-2 sm:items-stretch">
        <div className="h-full rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.1)] px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Input</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">Enter a website URL for a company, industry, or market you want analyzed</p>
        </div>
        <div className="hidden h-full rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(59,130,246,0.1)] px-4 py-3 text-right sm:block">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent)]">Output</p>
          <p className="mt-1 text-sm font-medium text-[var(--foreground)]">Full Market Report</p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-start">
        <div>
          <label className="mb-2 block text-sm font-medium text-[var(--foreground)]">Website URL</label>
          <input
            value={websiteUrl}
            onChange={(event) => setWebsiteUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                handleSubmit();
              }
            }}
            placeholder="e.g. https://example.com"
            className="w-full rounded-2xl border border-[rgba(59,130,246,0.18)] bg-[rgba(20,20,40,0.72)] px-4 py-3 text-sm text-[var(--foreground)] outline-none transition placeholder:text-[var(--muted-foreground)] focus:border-[rgba(59,130,246,0.42)] focus:ring-4 focus:ring-[rgba(59,130,246,0.16)]"
          />
        </div>

        <button
          type="button"
          onClick={handleSubmit}
          disabled={loading}
          className="mt-7 inline-flex items-center justify-center rounded-2xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-5 py-3 text-sm font-semibold text-white shadow-[0_10px_24px_rgba(59,130,246,0.28)] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {loading ? "Generating..." : "Generate Report"}
        </button>
      </div>

      {error ? <p className="mt-3 text-sm font-medium text-rose-300">{error}</p> : null}

      <div className="mt-6 border-t border-[rgba(59,130,246,0.12)] pt-6">
        <div className="mb-4 flex items-center justify-center gap-3">
          <span className="h-px flex-1 bg-[rgba(59,130,246,0.12)]" />
          <span className="text-xs font-medium text-[var(--muted-foreground)]">What you&apos;ll get</span>
          <span className="h-px flex-1 bg-[rgba(59,130,246,0.12)]" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-[rgba(59,130,246,0.14)] bg-[rgba(20,20,40,0.58)] px-4 py-3">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(59,130,246,0.16)] text-[var(--accent)]">◫</div>
            <p className="text-sm font-semibold text-[var(--foreground)]">In-depth analysis</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Comprehensive insights across key dimensions</p>
          </div>
          <div className="rounded-2xl border border-[rgba(59,130,246,0.14)] bg-[rgba(20,20,40,0.58)] px-4 py-3">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(72,187,120,0.16)] text-[#9de79d]">▦</div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Source-backed</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Data and insights from credible sources</p>
          </div>
          <div className="rounded-2xl border border-[rgba(59,130,246,0.14)] bg-[rgba(20,20,40,0.58)] px-4 py-3">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(168,85,247,0.16)] text-[#d1b3ff]">⟡</div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Strategic insights</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Actionable takeaways for decision making</p>
          </div>
          <div className="rounded-2xl border border-[rgba(59,130,246,0.14)] bg-[rgba(20,20,40,0.58)] px-4 py-3">
            <div className="mb-2 flex h-8 w-8 items-center justify-center rounded-lg bg-[rgba(245,158,11,0.16)] text-[#f8c16a]">↓</div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Export ready</p>
            <p className="mt-1 text-xs leading-relaxed text-[var(--muted-foreground)]">Download as PDF or Markdown</p>
          </div>
        </div>
      </div>
    </div>
  );
}