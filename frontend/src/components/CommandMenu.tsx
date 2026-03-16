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
      <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-card shadow-lg z-50 p-4 animate-fade-in">
        <p className="text-sm text-muted text-center">No matching commands</p>
      </div>
    );
  }

  return (
    <div className="absolute bottom-full left-0 right-0 mb-2 rounded-xl border border-border bg-card shadow-lg z-50 max-h-80 overflow-y-auto animate-fade-in">
      <div className="p-2">
        <div className="px-3 py-2 flex items-center gap-2">
          <span className="text-xs font-semibold text-muted uppercase tracking-wider">
            Marketing Commands
          </span>
          <span className="text-[10px] text-muted bg-surface rounded-full px-2 py-0.5">
            {filtered.length}
          </span>
        </div>

        {grouped.map((group) => (
          <div key={group.key}>
            <div className="px-3 py-1.5">
              <span className="text-[11px] font-medium text-muted/70 uppercase tracking-wider">
                {group.icon} {group.label}
              </span>
            </div>
            {group.commands.map((cmd) => (
              <button
                key={cmd.id}
                onClick={() => onSelect(cmd)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-surface flex items-center gap-3 group cursor-pointer"
              >
                <span className="text-lg flex-shrink-0">{cmd.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium text-foreground group-hover:text-accent">
                      {cmd.label}
                    </span>
                    <span className="text-[11px] text-muted font-mono">
                      {cmd.command}
                    </span>
                  </div>
                  <p className="text-xs text-muted truncate mt-0.5">
                    {cmd.description}
                  </p>
                </div>
                <svg
                  className="w-4 h-4 text-muted/40 group-hover:text-accent flex-shrink-0"
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

      <div className="border-t border-border px-3 py-2">
        <p className="text-[11px] text-muted text-center">
          Type <span className="font-mono text-accent">/market</span> + command name · Press Enter to select
        </p>
      </div>
    </div>
  );
}
