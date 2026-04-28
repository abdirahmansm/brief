"use client";

import { MarketingCommand, MARKETING_COMMANDS, COMMAND_CATEGORIES } from "@/lib/marketingSkills";

interface CommandMenuProps {
  filter: string;
  onSelect: (command: MarketingCommand) => void;
  visible: boolean;
}

export default function CommandMenu({ filter, onSelect, visible }: CommandMenuProps) {
  if (!visible) return null;

  const search = filter.toLowerCase().replace("/market ", "").replace("/", "");

  const filtered = search
    ? MARKETING_COMMANDS.filter(
        (cmd) =>
          cmd.id.includes(search) ||
          cmd.label.toLowerCase().includes(search) ||
          cmd.description.toLowerCase().includes(search)
      )
    : MARKETING_COMMANDS;

  const grouped = Object.entries(COMMAND_CATEGORIES).map(([key, meta]) => ({
    ...meta,
    key,
    commands: filtered.filter((cmd) => cmd.category === key),
  })).filter((g) => g.commands.length > 0);

  if (grouped.length === 0) {
    return (
      <div className="absolute bottom-full left-0 right-0 z-50 mb-2 animate-fade-in rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.86)] p-4 shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md">
        <p className="text-center text-sm text-[var(--muted-foreground)]">No matching commands</p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 z-50 mb-2 max-h-80 animate-fade-in overflow-y-auto rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.86)] shadow-[0_12px_36px_rgba(0,0,0,0.45)] backdrop-blur-md">
      <div className="p-2">
        <div className="px-3 py-2 flex items-center gap-2">
          <span className="text-xs font-semibold uppercase tracking-wider text-[var(--muted-foreground)]">
            Marketing Commands
          </span>
          <span className="rounded-full bg-[rgba(139,92,246,0.14)] px-2 py-0.5 text-[10px] text-[var(--muted-foreground)]">
            {filtered.length}
          </span>
        </div>

        {grouped.map((group) => (
          <div key={group.key}>
            <div className="px-3 py-1.5">
              <span className="text-[11px] font-medium uppercase tracking-wider text-[var(--muted-foreground)]/75">
                {group.icon} {group.label}
              </span>
            </div>
            {group.commands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => onSelect(cmd)}
                className="group flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2.5 text-left hover:bg-[rgba(139,92,246,0.1)]"
              >
                <span className="text-lg flex-shrink-0">{cmd.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--accent)]">
                      {cmd.label}
                    </span>
                    <span className="font-mono text-[11px] text-[var(--muted-foreground)]">
                      {cmd.command}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-[var(--muted-foreground)]">
                    {cmd.description}
                  </p>
                </div>
                <svg
                  className="h-4 w-4 flex-shrink-0 text-[var(--muted-foreground)]/45 group-hover:text-[var(--accent)]"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="border-t border-[rgba(139,92,246,0.16)] px-3 py-2">
        <p className="text-center text-[11px] text-[var(--muted-foreground)]">
          Type <span className="font-mono text-[var(--accent)]">/market</span> + command name · Press Enter to select
        </p>
      </div>
    </div>
  );
}
