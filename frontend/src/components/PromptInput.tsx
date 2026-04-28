"use client";

import { useState, useRef, useEffect } from "react";
import CommandMenu from "./CommandMenu";
import {
  MarketingCommand,
  MARKETING_COMMANDS,
  isTypingCommand,
  findCommand,
  extractCommandArg,
} from "@/lib/marketingSkills";

interface PromptInputProps {
  onSubmit: (
    query: string,
    mode: "simple" | "deep",
    options?: { continueInSkill?: boolean }
  ) => void;
  onMarketingCommand?: (command: MarketingCommand, arg: string) => void;
  disabled?: boolean;
  canContinueInSkill?: boolean;
  lastCommandLabel?: string;
}

type InputMode = "prompt" | "form";

interface GuidedFormState {
  url: string;
  market: string;
  audience: string;
  painPoint: string;
  clientName: string;
  engagement: string;
  objective: string;
  productName: string;
  productAudience: string;
  productCategory: string;
  extraContext: string;
}

const EMPTY_FORM: GuidedFormState = {
  url: "",
  market: "",
  audience: "",
  painPoint: "",
  clientName: "",
  engagement: "",
  objective: "",
  productName: "",
  productAudience: "",
  productCategory: "",
  extraContext: "",
};

function isValidUrlInput(value: string): boolean {
  const normalized = normalizeUrlInput(value);
  try {
    const parsed = new URL(normalized);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
}

function normalizeUrlInput(value: string): string {
  const trimmed = value.trim();
  const unwrapped = trimmed
    .replace(/^<|>$/g, "")
    .replace(/^["'`\u201C\u201D\u2018\u2019]+|["'`\u201C\u201D\u2018\u2019]+$/g, "")
    .replace(/[\s\u200B\u200C\u200D\uFEFF]+$/g, "");

  if (/^https?:\/\//i.test(unwrapped)) {
    return unwrapped;
  }

  // Accept bare domains in guided forms and normalize them.
  if (/^[a-z0-9.-]+\.[a-z]{2,}(\/.*)?$/i.test(unwrapped)) {
    return `https://${unwrapped}`;
  }

  return unwrapped;
}

function looksLikeGreetingOrFiller(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;
  return /^(hi|hello|hey|yo|sup|thanks|thank you|how are you|ok|okay|test)\b/.test(normalized);
}

function looksLikeGibberish(value: string): boolean {
  const normalized = value.trim().toLowerCase();
  if (!normalized) return true;

  // Random token-like strings without separators are usually unclear research prompts.
  if (/^[a-z0-9]{7,}$/.test(normalized) && !/[aeiou]/.test(normalized)) return true;
  if (/^[a-z0-9]{10,}$/.test(normalized) && !/[\s.:/?-]/.test(normalized)) return true;

  return false;
}

function isSpecificResearchPrompt(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (looksLikeGreetingOrFiller(trimmed)) return false;
  if (looksLikeGibberish(trimmed)) return false;

  const words = trimmed.split(/\s+/).filter(Boolean);
  const meaningfulWords = words.filter((w) => w.replace(/[^a-z0-9]/gi, "").length >= 3);

  if (meaningfulWords.length < 3) return false;
  if (trimmed.length < 16) return false;

  return true;
}

function validateCommandArg(command: MarketingCommand, arg: string): string | null {
  const trimmed = arg.trim();
  if (!trimmed) {
    return `Please provide a ${command.inputType} for ${command.command}.`;
  }

  if (command.inputType === "url" && !isValidUrlInput(trimmed)) {
    return `Please enter a valid URL for ${command.command} (example: https://example.com).`;
  }

  if (command.inputType !== "url" && !isSpecificResearchPrompt(trimmed)) {
    return `Please be more specific for ${command.command} (include market, audience, or problem context).`;
  }

  return null;
}

function composeGuidedArg(command: MarketingCommand, form: GuidedFormState): string {
  const context = form.extraContext.trim();

  if (command.inputType === "url") {
    return normalizeUrlInput(form.url);
  }

  if (command.inputType === "topic") {
    const market = form.market.trim();
    const audience = form.audience.trim();
    const painPoint = form.painPoint.trim();
    const core = [market, audience ? `for ${audience}` : "", painPoint ? `with ${painPoint}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim();
    return [core, context].filter(Boolean).join(". ");
  }

  if (command.inputType === "client") {
    const clientName = form.clientName.trim();
    const engagement = form.engagement.trim();
    const objective = form.objective.trim();
    const core = [clientName, engagement ? `- ${engagement}` : "", objective ? `focused on ${objective}` : ""]
      .filter(Boolean)
      .join(" ")
      .trim();
    return [core, context].filter(Boolean).join(". ");
  }

  const productName = form.productName.trim();
  const audience = form.productAudience.trim();
  const category = form.productCategory.trim();
  const core = [productName, category ? `(${category})` : "", audience ? `for ${audience}` : ""]
    .filter(Boolean)
    .join(" ")
    .trim();
  return [core, context].filter(Boolean).join(". ");
}

function commandInputLabel(command: MarketingCommand): string {
  if (command.inputType === "url") return "URL";
  if (command.inputType === "topic") return "Topic";
  if (command.inputType === "client") return "Client brief";
  return "Product brief";
}

export default function PromptInput({
  onSubmit,
  onMarketingCommand,
  disabled,
  canContinueInSkill = false,
  lastCommandLabel,
}: PromptInputProps) {
  const [query, setQuery] = useState("");
  const [activeCommand, setActiveCommand] = useState<MarketingCommand | null>(null);
  const [mode, setMode] = useState<"simple" | "deep">(() => {
    if (typeof window === "undefined") return "simple";
    const savedMode = window.localStorage.getItem("brief-input-mode");
    return savedMode === "deep" ? "deep" : "simple";
  });
  const [selectedSkillId, setSelectedSkillId] = useState<string>(() => {
    if (typeof window === "undefined") return MARKETING_COMMANDS[0]?.id || "audit";
    return window.localStorage.getItem("brief-selected-skill") || MARKETING_COMMANDS[0]?.id || "audit";
  });
  const [inputMode, setInputMode] = useState<InputMode>(() => {
    if (typeof window === "undefined") return "prompt";
    const savedMode = window.localStorage.getItem("brief-input-mode");
    const savedSkill = window.localStorage.getItem("brief-selected-skill") || MARKETING_COMMANDS[0]?.id || "audit";
    return savedMode === "deep" && Boolean(savedSkill) ? "form" : "prompt";
  });
  const [guidedForm, setGuidedForm] = useState<GuidedFormState>(EMPTY_FORM);
  const [deepHint, setDeepHint] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const quickActionIds = ["audit", "quick", "competitors", "sizing"];
  const quickActions = quickActionIds
    .map((id) => MARKETING_COMMANDS.find((cmd) => cmd.id === id))
    .filter((cmd): cmd is MarketingCommand => Boolean(cmd));

  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("brief-input-mode", mode);
  }, [mode]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    window.localStorage.setItem("brief-selected-skill", selectedSkillId);
  }, [selectedSkillId]);

  const selectedCommand = MARKETING_COMMANDS.find((cmd) => cmd.id === selectedSkillId) ?? MARKETING_COMMANDS[0] ?? null;
  const guidedCommand = activeCommand ?? selectedCommand;
  const effectiveInputMode: InputMode =
    mode === "deep" && canContinueInSkill && inputMode === "prompt" ? "prompt" : "form";

  // Auto-resize textarea
  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [query]);

  const showCommands = mode === "deep" && effectiveInputMode === "prompt" && isTypingCommand(query) && !activeCommand;

  const guidedArg = guidedCommand ? composeGuidedArg(guidedCommand, guidedForm) : "";
  const guidedValidationError =
    guidedCommand ? validateCommandArg(guidedCommand, guidedArg) : null;

  const handleSelectCommand = (cmd: MarketingCommand) => {
    setActiveCommand(cmd);
    setQuery("");
    setInputMode("form");
    setGuidedForm(EMPTY_FORM);
    textareaRef.current?.focus();
  };

  const clearCommand = () => {
    setActiveCommand(null);
    setQuery("");
    setGuidedForm(EMPTY_FORM);
    if (mode === "deep") {
      setInputMode("form");
    } else {
      setInputMode("prompt");
    }
    textareaRef.current?.focus();
  };

  const updateFormField = (field: keyof GuidedFormState, value: string) => {
    setGuidedForm((prev) => ({ ...prev, [field]: value }));
    if (deepHint) setDeepHint("");
  };

  const handleSubmit = () => {
    const trimmed = query.trim();
    if (disabled) return;
    setDeepHint("");

    // If a command is active, dispatch as marketing command
    if (activeCommand) {
      const activeArg = inputMode === "form" ? composeGuidedArg(activeCommand, guidedForm) : trimmed;
      const validationError = validateCommandArg(activeCommand, activeArg);
      if (validationError) {
        setDeepHint(validationError);
        return;
      }

      onMarketingCommand?.(activeCommand, activeArg);
      setActiveCommand(null);
      setQuery("");
      setGuidedForm(EMPTY_FORM);
      return;
    }

    // Check if the raw input is a slash command with argument
    if (trimmed.startsWith("/")) {
      const cmd = findCommand(trimmed);
      if (cmd) {
        const arg = extractCommandArg(trimmed, cmd);
        if (arg) {
          const validationError = validateCommandArg(cmd, arg);
          if (validationError) {
            setDeepHint(validationError);
            return;
          }

          onMarketingCommand?.(cmd, arg);
          setQuery("");
          return;
        }
        // If no arg yet, select the command and wait for input
        handleSelectCommand(cmd);
        return;
      }
    }

    // Simple mode is form-gated only (no free prompt).
    if (mode === "simple") {
      if (!selectedCommand) return;

      const selectedArg = composeGuidedArg(selectedCommand, guidedForm);
      const validationError = validateCommandArg(selectedCommand, selectedArg);
      if (validationError) {
        setDeepHint(validationError);
        return;
      }

      onMarketingCommand?.(selectedCommand, selectedArg);
      setQuery("");
      setGuidedForm(EMPTY_FORM);
      return;
    }

    if (mode === "deep") {
      if (effectiveInputMode === "form") {
        if (!selectedCommand) return;

        const selectedArg = composeGuidedArg(selectedCommand, guidedForm);
        const validationError = validateCommandArg(selectedCommand, selectedArg);
        if (validationError) {
          setDeepHint(validationError);
          return;
        }

        onMarketingCommand?.(selectedCommand, selectedArg);
        setQuery("");
        setGuidedForm(EMPTY_FORM);
        return;
      }

      if (!trimmed) return;

      // Seamless continuation: once a command context exists, deep prompt mode
      // refines and extends that context without requiring a dedicated skill toggle.
      if (canContinueInSkill) {
        onSubmit(trimmed, "deep", { continueInSkill: true });
        setQuery("");
        return;
      }

      setDeepHint("Run one command using Guided form to unlock Free prompt refinement.");
      return;
    }

    onSubmit(trimmed, mode, { continueInSkill: false });
    setQuery("");
  };

  const runQuickAction = (command: MarketingCommand) => {
    if (disabled) return;
    setDeepHint("");
    const arg = query.trim() || command.placeholder;
    onMarketingCommand?.(command, arg);
    setQuery("");
    setMode("deep");
    setSelectedSkillId(command.id);
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
    : mode === "deep"
      ? canContinueInSkill && effectiveInputMode === "prompt"
        ? `Refining ${lastCommandLabel || "your last command"}. Try: summarize in 5-10 bullets, expand section 2, or make it investor-ready.`
        : "Deep mode: run one guided command first, then refine via Free prompt"
      : "Simple mode: complete guided form and run";

  const submitDisabled =
    disabled ||
    (mode === "simple"
      ? Boolean(guidedValidationError)
      : effectiveInputMode === "form"
        ? Boolean(guidedValidationError)
        : !query.trim());

  return (
    <div className="w-full max-w-3xl mx-auto">
      <div className="relative">
        <CommandMenu
          filter={query}
          onSelect={handleSelectCommand}
          visible={showCommands}
        />

        <div className="rounded-3xl border border-[#2a2f36] bg-[#151922] shadow-[0_10px_30px_rgba(0,0,0,0.35)] focus-within:border-[#2f89ff]">
          {/* Active command badge */}
          {activeCommand && (
            <div className="flex items-center gap-2 px-4 pt-3 pb-0">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#1f2a3a] text-[#82beff] text-sm font-medium">
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

          {guidedCommand && (
            <div className="px-4 pt-3 pb-0 flex items-center gap-2">
              {mode === "deep" && canContinueInSkill ? (
                <div className="inline-flex rounded-xl border border-[#2a3340] bg-[#121720] p-0.5">
                  <button
                    onClick={() => setInputMode("form")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      effectiveInputMode === "form" ? "bg-[#233247] text-[#9ed0ff]" : "text-[#95a3b5] hover:text-white"
                    }`}
                    type="button"
                  >
                    Guided form
                  </button>
                  <button
                    onClick={() => setInputMode("prompt")}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                      effectiveInputMode === "prompt" ? "bg-[#233247] text-[#9ed0ff]" : "text-[#95a3b5] hover:text-white"
                    }`}
                    type="button"
                  >
                    Free prompt
                  </button>
                </div>
              ) : (
                <span className="inline-flex items-center rounded-lg border border-[#2a3340] bg-[#121720] px-3 py-1.5 text-xs text-[#9ed0ff]">
                  Guided form
                </span>
              )}
              <span className="text-xs text-[#8fa4bd]">
                Required input: {commandInputLabel(guidedCommand)}
              </span>
            </div>
          )}

          {guidedCommand && effectiveInputMode === "form" && (
            <div className="px-4 pt-3 pb-1">
              <div className="rounded-2xl border border-[#232b37] bg-[#10151d] p-3 space-y-3">
                {guidedCommand.inputType === "url" && (
                  <label className="block">
                    <span className="mb-1 block text-xs text-[#93a0b2]">Website URL</span>
                    <input
                      value={guidedForm.url}
                      onChange={(e) => updateFormField("url", e.target.value)}
                      placeholder={guidedCommand.placeholder}
                      className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                    />
                  </label>
                )}

                {guidedCommand.inputType === "topic" && (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs text-[#93a0b2]">Market or domain</span>
                        <input
                          value={guidedForm.market}
                          onChange={(e) => updateFormField("market", e.target.value)}
                          placeholder="Example: Workflow automation"
                          className="w-full rounded-lg border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-[#93a0b2]">Target audience</span>
                        <input
                          value={guidedForm.audience}
                          onChange={(e) => updateFormField("audience", e.target.value)}
                          placeholder="Example: Legal operations teams"
                          className="w-full rounded-lg border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs text-[#93a0b2]">Pain point or objective</span>
                      <input
                        value={guidedForm.painPoint}
                        onChange={(e) => updateFormField("painPoint", e.target.value)}
                        placeholder="Example: Compliance bottlenecks"
                        className="w-full rounded-lg border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
                      />
                    </label>
                  </>
                )}

                {guidedCommand.inputType === "client" && (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs text-[#93a0b2]">Client name</span>
                        <input
                          value={guidedForm.clientName}
                          onChange={(e) => updateFormField("clientName", e.target.value)}
                          placeholder="Example: Acme Corp"
                          className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-[#93a0b2]">Engagement type</span>
                        <input
                          value={guidedForm.engagement}
                          onChange={(e) => updateFormField("engagement", e.target.value)}
                          placeholder="Example: E-commerce redesign"
                          className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs text-[#93a0b2]">Primary objective</span>
                      <input
                        value={guidedForm.objective}
                        onChange={(e) => updateFormField("objective", e.target.value)}
                        placeholder="Example: Increase qualified pipeline"
                        className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                      />
                    </label>
                  </>
                )}

                {guidedCommand.inputType === "product" && (
                  <>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      <label className="block">
                        <span className="mb-1 block text-xs text-[#93a0b2]">Product name</span>
                        <input
                          value={guidedForm.productName}
                          onChange={(e) => updateFormField("productName", e.target.value)}
                          placeholder="Example: InsightPilot"
                          className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                        />
                      </label>
                      <label className="block">
                        <span className="mb-1 block text-xs text-[#93a0b2]">Category or type</span>
                        <input
                          value={guidedForm.productCategory}
                          onChange={(e) => updateFormField("productCategory", e.target.value)}
                          placeholder="Example: AI workflow platform"
                          className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                        />
                      </label>
                    </div>
                    <label className="block">
                      <span className="mb-1 block text-xs text-[#93a0b2]">Primary audience</span>
                      <input
                        value={guidedForm.productAudience}
                        onChange={(e) => updateFormField("productAudience", e.target.value)}
                        placeholder="Example: Mid-market operations teams"
                        className="w-full rounded-lg border border-[#2a3340] bg-[#0f141c] px-3 py-2 text-sm text-white outline-none focus:border-[#2f89ff]"
                      />
                    </label>
                  </>
                )}

                {guidedCommand.inputType !== "url" && (
                  <label className="block">
                    <span className="mb-1 block text-xs text-[#93a0b2]">Extra context (optional)</span>
                    <input
                      value={guidedForm.extraContext}
                      onChange={(e) => updateFormField("extraContext", e.target.value)}
                      placeholder="Add region, segment, constraints, or timeline"
                      className="w-full rounded-lg border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-2 text-sm text-white outline-none focus:border-[var(--accent)]"
                    />
                  </label>
                )}

                <p className="text-[11px] text-[#7f91a7]">
                  Example input target: {guidedCommand.placeholder}
                </p>
              </div>
            </div>
          )}

          {mode === "deep" && effectiveInputMode === "prompt" && (
            <textarea
              ref={textareaRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={disabled}
              placeholder={placeholder}
              rows={1}
              className="w-full resize-none bg-transparent px-5 pt-4 pb-3 text-base text-white placeholder:text-[#7b8797] outline-none disabled:opacity-50"
            />
          )}

              <div className="flex flex-wrap items-center gap-2 border-t border-[rgba(139,92,246,0.12)] px-4 py-3">
            <div className="inline-flex rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] p-0.5">
              <button
                onClick={() => {
                  setMode("simple");
                  setInputMode("prompt");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  mode === "simple" ? "bg-[rgba(139,92,246,0.12)] text-[var(--foreground)]" : "text-[var(--muted-foreground)] hover:text-white"
                }`}
              >
                Simple
              </button>
              <button
                onClick={() => {
                  setMode("deep");
                  setInputMode("form");
                }}
                className={`rounded-lg px-3 py-1.5 text-xs font-medium cursor-pointer ${
                  mode === "deep" ? "bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] text-white" : "text-[var(--muted-foreground)] hover:text-white"
                }`}
              >
                Deep
              </button>
            </div>

            <div className="relative">
              <select
                value={selectedSkillId}
                onChange={(e) => {
                  const nextSkillId = e.target.value;
                  setSelectedSkillId(nextSkillId);
                  setInputMode("form");
                  setGuidedForm(EMPTY_FORM);
                }}
                className="appearance-none rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 pr-8 text-xs text-[var(--foreground)] outline-none"
                aria-label="Select skill"
              >
                {MARKETING_COMMANDS.map((cmd) => (
                  <option key={cmd.id} value={cmd.id}>
                    Skill: {cmd.label}
                  </option>
                ))}
              </select>
              <svg className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--muted-foreground)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="m6 9 6 6 6-6" />
              </svg>
            </div>

            {mode === "deep" && canContinueInSkill && (
              <div className="relative">
                <span className="inline-flex items-center rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(139,92,246,0.08)] px-3 py-1.5 text-xs text-[var(--accent)]">
                  Context: {lastCommandLabel || "Active command"}
                </span>
              </div>
            )}

            <button
              className="cursor-pointer inline-flex items-center gap-1 rounded-xl border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 text-xs text-[var(--muted-foreground)] hover:text-white"
              type="button"
              aria-label="Filter"
            >
              <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 6h18" />
                <path d="M7 12h10" />
                <path d="M10 18h4" />
              </svg>
              Filter
            </button>

            <div className="ml-auto flex items-center gap-2">
              <span className="mr-1 hidden select-none text-xs text-[var(--muted-foreground)] sm:inline">
                {mode === "simple" || effectiveInputMode === "form" ? "Enter to run" : "Enter to refine"}
              </span>
              <button
                onClick={handleSubmit}
                disabled={submitDisabled}
                className="flex h-9 w-9 cursor-pointer items-center justify-center rounded-xl bg-[linear-gradient(135deg,oklch(0.55_0.24_262),oklch(0.50_0.22_262))] text-white disabled:cursor-not-allowed disabled:opacity-30"
                aria-label={mode === "simple" || effectiveInputMode === "form" ? "Run marketing command" : "Submit refinement"}
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

        {deepHint && (
          <p className="mt-2 px-1 text-xs text-[var(--accent)]">{deepHint}</p>
        )}

        {!deepHint && guidedValidationError && (
          <p className="mt-2 px-1 text-xs text-[var(--accent)]">{guidedValidationError}</p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {quickActions.map((command) => (
            <button
              key={command.id}
              onClick={() => runQuickAction(command)}
              disabled={disabled}
              className="cursor-pointer inline-flex items-center gap-1.5 rounded-full border border-[rgba(139,92,246,0.16)] bg-[rgba(20,20,40,0.55)] px-3 py-1.5 text-xs text-[var(--foreground)] hover:border-[rgba(139,92,246,0.5)] hover:bg-[rgba(139,92,246,0.08)] hover:text-white"
            >
              <span>{command.icon}</span>
              {command.command}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
