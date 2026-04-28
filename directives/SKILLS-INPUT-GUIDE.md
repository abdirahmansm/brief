# Brief Skills Input Guide

This guide explains what each skill/command expects as input and what it returns.

## Global Input Rules

- URL-based commands: require a valid `http://` or `https://` URL format.
- Topic/client/product commands: require a specific prompt (not greeting/filler/gibberish).
- Simple mode:
  - If you do not use `/market ...`, request is routed to Assistant mode.
  - No refinement chaining.
- Deep mode:
  - Skills selector is enabled.
  - Continue flow can refine the active command context.

## Command Summary

| Command               | Input Type | Valid Input Example                                                                     | What It Does (Short)                      | Returns                                |
| --------------------- | ---------- | --------------------------------------------------------------------------------------- | ----------------------------------------- | -------------------------------------- |
| `/market audit`       | url        | `https://example.com`                                                                   | Full multi-agent marketing audit.         | Weighted scores + findings + sources   |
| `/market quick`       | url        | `https://example.com`                                                                   | Fast signal snapshot.                     | Top wins/fixes + key signals           |
| `/market copy`        | url        | `https://example.com`                                                                   | Copy quality and rewrite ideas.           | Copy score + optimized variants        |
| `/market emails`      | topic      | `SaaS onboarding for project management`                                                | Generates email sequence strategy/copy.   | Structured email sequence output       |
| `/market social`      | topic      | `AI productivity tools for remote teams`                                                | Builds social content plan.               | Calendar + hooks + hashtags            |
| `/market ads`         | url        | `https://example.com`                                                                   | Ad strategy + cross-channel concepts.     | Ad angles/copy + targeting ideas       |
| `/market funnel`      | url        | `https://example.com`                                                                   | Funnel friction and drop-off analysis.    | Funnel findings + optimization actions |
| `/market competitors` | url        | `https://example.com`                                                                   | Competitor positioning and gap scan.      | Competitive insights + recommendations |
| `/market landing`     | url        | `https://example.com/pricing`                                                           | Landing page CRO analysis.                | CRO findings + prioritized fixes       |
| `/market launch`      | product    | `AI CRM for small businesses`                                                           | Product launch planning.                  | Launch playbook output                 |
| `/market proposal`    | client     | `Acme Corp e-commerce redesign`                                                         | Client proposal draft generation.         | Proposal structure + scope/timeline    |
| `/market report`      | url        | `https://example.com`                                                                   | Consolidated marketing report.            | Report sections + citations            |
| `/market seo`         | url        | `https://example.com`                                                                   | SEO and discoverability audit.            | SEO findings + opportunities           |
| `/market brand`       | url        | `https://example.com`                                                                   | Brand voice and trust analysis.           | Brand guidance + consistency notes     |
| `/market sizing`      | topic      | `AI accounting software for SMBs in North America`                                      | TAM/SAM/SOM style sizing synthesis.       | Sizing assumptions + summary           |
| `/market segments`    | topic      | `Cybersecurity tools for remote startups`                                               | Segment discovery and prioritization.     | Segment map + attractiveness insights  |
| `/market demand`      | topic      | `AI voice agents for insurance claims`                                                  | Demand validation signal analysis.        | Demand indicators + timing insight     |
| `/market landscape`   | topic      | `B2B procurement automation`                                                            | Ecosystem and landscape mapping.          | Player map + strategic clusters        |
| `/market whitespace`  | topic      | `Workflow automation for legal operations in midsize firms with compliance bottlenecks` | Finds unmet needs and opportunity spaces. | Whitespace opportunities + roadmap     |
| `/market regulatory`  | topic      | `AI diagnostics for EU healthcare providers`                                            | Regulatory and risk scan.                 | Risk factors + mitigation ideas        |

## What Counts as Invalid Input

- URL command with non-URL text (example: `hi`, `abc`, `www.youtube.com` without protocol).
- Topic command with vague/filler text (example: `hi`, `hello`, `ok`, random gibberish).
- Too-short non-URL prompts without market/audience/problem context.

## Current Behavior for Non-Existing URLs

Current state:

- The app validates URL format, not guaranteed URL existence.
- So a syntactically valid URL like `https://not-a-real-site-xyz123.com` can pass initial validation.
- If the downstream web research provider cannot resolve useful data, output quality may degrade or fail depending on provider response.

Recommendation (next hardening step):

- Add server-side URL reachability precheck for URL commands (DNS/HEAD/GET with timeout).
- If unreachable, return a clear message before running research to avoid token waste.
