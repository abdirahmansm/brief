# Brief Agent Pipeline – A to Z

This file explains the exact runtime workflow used by the market research agent from request to final output.

## A. Input Intake

1. User sends either:

- normal query (no slash command)
- command query (`/market ...`)

2. Frontend parses command shape using command definitions.

3. Payload sent to backend route:

- query
- optional commandId
- optional commandArg

## B. Mode Selection

1. If commandId exists:

- Deep mode
- command-specific skill instructions are loaded

2. If no commandId:

- Simple mode
- concise synthesis skill path

## C. Preflight Skills

The orchestrator injects:

1. global preflight skills
2. command-specific preflight skills (if command mode)

Goal:

- constrain style
- enforce market-research rigor
- avoid generic output

## D. Live Retrieval

1. Perplexity request is sent for live web scanning.
2. Returned content is normalized into:

- summary
- evidence bullets
- sources + domains

## E. Evidence Curation

1. Sources are deduplicated.
2. Evidence list is cleaned.
3. Weak/noisy signals are downweighted in synthesis instructions.

## F. Structured Analysis Generation

1. Orchestrator creates specialized subagent specs (mode-aware and command-aware).
2. Subagents run in parallel (Promise-based orchestration), each with isolated prompt + skill context.
3. Each subagent returns deterministic JSON:

- findings
- opportunities
- risks
- metrics
- confidence

4. Deterministic merge layer deduplicates and consolidates all subagent outputs.
5. Model layer routing:

- preferred provider/model
- fallback provider/model if needed

## G. Postflight Skills

Before finalizing, instructions enforce:

1. consistency checks
2. actionability
3. uncertainty handling
4. anti-filler cleanup

## H. Output Validation

1. JSON block extracted and parsed.
2. Missing fields repaired with safe fallbacks.
3. Score normalization applied when scoring exists.
4. Audit scoring can be derived deterministically from subagent outputs.

## I. Session Persistence

1. Final report persisted to Firestore under user scope.
2. Research session includes:

- steps
- sources
- analysis log
- report sections
- optional scoring metadata

## I2. Artifact Generation

1. Backend generates export-ready artifacts:

- Markdown report body
- HTML report body (PDF-ready)

2. Artifacts are returned with API response for downstream export workflows.

## J. Real-time UX Delivery

1. Progress steps update over time (not instant jump).
2. Live analysis log events are appended while processing.
3. Report text streams progressively top-to-bottom.

## K. Reopen/History Behavior

1. Sessions are read from Firestore on load.
2. Users can reopen exact prior output after refresh.

## L. Security Boundaries

1. Only authenticated user-scoped Firestore paths are used.
2. API keys remain server-side in env (no client exposure).

---

## Current Reality vs Earlier Concept

Current implementation includes:

- command parsing and routing
- live retrieval + model synthesis
- true parallel subagent orchestration with isolated prompts
- deterministic subagent schema merge
- backend export artifacts (markdown + html)
- persistence + realtime UX

Current implementation does NOT yet include:

- deterministic Python execution scripts for each sub-agent
- automatic server-side PDF rendering

Those can be added as a next phase if required.
