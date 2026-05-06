"use client";

import { ResearchSession } from "@/types/research";
import LogoMark from "@/components/LogoMark";
import { useAuth } from "@/components/AuthProvider";
import { formatMarketingTarget } from "@/lib/marketingDisplay";

interface SidebarProps {
  sessions: ResearchSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDeleteSession: (id: string) => Promise<void>;
  onNewResearch: () => void;
  onHome?: () => void;
  onSignOut?: () => void;
}

export default function Sidebar({
  sessions,
  activeId,
  onSelect,
  onDeleteSession,
  onNewResearch,
  onHome,
  onSignOut,
}: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside className="flex h-screen w-[248px] flex-col border-r border-[rgba(139,92,246,0.12)] bg-[linear-gradient(180deg,rgba(20,20,40,0.9)_0%,rgba(10,10,26,0.98)_100%)] text-white">
      {/* Brand */}
      <div className="relative flex items-center gap-1.5 border-b border-[rgba(139,92,246,0.12)] px-3 py-3 pr-4">
        <LogoMark />
        <span className="text-[16px] font-semibold tracking-[-0.01em] text-white">Brief</span>
        <span className="ml-auto text-[var(--muted-foreground)]">
          <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </div>

      {/* New Research button */}
      <div className="px-3 pt-3 pb-2">
        <button
          onClick={onNewResearch}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-[rgba(196,164,255,0.35)] bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] px-3 py-2.5 text-sm font-semibold text-[var(--accent-foreground)] shadow-[0_10px_24px_rgba(139,92,246,0.26)] hover:shadow-[0_0_20px_rgba(139,92,246,0.45)]"
        >
          <svg
            className="h-4 w-4 text-white"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 5v14M5 12h14" />
          </svg>
          New Research
        </button>
      </div>

      <div className="px-3 pb-2">
        <button
          onClick={onHome || onNewResearch}
          className="flex w-full cursor-pointer items-center gap-2 rounded-lg px-3 py-2 text-sm text-[var(--foreground)] hover:bg-[rgba(139,92,246,0.08)] hover:text-white"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="m3 10 9-7 9 7" />
            <path d="M9 22V12h6v10" />
          </svg>
          Home
        </button>
      </div>

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-[11px] font-medium text-[#7f97b0] uppercase tracking-wider px-3 mb-2">
          Recent Research
        </p>
        {sessions.length === 0 && (
          <p className="text-xs text-[#7f97b0] px-3 py-2">No research yet</p>
        )}
        <div className="space-y-0.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-xl ${
                session.id === activeId
                  ? "bg-[rgba(139,92,246,0.12)]"
                  : "hover:bg-[rgba(139,92,246,0.06)]"
              }`}
            >
              <button
                onClick={() => onSelect(session.id)}
                className={`min-w-0 flex-1 text-left px-3 py-2.5 rounded-xl text-sm truncate cursor-pointer ${
                  session.id === activeId
                    ? "text-[var(--accent)] font-medium"
                    : "text-[var(--muted-foreground)] group-hover:text-white"
                }`}
              >
                {session.marketing && (
                  <span className="mr-1.5">{session.marketing.icon}</span>
                )}
                {session.marketing ? formatMarketingTarget(session.marketing) : session.query}
              </button>
              <button
                onClick={async (event) => {
                  event.stopPropagation();
                  await onDeleteSession(session.id);
                }}
                className="mr-2 flex h-7 w-7 items-center justify-center rounded-md text-[var(--muted-foreground)] opacity-0 transition-opacity hover:bg-[rgba(139,92,246,0.1)] hover:text-white group-hover:opacity-100"
                aria-label="Delete research session"
                title="Delete session"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M3 6h18" />
                  <path d="M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2" />
                  <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                  <path d="M10 11v6" />
                  <path d="M14 11v6" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* User & sign out */}
      {user && (
        <div className="border-t border-[rgba(139,92,246,0.12)] px-3 py-3">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-[rgba(139,92,246,0.18)] text-xs font-medium text-[var(--accent)]">
              {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-white truncate">
                {user.displayName || user.email}
              </p>
            </div>
            <span className="text-[var(--muted-foreground)]">
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </span>
            <button
              onClick={onSignOut}
              className="cursor-pointer rounded-lg p-1.5 text-[var(--muted-foreground)] hover:bg-[rgba(139,92,246,0.08)]"
              title="Sign out"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                <polyline points="16 17 21 12 16 7" />
                <line x1="21" y1="12" x2="9" y2="12" />
              </svg>
            </button>
          </div>
        </div>
      )}
    </aside>
  );
}
