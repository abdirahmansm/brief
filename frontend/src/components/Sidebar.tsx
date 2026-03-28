"use client";

import { ResearchSession } from "@/types/research";
import BriefLogo from "@/components/BriefLogo";
import { useAuth } from "@/components/AuthProvider";

interface SidebarProps {
  sessions: ResearchSession[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onDeleteSession: (id: string) => Promise<void>;
  onNewResearch: () => void;
  onSignOut?: () => void;
}

export default function Sidebar({
  sessions,
  activeId,
  onSelect,
  onDeleteSession,
  onNewResearch,
  onSignOut,
}: SidebarProps) {
  const { user } = useAuth();

  return (
    <aside className="w-64 h-screen flex flex-col border-r border-border bg-card">
      {/* Logo */}
      <div className="flex items-center gap-2 px-5 py-5 border-b border-border">
        <BriefLogo size={22} />
        <span className="text-[15px] font-medium text-foreground tracking-[-0.01em]">brıef</span>
      </div>

      {/* New Research button */}
      <div className="px-3 pt-4 pb-2">
        <button
          onClick={onNewResearch}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-foreground hover:bg-surface border border-border cursor-pointer"
        >
          <svg
            className="w-4 h-4 text-muted"
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

      {/* Sessions list */}
      <div className="flex-1 overflow-y-auto px-3 py-2">
        <p className="text-[11px] font-medium text-muted uppercase tracking-wider px-3 mb-2">
          History
        </p>
        {sessions.length === 0 && (
          <p className="text-xs text-muted/60 px-3 py-2">No research yet</p>
        )}
        <div className="space-y-0.5">
          {sessions.map((session) => (
            <div
              key={session.id}
              className={`group flex items-center gap-1 rounded-xl ${
                session.id === activeId
                  ? "bg-accent/10"
                  : "hover:bg-surface"
              }`}
            >
              <button
                onClick={() => onSelect(session.id)}
                className={`min-w-0 flex-1 text-left px-3 py-2.5 rounded-xl text-sm truncate cursor-pointer ${
                  session.id === activeId
                    ? "text-accent font-medium"
                    : "text-muted group-hover:text-foreground"
                }`}
              >
                {session.marketing && (
                  <span className="mr-1.5">{session.marketing.icon}</span>
                )}
                {session.query}
              </button>
              <button
                onClick={async (event) => {
                  event.stopPropagation();
                  await onDeleteSession(session.id);
                }}
                className="mr-2 flex h-7 w-7 items-center justify-center rounded-md text-muted opacity-0 transition-opacity hover:bg-card hover:text-foreground group-hover:opacity-100"
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
        <div className="px-3 py-3 border-t border-border">
          <div className="flex items-center gap-2 px-3 py-2">
            <div className="w-7 h-7 rounded-full bg-accent/20 text-accent flex items-center justify-center text-xs font-medium flex-shrink-0">
              {(user.displayName?.[0] || user.email?.[0] || "U").toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm text-foreground truncate">
                {user.displayName || user.email}
              </p>
            </div>
            <button
              onClick={onSignOut}
              className="p-1.5 rounded-lg hover:bg-surface text-muted cursor-pointer"
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
