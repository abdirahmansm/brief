# Brief Mail Deep Research Report Book

## Purpose

This document explains the Mail deep research feature end-to-end: why it exists, what user problem it solves, what inputs it consumes, what outputs it produces, which skills and backend layers it uses, and how the full system is orchestrated from the UI down to the final report artifacts.

The goal is to give you a technical report book you can expand for presentation, viva, or professor-level questioning. It focuses on the Mail workflow only, not the full product.

---

## 1. Executive Summary

Mail is Brief's founder-focused, recurring intelligence workflow. It turns a user-defined market profile into a repeatable deep research brief that can be reviewed like a morning executive update.

The feature solves a simple but important problem: founders do not want to re-prompt the system every day, repeat the same setup, or sift through raw search results. They want a stable briefing workflow that remembers the niche, re-runs the right research command, and presents the output as a readable decision asset.

At the architecture level, Mail is not a separate research engine. It is a product layer built on top of the deep research pipeline. The UI collects the profile, the frontend hooks route the request into the research system, the server pipeline gathers sources and composes the report, and the report artifacts layer turns the result into downloadable formats.

---

## 2. What Mail Is Designed To Do

Mail is meant to behave like a premium founder intelligence desk.

It helps users:

- define a repeatable niche and market context once
- receive recurring deep research output without rebuilding the prompt every time
- store and revisit reports for the same profile
- download the output as markdown, HTML, or PDF
- preserve source links so the report can act as a gateway to deeper research

The output is intentionally not chat-like. It is designed to feel like a structured executive brief that can be skimmed quickly and used for decisions.

---

## 3. The User Problem It Solves

The Mail workflow solves five common problems for founders and operators.

### 3.1 Repeated manual prompting

Without Mail, the user must restate the market, niche, geography, competitors, and decision goals every time. That is slow and inconsistent.

Mail stores a profile and converts it into a reusable research input.

### 3.2 High noise and low decision density

Raw market research often produces too many sources and not enough decisions. Mail is built to filter noise and surface only the most strategic signals.

### 3.3 Lack of continuity

Users need a recurring morning briefing rather than a one-off answer. Mail keeps profile context and session history so the result can be reviewed later.

### 3.4 Poor report readability

Founders do not want a wall of text. They need something skimmable, high signal, and action-oriented.

### 3.5 Access to deeper evidence

The brief should be concise, but it must still preserve source links for users who want to verify or drill down.

---

## 4. Mail Workflow Overview

The Mail flow is a staged pipeline.

1. The user opens Mail in the main dashboard.
2. The user fills out the Mail setup form: market, niche focus, geography, business context, competitors, signal priorities, decision goals, and noise filters.
3. The frontend normalizes missing fields with broad fallback language such as "all related" or "all major competitors".
4. The setup is stored in local state and persisted to browser localStorage.
5. The Mail workflow builds a deep research prompt from that profile.
6. The prompt is sent through `startMarketingCommand()` using the `deepresearch` command.
7. The backend pipeline performs research orchestration, source collection, validation, and report composition.
8. The final report is stored in the session list and filtered back into the Mail inbox UI.
9. The user can open the report entry or download it as `.md`, `.html`, or `.pdf`.

This makes Mail behave like a personal research inbox rather than a generic chat thread.

---

## 5. Frontend Entry Point

The Mail experience starts in [frontend/src/app/app/page.tsx](frontend/src/app/app/page.tsx).

This file is responsible for:

- opening the Mail panel
- rendering the setup form
- storing Mail profile state
- scheduling reruns
- selecting Mail-related sessions
- presenting report downloads

The key helper is `buildMailResearchInput(profile)`, which converts the saved Mail profile into the structured prompt sent to the deep research engine.

### What the input contains

The generated prompt includes:

- Profile ID
- Market
- Niche focus
- Geography
- Business context
- Competitors to monitor
- Signal priorities
- Decision goals
- Noise filters

Then it appends the research instructions that the backend should produce:

- a fact-checked deep market briefing
- verified / probable / uncertain classification
- strategic implications
- concrete actions for this week, 30 days, and quarter

This is important because Mail is not just a UI form. It is the source of the research specification.

---

## 6. Mail Setup Behavior

The Mail setup UX is intentionally forgiving.

If the user leaves fields blank, the interface fills them with broad defaults. For example:

- niche focus becomes a broad "all related" scope
- competitors become "all major competitors, challengers, and substitutes"
- signal priorities and decision goals fall back to default intelligence prompts
- noise filters fall back to default anti-noise heuristics

This design matters because the feature is meant to help busy users who do not want to spend time engineering the perfect prompt.

In practice, the setup form creates a profile that is broad enough to be useful and specific enough to drive research quality.

---

## 7. Mail Session Handling

Mail is tied to the broader research session system managed by [frontend/src/hooks/useResearch.ts](frontend/src/hooks/useResearch.ts).

Mail sessions are identified by two things:

- `commandId === "deepresearch"`
- the query containing the Mail profile marker `Profile ID: ...`

This allows the UI to filter the general research session list into a Mail inbox view.

### Why this matters

This is a lightweight but effective architecture choice. Instead of building a separate storage system for Mail, the product reuses the existing session store and simply applies a Mail-specific filter.

That gives Mail:

- automatic report history
- inbox-style list behavior
- unread indicator support
- selected report persistence

---

## 8. Mail Execution Path

When Mail runs, the flow is:

1. `runMailResearch()` is triggered from the dashboard.
2. It calls `startMarketingCommand()` with the `deepresearch` command.
3. It passes the prompt built from the Mail profile.
4. It forces a new session so Mail runs as a fresh intelligence brief instead of reusing an active conversation.
5. The research hook streams progress into the current session.
6. The backend research pipeline returns the final report structure.
7. The report is stored and later displayed in the Mail inbox.

The important point is that Mail is a front-end driven execution trigger, but the actual intelligence generation happens on the server pipeline.

---

## 9. The Research Hook Layer

The central client-side orchestration lives in [frontend/src/hooks/useResearch.ts](frontend/src/hooks/useResearch.ts).

This hook handles:

- starting a new research session
- updating session phases
- caching and reusing deep research results for 24 hours
- persisting sessions to the backend store
- replaying cached report output when the same deep request is repeated

### Why the hook matters

This is the control plane for research execution. It is the place where the UI and the backend pipeline meet.

It also provides the anti-cost behavior you asked for earlier:

- repeated deep research with the same normalized argument within 24 hours can reuse a cached result
- this avoids unnecessary external API spend
- it preserves a consistent output history for the same profile

### What it reuses

The reuse logic checks for a prior session with:

- `commandId === "deepresearch"`
- matching normalized arguments
- a report created within the cache time-to-live window

If a cached result exists, the system replays the report rather than calling the external research route again.

---

## 10. Deep Research Skill Backbone

The feature is governed by the skill document at [ai-marketing-claude/skills/market-deepresearch/SKILL.md](ai-marketing-claude/skills/market-deepresearch/SKILL.md).

This skill is the policy layer for deep research output.

### What the skill does

It defines:

- what the brief is supposed to accomplish
- the required output structure
- the source quality expectations
- the confidence and contradiction rules
- the writing style and brevity rules

### Why the skill matters

The model should not invent its own structure every time. The skill acts as the stable operating manual that tells the pipeline what a valid deep brief looks like.

This is especially important for Mail because the user expects a recurring premium report, not a different style each day.

---

## 11. Backend Research Pipeline

The core server-side orchestration is in [frontend/src/lib/server/researchPipeline.ts](frontend/src/lib/server/researchPipeline.ts).

This file is the actual backbone of the intelligence system.

It does several jobs:

- loads the command skill document
- extracts requirements from the skill
- builds deep research prompt variants
- pulls web research and source material
- fetches visual references when available
- runs specialist subagents
- composes the final report structure
- checks for missing sections and repetition
- enforces a deep research quality gate

### The pipeline's purpose

The pipeline converts a user prompt into a structured, source-backed brief. It is the layer that turns research into presentation-ready output.

---

## 12. Pipeline Inputs

The backend pipeline consumes several categories of input.

### 12.1 User query

This is the actual Mail prompt built from the profile.

### 12.2 Command context

The command context explains how the request should be interpreted inside the system.

### 12.3 Command skill requirements

The pipeline loads requirements from the relevant skill document and uses them as an output checklist.

### 12.4 Merged research signals

The system passes in combined findings, risks, opportunities, and metrics from the research orchestration layer.

### 12.5 Visual references

When available, source-linked visuals are passed in so the report can include image references.

---

## 13. Research Source Strategy

The deep research path is designed to pull from multiple source tiers.

### Primary and high-trust sources

- official company announcements
- product docs
- pricing pages
- regulatory publications
- direct platform updates

### Strong secondary sources

- established industry publications
- analyst reports
- credible market intelligence datasets
- high-signal technical/operator analysis

### Directional signals

- community threads
- founder discussions
- social commentary
- Reddit, Hacker News, LinkedIn, X, and similar public discussion channels

The pipeline treats weaker sources as directional unless they are corroborated.

---

## 14. Visual Evidence Layer

The pipeline also tries to extract source-linked visuals through the visual reference flow in [frontend/src/lib/server/researchPipeline.ts](frontend/src/lib/server/researchPipeline.ts).

This matters because some market reports become more credible when they can point to:

- charts
- figures
- screenshots
- source-page images

The system scans source pages for metadata such as Open Graph or Twitter image tags and appends those references into the final report when available.

This creates a richer report experience without removing the original source links.

---

## 15. Model Routing and Fallbacks

The pipeline depends on [frontend/src/lib/server/modelRouter.ts](frontend/src/lib/server/modelRouter.ts) for structured JSON generation.

That router is the provider fallback layer.

### What it does

It attempts structured generation across multiple providers, including:

- OpenRouter
- Groq
- Perplexity

### Why this matters

Deep research is expensive and provider capacity can be unstable. The router reduces failure risk by trying alternate providers instead of failing immediately.

This is especially important for Mail because the user expects a daily brief, not a broken workflow whenever a single provider is saturated.

---

## 16. How the Report Is Composed

The final output is assembled in `composeFinalReport()` inside [frontend/src/lib/server/researchPipeline.ts](frontend/src/lib/server/researchPipeline.ts).

### The report assembly flow

1. The model is asked to return strict JSON.
2. The JSON is parsed and sanitized.
3. The report sections are created from the parsed structure.
4. Missing skill requirements are detected.
5. A refinement pass runs if the report misses required items.
6. A deep quality pass runs if the report is too shallow or repetitive.
7. Visual references are appended if they exist.
8. The report is finalized and packaged into output artifacts.

### Why this matters

This is a hybrid system. It uses generative AI, but it does not trust the first pass blindly. It wraps model output in deterministic checks.

That is the main reason the output is more reliable than a single freeform prompt.

---

## 17. Output Shape for Mail

The Mail brief is now designed to follow a premium executive structure.

The intended report sections are:

- WHAT MATTERS TODAY
- MARKET THESIS
- EXECUTIVE BRIEFING
- SIGNAL STRENGTH / CONFIDENCE LAYER
- OPPORTUNITY MAP
- DEEP DIVE SOURCES
- SOURCES

### What each section does

#### WHAT MATTERS TODAY

This is the top skim section. It gives 3–5 short bullets that tell the user what changed, why it matters, and how urgent it is.

#### MARKET THESIS

A short strategic narrative that frames the overall market direction.

#### EXECUTIVE BRIEFING

Decision-support format with Insight / Why It Matters / Recommended Action.

#### SIGNAL STRENGTH

Separates high-confidence signals from weaker ones so the user can act on the right items first.

#### OPPORTUNITY MAP

Ranks the best business opportunities and includes market pull, competition, speed to build, and priority.

#### DEEP DIVE SOURCES

Curated source hub grouped into categories without removing original links.

#### SOURCES

Full source list for traceability and deeper review.

---

## 18. Why the Old Layout Was Not Enough

The old report structure was useful, but it was too generic for founder decision-making.

It looked more like a standard research summary than a premium intelligence brief.

The new format improves three things:

- faster scanning
- stronger decision framing
- cleaner separation between signal, interpretation, and sources

This is why the report now feels more like a founder desk brief than a chat transcript.

---

## 19. Report Artifacts and Export Layer

The final report is turned into downloadable artifacts in [frontend/src/lib/server/reportArtifacts.ts](frontend/src/lib/server/reportArtifacts.ts).

That file produces:

- markdown output
- HTML output

The UI then uses the export route to deliver the output as markdown, HTML, or PDF.

### Why this matters

Mail is not just for reading in the app. It is meant to produce usable deliverables that a founder can save, share, print, or review later.

---

## 20. File Export Behavior

The report export route lives under [frontend/src/app/api/research/export/route.ts](frontend/src/app/api/research/export/route.ts).

It supports different output forms for the same report:

- `.md` for editable text workflows
- `.html` for browser viewing and sharing
- `.pdf` for presentation and offline use

This makes the Mail output usable in both product and board-style workflows.

---

## 21. Storage and Persistence Model

Mail is intentionally lightweight in local storage, but the main research sessions are persisted in the research session system.

### Local persistence

The profile setup, timing metadata, and view state are stored in browser localStorage keyed by user ID.

### Session persistence

The underlying report session is managed by the research store and persisted through the existing research session flow.

This gives the feature a practical balance:

- fast local state for Mail preferences
- durable session history for reports

---

## 22. Operational Timing and Scheduled Behavior

Mail is designed to feel recurring.

The UI tracks:

- last run time
- next scheduled run time
- last viewed time

It also contains interval logic that can trigger the next run after the configured period.

This is not a full backend scheduler yet. It is closer to a client-driven recurring intelligence flow.

That is useful for MVP and internal testing, but it also means the product is currently best understood as a scheduled briefing experience rather than a server-side cron system.

---

## 23. Skills Used by the Feature

Mail relies on two important layers of skill logic.

### 23.1 Command skill

The deep research command is governed by the deep research skill file:

- [ai-marketing-claude/skills/market-deepresearch/SKILL.md](ai-marketing-claude/skills/market-deepresearch/SKILL.md)

This skill defines what a valid deep research output should look like.

### 23.2 Command skill extraction

The backend pipeline reads the skill document, extracts requirements, and uses those requirements as a quality gate.

This means the skill file is not passive documentation. It actively shapes the generated output.

---

## 24. Why the Skill Layer Is the Backbone

The skill layer is the backbone because it defines the contract between intent and output.

Without it:

- the model would improvise structure
- the report could drift between styles
- quality would vary from run to run
- output would be harder to validate

With it:

- the output format is stable
- quality checks become deterministic
- the pipeline can detect missing requirements
- the report is easier to evolve without rewriting the whole system

---

## 25. Deep Research Quality Gates

The pipeline includes several quality controls.

### Depth gate

The report must not be too thin.

### Missing section gate

Required sections must be present.

### Repetition gate

The report must not repeat itself too much across sections.

### Requirement coverage gate

The report must explicitly cover the requirements extracted from the skill document.

### Source-linked visual gate

If visuals are available, the report should preserve them as references.

These gates make the output behave more like an editorial system and less like a raw chat response.

---

## 26. What the Backend Actually Produces

For each Mail run, the backend ultimately produces:

- a report title/query
- an overview
- a set of structured sections
- source links
- report scores when applicable
- artifacts for markdown and HTML
- a stored research session record

The Mail UI then uses this record to populate the inbox, downloads, and session history.

---

## 27. Data Flow Summary

### Input

User fills Mail setup form.

### Transform

Frontend normalizes the profile and builds a deep research prompt.

### Orchestration

`useResearch()` sends the command into the research session flow.

### Research

`researchPipeline.ts` runs source gathering, subagents, model composition, and quality gates.

### Output

The final report is saved as a session and rendered in the Mail inbox.

### Export

Users can download the brief as markdown, HTML, or PDF.

---

## 28. Architecture Model

The system follows a layered architecture:

### Layer 1: UI and interaction

Mail setup, inbox, report selection, and downloads live in the dashboard UI.

### Layer 2: Session orchestration

`useResearch()` handles command execution, session reuse, caching, and persistence.

### Layer 3: Server intelligence pipeline

`researchPipeline.ts` performs research orchestration, prompt shaping, source merging, model composition, and validation.

### Layer 4: Output formatting

`reportArtifacts.ts` turns the report into user-facing artifacts.

This division matters because it keeps the user interface separate from the intelligence logic.

---

## 29. Why This Architecture Was Chosen

This architecture is a good fit for Brief because it balances flexibility and control.

### Benefits

- easy to modify the Mail UX without rewriting the pipeline
- reusable research engine for other commands
- deterministic quality checks around AI output
- session history and caching are centralized
- report exports are separated from generation logic

### Tradeoff

The current implementation is still largely client-triggered rather than a fully autonomous background scheduling system. That is acceptable for the current product stage, but it is an important architecture note for future expansion.

---

## 30. Professor-Level Questions You Can Expect

If someone asks you technical questions about the feature, these are the kinds of answers you should be ready to give.

### What problem does Mail solve?

It turns repeat market research into a reusable founder briefing workflow and reduces both time cost and information noise.

### Why is it not just a normal chat feature?

Because it stores a profile, reuses that profile, runs a structured research pipeline, and outputs a readable intelligence brief rather than an open-ended conversation.

### What is the role of the skill file?

It defines the output contract and quality expectations for the deep research command.

### What is the role of the backend pipeline?

It converts a prompt into a validated, source-backed report and enforces the structure, source coverage, and quality gates.

### How are repeated requests handled?

The research hook can reuse a deep research result within a 24-hour cache window when the normalized prompt matches.

### How are provider failures handled?

The model router falls back across providers so a temporary capacity issue does not immediately break the report.

### How are reports exported?

The export route converts the report into markdown, HTML, and PDF outputs.

---

## 31. Current Limitations

This is worth stating clearly in a technical report.

- recurring Mail runs are currently initiated from the frontend rather than a dedicated scheduler service
- localStorage is used for profile persistence, so it is browser-scoped rather than device-independent
- the report quality is strong, but model-provider stability still affects latency and occasional fallback behavior
- the feature still depends on external provider availability and API quotas

These are not failures. They are implementation constraints of the current stage.

---

## 32. Why This Feature Is Valuable

Mail is valuable because it makes Brief feel like a premium intelligence product rather than a generic AI chat tool.

It gives users:

- a repeatable founder briefing workflow
- practical market signals instead of noise
- faster decision-making in the morning
- preserved research evidence for follow-up investigation
- exportable report formats for internal use

That combination is what makes the feature feel operational rather than decorative.

---

## 33. Reference Files

- [frontend/src/app/app/page.tsx](frontend/src/app/app/page.tsx)
- [frontend/src/hooks/useResearch.ts](frontend/src/hooks/useResearch.ts)
- [frontend/src/lib/server/researchPipeline.ts](frontend/src/lib/server/researchPipeline.ts)
- [frontend/src/lib/server/reportArtifacts.ts](frontend/src/lib/server/reportArtifacts.ts)
- [frontend/src/lib/server/modelRouter.ts](frontend/src/lib/server/modelRouter.ts)
- [ai-marketing-claude/skills/market-deepresearch/SKILL.md](ai-marketing-claude/skills/market-deepresearch/SKILL.md)
- [frontend/src/app/api/research/export/route.ts](frontend/src/app/api/research/export/route.ts)

---

## 34. Final Summary

Mail is a layered founder intelligence feature built on top of Brief's deep research engine.

Its value comes from the combination of:

- profile-based prompt generation
- session-backed research orchestration
- skill-driven output requirements
- server-side research composition
- deterministic quality checks
- exportable final reports

The result is a recurring executive brief that is easier to read, easier to reuse, and more useful for strategic decision-making than a standard chat answer.
