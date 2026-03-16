"use client";

import { useState, useRef, useEffect } from "react";
import CommandMenu from "./CommandMenu";
import {
  MarketingCommand,
  isTypingCommand,
  findCommand,
  extractCommandArg,
} from "@/lib/marketingSkills";

interface PromptInputProps {
  onSubmit: (query: string) => void;
  onMarketingCommand?: (command: MarketingCommand, arg: string) => void;
  disabled?: boolean;
}

export default function PromptInput({ onSubmit, onMarketingCommand, disabled }: PromptInputProps) {
  const [query, setQuery] = useState("");
  const [activeCommand, setActiveCommand] = useState<MarketingCommand | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [query]);

  const showCommands = isTypingCommand(query) && !activeCommand;

  const handleSelectCommand = (cmd: MarketingCommand) => {
    setActiveCommand(cmd);
    setQuery("");
    textareaRef.current?.focus();
  };

  const clearCommand = () => {
    setActiveCommand(null);
    setQuery("");
    textareaRef.current?.focus();
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (disabled) return;

    // If a command is active, dispatch as marketing command
    if (activeCommand && trimmed) {
      onMarketingCommand?.(activeCommand, trimmed);
      setActiveCommand(null);
      setQuery("");
      return;
    }

    // Check if the raw input is a slash command with argument
    if (trimmed.startsWith("/")) {
      const cmd = findCommand(trimmed);
      if (cmd) {
        const arg = extractCommandArg(trimmed, cmd);
        if (arg) {
          onMarketingCommand?.(cmd, arg);
          setQuery("");
          return;
        }
        // If no arg yet, select the command and wait for input
        handleSelectCommand(cmd);
        return;
      }
    }

    if (!trimmed) return;
    onSubmit(trimmed);
    setQuery("");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
    if (e.key === "Escape" && (showCommands || activeCommand)) {
      e.preventDefault();
      if (activeCommand) clearCommand();
    }
    if (e.key === "Backspace" && query === "" && activeCommand) {
      clearCommand();
    }
  };

  const placeholder = activeCommand
    ? `Enter ${activeCommand.inputType === "url" ? "URL" : activeCommand.inputType} — ${activeCommand.placeholder}`
    : "What market do you want to research? (type / for commands)";

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div className="relative">
        <CommandMenu
          filter={query}
          onSelect={handleSelectCommand}
          visible={showCommands}
        />

        <div className="rounded-2xl border border-border bg-card shadow-sm focus-within:border-accent/50 focus-within:shadow-md">
          {/* Active command badge */}
          {activeCommand && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-accent/10 text-accent text-sm font-medium">
                <span>{activeCommand.icon}</span>
                {activeCommand.label}
                <button
                  onClick={clearCommand}
                  className="ml-1 hover:text-foreground cursor-pointer"
                  aria-label="Clear command"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M18 6 6 18M6 6l12 12" />
                  </svg>
                </button>
              </span>
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={disabled}
            placeholder={placeholder}
            rows={1}
            className="w-full resize-none bg-transparent px-5 pt-4 pb-14 text-base text-foreground placeholder:text-muted outline-none disabled:opacity-50"
          />
          <div className="absolute bottom-3 right-3 flex items-center gap-2">
            <span className="text-xs text-muted mr-1 select-none hidden sm:inline">
              {activeCommand ? "Enter to run" : "Enter to send"}
            </span>
            <button
              onClick={handleSubmit}
              disabled={!query.trim() || disabled}
              className="flex items-center justify-center h-9 w-9 rounded-xl bg-accent text-white disabled:opacity-30 hover:bg-accent/90 cursor-pointer disabled:cursor-not-allowed"
              aria-label={activeCommand ? "Run marketing command" : "Submit research query"}
            >
              <svg
                width="18"
                height="18"
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
          </div>
        </div>
      </div>
    </div>
  );
}
