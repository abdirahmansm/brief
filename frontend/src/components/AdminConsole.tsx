"use client";

import { useEffect, useMemo, useState } from "react";
import { ResearchSession } from "@/types/research";
import {
  getPrimaryAdminEmail,
  isRegisteredAdminEmail,
  loadRegisteredAdminEmails,
  saveRegisteredAdminEmails,
} from "@/lib/adminAccess";

interface ProviderProbe {
  provider: "groq" | "openrouter" | "perplexity";
  configured: boolean;
  ok: boolean;
  status: number | null;
  note: string;
  checkedAt: string;
}

interface AdminInsightsResponse {
  checkedAt: string;
  modelConfig: Record<string, string>;
  probes: ProviderProbe[];
  note: string;
  error?: string;
}

interface AdminConsoleProps {
  userEmail?: string | null;
  sessions: ResearchSession[];
  onSignOut: () => Promise<void>;
}

const NON_ADMIN_MESSAGE =
  "Not an admin registered email unless abdirahmansm02@gmail.com adds more admin emails.";

function formatDateTime(input: Date | string | undefined): string {
  if (!input) return "-";
  const date = input instanceof Date ? input : new Date(input);
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

export default function AdminConsole({
  userEmail,
  sessions,
  onSignOut,
}: AdminConsoleProps) {
  const [registeredAdmins, setRegisteredAdmins] = useState<string[]>([]);
  const [adminEditorText, setAdminEditorText] = useState("");
  const [adminSaveMessage, setAdminSaveMessage] = useState("");
  const [insightsLoading, setInsightsLoading] = useState(false);
  const [insightsError, setInsightsError] = useState("");
  const [insights, setInsights] = useState<AdminInsightsResponse | null>(null);

  useEffect(() => {
    const loaded = loadRegisteredAdminEmails();
    setRegisteredAdmins(loaded);
    setAdminEditorText(loaded.join("\n"));
    setAdminSaveMessage("");
  }, []);

  const normalizedEmail = (userEmail || "").trim().toLowerCase();
  const isAdmin = isRegisteredAdminEmail(normalizedEmail, registeredAdmins);
  const isPrimaryAdmin = normalizedEmail === getPrimaryAdminEmail();

  const deepSessions = useMemo(
    () => sessions.filter((session) => session.marketing?.commandId === "deepresearch"),
    [sessions]
  );

  const now = Date.now();
  const deep24h = deepSessions.filter(
    (session) => now - session.createdAt.getTime() <= 24 * 60 * 60 * 1000
  );

  const cacheReplayCount = deepSessions.filter((session) =>
    (session.analysisLog || []).some((line) =>
      line.toLowerCase().includes("cache hit: reused deep research")
    )
  ).length;

  const failedCount = sessions.filter((session) =>
    Boolean(
      session.report?.sections.some(
        (section) => section.title.toLowerCase() === "error"
      )
    )
  ).length;

  const avgSources = deepSessions.length
    ? Math.round(
        deepSessions.reduce((acc, session) => acc + session.sources.length, 0) /
          deepSessions.length
      )
    : 0;

  const latestDeep = deepSessions
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];

  useEffect(() => {
    if (!isAdmin || !normalizedEmail) return;

    setInsightsLoading(true);
    setInsightsError("");

    void fetch("/api/admin/insights", {
      method: "GET",
      headers: {
        "x-admin-email": normalizedEmail,
        "x-admin-allowlist": registeredAdmins.join(","),
      },
    })
      .then(async (response) => {
        const payload = (await response.json()) as AdminInsightsResponse;
        if (!response.ok) {
          throw new Error(payload.error || "Failed to load admin insights.");
        }
        setInsights(payload);
      })
      .catch((error) => {
        setInsights(null);
        setInsightsError(
          error instanceof Error ? error.message : "Failed to load admin insights."
        );
      })
      .finally(() => setInsightsLoading(false));
  }, [isAdmin, normalizedEmail, registeredAdmins]);

  const saveAdmins = () => {
    const parsed = adminEditorText
      .split(/[\n,]/)
      .map((item) => item.trim())
      .filter(Boolean);

    const result = saveRegisteredAdminEmails(normalizedEmail, parsed);
    if (!result.ok) {
      setAdminSaveMessage(result.error || NON_ADMIN_MESSAGE);
      return;
    }

    const saved = result.saved || [];
    setRegisteredAdmins(saved);
    setAdminEditorText(saved.join("\n"));
    setAdminSaveMessage(`Saved ${saved.length} admin email(s).`);
  };

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-8">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-[var(--foreground)]">Admin Console</h1>
          <p className="text-sm text-[var(--muted-foreground)]">Owner insights for provider health, app risk, and deep research quality.</p>
        </div>
        <button
          type="button"
          onClick={() => void onSignOut()}
          className="rounded-full border border-[rgba(139,92,246,0.2)] bg-[rgba(139,92,246,0.08)] px-4 py-2 text-sm font-semibold text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.14)]"
        >
          Sign out
        </button>
      </div>

      {!isAdmin ? (
        <div className="rounded-2xl border border-red-500/25 bg-red-950/30 p-6">
          <p className="text-sm font-semibold text-red-300">Access denied</p>
          <p className="mt-2 text-sm text-red-200/90">{NON_ADMIN_MESSAGE}</p>
          <p className="mt-3 text-xs text-red-200/80">Signed in as: {userEmail || "unknown"}</p>
        </div>
      ) : (
        <div className="space-y-5">
          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.5)] p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Total Sessions</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{sessions.length}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.5)] p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Deep Reports (24h)</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{deep24h.length}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.5)] p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Cache Replays (24h rule)</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{cacheReplayCount}</p>
            </div>
            <div className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.5)] p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Failed Runs</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--foreground)]">{failedCount}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.48)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">API and Model Health</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Provider status and model routing checks. Exact billing credits remain in provider billing dashboards.</p>

            {insightsLoading ? (
              <p className="mt-3 text-sm text-[var(--muted-foreground)]">Checking providers...</p>
            ) : insightsError ? (
              <p className="mt-3 text-sm text-red-400">{insightsError}</p>
            ) : insights ? (
              <>
                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {insights.probes.map((probe) => (
                    <div key={probe.provider} className="rounded-xl border border-[rgba(139,92,246,0.14)] bg-[rgba(10,10,26,0.7)] p-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-semibold uppercase tracking-wide text-[var(--accent)]">{probe.provider}</p>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${probe.ok ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`}>
                          {probe.ok ? "OK" : "Attention"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-[var(--muted-foreground)]">Configured: {probe.configured ? "Yes" : "No"}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">Status: {probe.status ?? "-"}</p>
                      <p className="mt-1 text-xs text-[var(--muted-foreground)]">{probe.note}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-4 rounded-xl border border-[rgba(139,92,246,0.12)] bg-[rgba(10,10,26,0.7)] p-3">
                  <p className="text-xs font-semibold text-[var(--foreground)]">Model configuration</p>
                  <div className="mt-2 grid gap-1 text-xs text-[var(--muted-foreground)]">
                    {Object.entries(insights.modelConfig).map(([key, value]) => (
                      <p key={key}><span className="text-[var(--foreground)]">{key}:</span> {value}</p>
                    ))}
                  </div>
                  <p className="mt-3 text-[11px] text-[var(--muted-foreground)]">Last checked: {formatDateTime(insights.checkedAt)}</p>
                </div>
              </>
            ) : null}
          </section>

          <section className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.48)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">App Critical Insights</p>
            <div className="mt-2 grid gap-1 text-xs text-[var(--muted-foreground)]">
              <p><span className="text-[var(--foreground)]">Average sources per deep report:</span> {avgSources}</p>
              <p><span className="text-[var(--foreground)]">Latest deep report:</span> {latestDeep ? latestDeep.report?.query || latestDeep.query : "-"}</p>
              <p><span className="text-[var(--foreground)]">Latest deep report time:</span> {latestDeep ? formatDateTime(latestDeep.createdAt) : "-"}</p>
              <p><span className="text-[var(--foreground)]">Signed in as:</span> {userEmail || "unknown"}</p>
            </div>
          </section>

          <section className="rounded-2xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.48)] p-4">
            <p className="text-sm font-semibold text-[var(--foreground)]">Admin Access Control</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">Primary owner email: {getPrimaryAdminEmail()}</p>

            {isPrimaryAdmin ? (
              <>
                <label htmlFor="admin-email-editor" className="mt-3 block text-xs text-[var(--muted-foreground)]">Add one email per line (or comma-separated).</label>
                <textarea
                  id="admin-email-editor"
                  value={adminEditorText}
                  onChange={(event) => setAdminEditorText(event.target.value)}
                  title="Admin email allowlist"
                  placeholder="abdirahmansm02@gmail.com"
                  className="mt-2 h-28 w-full rounded-xl border border-[rgba(139,92,246,0.2)] bg-[rgba(10,10,26,0.7)] px-3 py-2 text-xs text-[var(--foreground)] outline-none focus:border-[var(--accent)]"
                />
                <div className="mt-2 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={saveAdmins}
                    className="rounded-lg bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Save admin emails
                  </button>
                  {adminSaveMessage ? (
                    <p className="text-xs text-[var(--muted-foreground)]">{adminSaveMessage}</p>
                  ) : null}
                </div>
              </>
            ) : (
              <p className="mt-3 text-xs text-[var(--muted-foreground)]">Only {getPrimaryAdminEmail()} can edit the admin list.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
