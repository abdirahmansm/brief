# Brief – AI Marketing Commands Reference

> **Purpose**: This document explains every `/market` command available in Brief, what it means to the AI orchestration layer, and what the AI must do when each command is invoked. Use this as the definitive contract between the frontend and the AI backend.

---

## How Commands Work (Architecture)

1. **User types** a `/market <command> <argument>` in the prompt input.
2. **Frontend** matches the input against `MARKETING_COMMANDS` in `marketingSkills.ts`, extracts the argument (URL, topic, client name, or product description), and sends a structured request to the backend.
3. **AI Orchestration Layer** receives a payload like:
   ```json
   {
     "commandId": "audit",
     "arg": "https://example.com",
     "inputType": "url"
   }
   ```
4. **AI dispatches** to the correct directive/pipeline based on `commandId`.
5. **Execution layer** returns structured data; AI formats it into the expected `outputFile` format.

---

## Command Categories

| Category                           | Description                                                              | When to Use                                  |
| ---------------------------------- | ------------------------------------------------------------------------ | -------------------------------------------- |
| **Analysis** (`analysis`)          | Evaluate existing assets — websites, landing pages, funnels, SEO         | User has a live URL and wants a diagnostic   |
| **Content Generation** (`content`) | Create new marketing materials — emails, social posts, ad copy           | User needs deliverables they can publish     |
| **Strategy** (`strategy`)          | High-level planning — competitor intelligence, brand voice, launch plans | User needs a strategic framework or playbook |
| **Reporting** (`reporting`)        | Compile findings into client-ready documents                             | User wants a polished, shareable output      |

---

## All 14 Commands — Full Breakdown

---

### 1. `/market audit` — Full Marketing Audit

| Field           | Value                              |
| --------------- | ---------------------------------- |
| **ID**          | `audit`                            |
| **Category**    | Analysis                           |
| **Input Type**  | `url` — expects a full website URL |
| **Output File** | `MARKETING-AUDIT.md`               |
| **Icon**        | 📊                                 |

**What the AI must do:**

Run **5 parallel analysis agents**, each scoring a different marketing dimension of the provided website:

1. **Content & Messaging Agent** — Evaluate headline clarity, value proposition, readability, and messaging consistency across pages.
2. **Conversion Optimization Agent** — Assess CTAs (clarity, placement, urgency), forms, pricing presentation, and friction points.
3. **SEO & Discoverability Agent** — Check meta tags, heading structure, keyword usage, page speed signals, and technical SEO basics.
4. **Competitive Positioning Agent** — Identify how the site differentiates from competitors, unique selling points, and market positioning.
5. **Brand & Trust Agent** — Evaluate social proof (testimonials, logos, reviews), trust signals (security badges, guarantees), and professional design.

After all agents complete, produce a **Growth & Strategy Score** synthesizing the findings.

**Expected output structure:**

- Overall score (0–100) with letter grade
- Score breakdown per category (each weighted)
- Executive summary
- Detailed findings per category
- Top 5 quick wins
- Top 5 strategic priorities
- Sources consulted

**AI system prompt context:**

> "You are a senior marketing consultant performing a comprehensive audit. Be specific — cite exact text from the website. Score honestly; don't inflate. Every recommendation must be actionable with a clear expected impact."

---

### 2. `/market quick` — Quick Snapshot

| Field           | Value                          |
| --------------- | ------------------------------ |
| **ID**          | `quick`                        |
| **Category**    | Analysis                       |
| **Input Type**  | `url`                          |
| **Output File** | _(none — inline display only)_ |
| **Icon**        | ⚡                             |

**What the AI must do:**

Perform a **60-second rapid assessment** of the homepage only. No deep dive — this is a first-impression review.

Evaluate exactly these signals:

1. **Headline clarity** — Is the value prop immediately understandable?
2. **CTA strength** — Is the primary CTA visible, compelling, and specific?
3. **Trust signals** — Are there testimonials, logos, security badges, or social proof?
4. **Visual hierarchy** — Does the eye flow logically to the key conversion point?

**Expected output:**

- 3 things working well (wins)
- 3 things to fix immediately (fixes)
- One-sentence overall impression
- No file output — results appear inline in the chat

**AI system prompt context:**

> "You are a marketing expert giving rapid first-impression feedback. Be blunt, specific, and concise. No fluff. Each point should be one sentence max."

---

### 3. `/market copy` — Copy Analysis

| Field           | Value                 |
| --------------- | --------------------- |
| **ID**          | `copy`                |
| **Category**    | Content               |
| **Input Type**  | `url`                 |
| **Output File** | `COPY-SUGGESTIONS.md` |
| **Icon**        | ✍️                    |

**What the AI must do:**

1. **Fetch and extract** all visible copy from the target page.
2. **Score** the existing copy on: clarity, persuasiveness, specificity, emotional resonance, and CTA effectiveness.
3. **Generate optimized alternatives** for each major copy block (headlines, subheadlines, CTAs, body copy).
4. Present **before/after examples** with explanations of why the new version is stronger.

**Expected output structure:**

- Overall copy score (1–10)
- Section-by-section analysis with original → suggested rewrites
- Tone/voice assessment
- Readability metrics (grade level, sentence length)

**AI system prompt context:**

> "You are a direct-response copywriter with conversion expertise. When rewriting, maintain the brand's voice but sharpen every sentence for clarity and action. Show don't tell — provide the actual rewritten copy, not just advice."

---

### 4. `/market emails` — Email Sequences

| Field           | Value                                            |
| --------------- | ------------------------------------------------ |
| **ID**          | `emails`                                         |
| **Category**    | Content                                          |
| **Input Type**  | `topic` — expects a business/product description |
| **Output File** | `EMAIL-SEQUENCES.md`                             |
| **Icon**        | 📧                                               |

**What the AI must do:**

Generate **complete, ready-to-send email sequences** based on the business context provided. The AI should produce multiple sequence types as appropriate:

1. **Welcome Sequence** (3–5 emails) — Onboard new subscribers/users
2. **Nurture Sequence** (5–7 emails) — Build trust and educate
3. **Launch Sequence** (4–6 emails) — Build anticipation and drive sales
4. **Cart Abandonment** (3 emails) — Recover lost conversions
5. **Cold Outreach** (3–4 emails) — B2B prospecting

For each email, provide:

- Subject line (+ 2 A/B variants)
- Preview text
- Full email body (with merge tags like `{{first_name}}`)
- CTA button text
- Send timing (e.g., "Day 1", "Day 3", "2 hours after abandonment")

**AI system prompt context:**

> "You are an email marketing specialist. Write emails that feel personal, not templated. Each email must have a single clear CTA. Use proven frameworks (PAS, AIDA, storytelling) but keep them natural. Include specific subject line formulas that drive opens."

---

### 5. `/market social` — Social Media Calendar

| Field           | Value                |
| --------------- | -------------------- |
| **ID**          | `social`             |
| **Category**    | Content              |
| **Input Type**  | `topic`              |
| **Output File** | `SOCIAL-CALENDAR.md` |
| **Icon**        | 📱                   |

**What the AI must do:**

Create a **30-day content calendar** with platform-specific posts.

1. **Define 4–5 content pillars** based on the brand/topic
2. **Generate daily posts** for the primary platform(s), including:
   - Post copy (platform-appropriate length)
   - Hook (first line that stops the scroll)
   - Hashtags (mix of high-volume and niche)
   - Content format suggestion (carousel, video, story, thread, etc.)
   - Best posting time
3. **Content repurposing strategy** — how to turn one piece into 5+ assets across platforms

**Expected output:**

- Content pillar definitions
- 30-day calendar (table format)
- Hashtag bank grouped by pillar
- Repurposing cheat sheet

**AI system prompt context:**

> "You are a social media strategist who understands platform algorithms. Write hooks that stop the scroll. Every post must provide value — no filler content. Vary formats to maintain audience interest. Think like a creator, not a brand."

---

### 6. `/market ads` — Ad Campaigns

| Field           | Value             |
| --------------- | ----------------- |
| **ID**          | `ads`             |
| **Category**    | Content           |
| **Input Type**  | `url`             |
| **Output File** | `AD-CAMPAIGNS.md` |
| **Icon**        | 📢                |

**What the AI must do:**

Analyze the business from the URL and generate **complete ad campaigns** across platforms:

1. **Google Ads** — Search ad copy (headlines, descriptions, sitelinks), keyword suggestions, negative keywords
2. **Meta Ads (Facebook/Instagram)** — Primary text, headline, description for multiple ad formats (single image, carousel, video script)
3. **LinkedIn Ads** — Professional-tone variants for B2B targeting
4. **TikTok Ads** — Script hooks and UGC-style concepts

For each platform, include:

- 3–5 ad copy variations
- Targeting recommendations (demographics, interests, lookalikes)
- Budget allocation suggestions
- Retargeting sequence (awareness → consideration → conversion)

**AI system prompt context:**

> "You are a paid media specialist. Write ads that pass platform review policies while maximizing CTR. Each variation should test a different angle (pain point, benefit, social proof, urgency). Include negative examples of what NOT to do."

---

### 7. `/market funnel` — Funnel Analysis

| Field           | Value                |
| --------------- | -------------------- |
| **ID**          | `funnel`             |
| **Category**    | Analysis             |
| **Input Type**  | `url`                |
| **Output File** | `FUNNEL-ANALYSIS.md` |
| **Icon**        | 🔄                   |

**What the AI must do:**

Map the **entire conversion funnel** from first visit to purchase/signup:

1. **Identify funnel stages** — Awareness, Interest, Consideration, Decision, Action
2. **Analyze each stage** — What pages/content serve each stage? Are there gaps?
3. **Find drop-off points** — Where is the funnel likely leaking? (e.g., pricing page has no social proof, checkout has too many fields)
4. **Quantify potential impact** — Estimate revenue impact of fixing each issue
5. **Recommend optimizations** — Specific changes with priority ranking

**Expected output:**

- Funnel map (visual description of stages)
- Stage-by-stage analysis
- Drop-off risk assessment
- Prioritized optimization list with estimated impact
- Missing funnel elements

**AI system prompt context:**

> "You are a conversion rate optimization expert. Think in terms of friction and motivation at each stage. Every recommendation must include expected impact (high/medium/low) and implementation difficulty. Be specific about what to add, change, or remove."

---

### 8. `/market competitors` — Competitor Intelligence

| Field           | Value                  |
| --------------- | ---------------------- |
| **ID**          | `competitors`          |
| **Category**    | Strategy               |
| **Input Type**  | `url`                  |
| **Output File** | `COMPETITOR-REPORT.md` |
| **Icon**        | 🏆                     |

**What the AI must do:**

1. **Identify 3–5 main competitors** from the URL's market space (using web search)
2. **For each competitor, analyze:**
   - Positioning & messaging
   - Pricing structure
   - Feature comparison
   - Content strategy (blog, social, ads)
   - Strengths and weaknesses
3. **Build a feature/pricing comparison matrix**
4. **Generate SWOT analysis** for the user's business relative to competitors
5. **List "steal-worthy" tactics** — things competitors are doing well that the user could adapt

**Expected output:**

- Competitor overview table
- Detailed competitor profiles
- Feature comparison matrix
- SWOT analysis
- Actionable competitive advantages to exploit
- Content/messaging gaps to fill

**AI system prompt context:**

> "You are a competitive intelligence analyst. Use web search to find real competitor data — don't fabricate. Focus on actionable insights, not just observations. Every finding should answer: 'So what? What should the user DO about this?'"

---

### 9. `/market landing` — Landing Page CRO

| Field           | Value                                               |
| --------------- | --------------------------------------------------- |
| **ID**          | `landing`                                           |
| **Category**    | Analysis                                            |
| **Input Type**  | `url` — expects a specific landing/pricing page URL |
| **Output File** | `LANDING-CRO.md`                                    |
| **Icon**        | 🎯                                                  |

**What the AI must do:**

Perform a **conversion-focused audit** of a single landing page:

1. **Score conversion elements** (0–10 each):
   - Headline match to visitor intent
   - Value proposition clarity
   - CTA visibility and copy
   - Social proof placement and quality
   - Form design and friction
   - Visual hierarchy and scan-ability
   - Mobile responsiveness
   - Page load perception
2. **Friction analysis** — List every element that could cause hesitation or confusion
3. **Specific fixes** — For every issue found, provide the exact fix (not just "improve your CTA" but "Change CTA from 'Submit' to 'Start My Free Trial'")

**AI system prompt context:**

> "You are a CRO specialist who has optimized hundreds of landing pages. Be ruthlessly specific. Generic advice is useless. Every recommendation must include the exact change to make and why it works psychologically."

---

### 10. `/market launch` — Launch Playbook

| Field           | Value                                     |
| --------------- | ----------------------------------------- |
| **ID**          | `launch`                                  |
| **Category**    | Strategy                                  |
| **Input Type**  | `product` — expects a product description |
| **Output File** | `LAUNCH-PLAYBOOK.md`                      |
| **Icon**        | 🚀                                        |

**What the AI must do:**

Generate a **complete launch strategy** organized in three phases:

**Pre-Launch (4–6 weeks before):**

- Audience building tactics
- Waitlist/beta strategy
- Content seeding plan
- Partner/influencer outreach templates
- Teaser campaign ideas

**Launch Day:**

- Hour-by-hour timeline
- Channel-specific launch posts
- Email announcements
- PR/media outreach
- Community engagement plan
- Live event/webinar script

**Post-Launch (2–4 weeks after):**

- Momentum maintenance plan
- User feedback collection
- Iteration roadmap
- Referral program design
- Retargeting campaigns

**AI system prompt context:**

> "You are a product marketing manager who has launched dozens of products. Be specific with timelines, templates, and tactics. Include actual copy/scripts where possible. Anticipate what could go wrong and build contingencies."

---

### 11. `/market proposal` — Client Proposal

| Field           | Value                                                |
| --------------- | ---------------------------------------------------- |
| **ID**          | `proposal`                                           |
| **Category**    | Reporting                                            |
| **Input Type**  | `client` — expects a client name and project context |
| **Output File** | `CLIENT-PROPOSAL.md`                                 |
| **Icon**        | 📋                                                   |

**What the AI must do:**

Generate a **professional marketing proposal** that a freelancer or agency could send to a client:

1. **Executive Summary** — Problem statement, proposed solution, expected outcomes
2. **Situation Analysis** — Current state assessment based on available data
3. **Scope of Work** — Detailed deliverables with descriptions
4. **Methodology** — How the work will be executed (phases, timeline)
5. **Timeline** — Week-by-week or month-by-month milestones
6. **Pricing** — Package options (Basic, Standard, Premium) with line-item breakdown
7. **Case Studies/Social Proof** — Template sections for the user to fill in
8. **Terms & Next Steps** — How to proceed, payment terms, guarantees

**AI system prompt context:**

> "You are a marketing consultant writing a proposal that must win the deal. Be professional but not stiff. Use specific numbers and timelines. The proposal should make the client feel confident in the approach. Include placeholder sections clearly marked with [FILL IN] for user-specific details."

---

### 12. `/market report` — Marketing Report

| Field           | Value                 |
| --------------- | --------------------- |
| **ID**          | `report`              |
| **Category**    | Reporting             |
| **Input Type**  | `url`                 |
| **Output File** | `MARKETING-REPORT.md` |
| **Icon**        | 📑                    |

**What the AI must do:**

Compile a **comprehensive, client-ready marketing report** that combines multiple analysis dimensions:

1. **Executive Summary** — Key findings and recommendations in 3–5 bullet points
2. **Market Overview** — Industry context and trends
3. **Website/Digital Presence Analysis** — Content, UX, SEO, conversion assessment
4. **Competitive Landscape** — Key competitors and positioning
5. **Customer Insights** — Pain points, desires, language they use
6. **Recommendations** — Prioritized action items with expected impact
7. **Appendix** — Sources, methodology, data tables

This is the "catch-all" reporting command — when a user wants everything in one polished document.

**AI system prompt context:**

> "You are writing a report that will be presented to stakeholders. Use clear sections, data-driven insights, and professional formatting. Every claim must be supported by evidence. Include an executive summary that a CEO could read in 2 minutes and understand the full picture."

---

### 13. `/market seo` — SEO Content Audit

| Field           | Value          |
| --------------- | -------------- |
| **ID**          | `seo`          |
| **Category**    | Analysis       |
| **Input Type**  | `url`          |
| **Output File** | `SEO-AUDIT.md` |
| **Icon**        | 🔍             |

**What the AI must do:**

Perform a **technical and content SEO audit**:

**On-Page SEO:**

- Title tags (length, keyword placement, uniqueness)
- Meta descriptions (compelling, correct length, keyword usage)
- Heading structure (H1–H6 hierarchy, keyword usage)
- Internal linking structure
- Image alt text and optimization
- Content quality and depth

**Technical SEO:**

- URL structure and cleanliness
- Mobile responsiveness signals
- Page speed indicators
- Schema markup opportunities
- Canonical tags
- Sitemap and robots.txt assessment

**Content Opportunities:**

- Keyword gaps (topics competitors rank for but the user doesn't)
- Content cluster suggestions
- Featured snippet opportunities
- Long-tail keyword targets

**AI system prompt context:**

> "You are an SEO specialist. Prioritize findings by impact (traffic potential × implementation ease). Don't just list issues — explain WHY each matters and quantify the opportunity where possible. Include specific keyword suggestions with estimated search volume ranges."

---

### 14. `/market brand` — Brand Voice Analysis

| Field           | Value            |
| --------------- | ---------------- |
| **ID**          | `brand`          |
| **Category**    | Strategy         |
| **Input Type**  | `url`            |
| **Output File** | `BRAND-VOICE.md` |
| **Icon**        | 🎨               |

**What the AI must do:**

Analyze the brand's digital presence and generate **brand voice guidelines**:

1. **Current Voice Profile:**
   - Personality traits (e.g., "Professional but approachable", "Bold and irreverent")
   - Tone spectrum (formal ↔ casual, serious ↔ playful, authoritative ↔ humble)
   - Language patterns (jargon usage, sentence style, vocabulary level)

2. **Consistency Assessment:**
   - Is the voice consistent across pages?
   - Do different sections feel like they were written by different people?
   - Brand message alignment

3. **Visual Identity Notes:**
   - Color palette observations
   - Typography style
   - Image/illustration style
   - Overall design personality

4. **Brand Voice Guidelines (Deliverable):**
   - Voice attributes (3–5 defining traits)
   - "We are / We are not" framework
   - Writing do's and don'ts with examples
   - Sample copy in the brand voice for different contexts (social, email, website, support)

**AI system prompt context:**

> "You are a brand strategist. Analyze what the brand is actually communicating (not what they intend to). Be honest about inconsistencies. The deliverable should be a usable guide that any writer could follow to maintain brand voice."

---

## Input Type Reference

| Input Type | What the AI Receives                 | Validation                  | Example                                  |
| ---------- | ------------------------------------ | --------------------------- | ---------------------------------------- |
| `url`      | A website URL to fetch and analyze   | Must be a valid URL format  | `https://example.com`                    |
| `topic`    | A business/product topic description | Free text, min 5 characters | `AI productivity tools for remote teams` |
| `client`   | Client name + project context        | Free text, min 3 characters | `Acme Corp — e-commerce redesign`        |
| `product`  | Product/service description          | Free text, min 5 characters | `AI-powered CRM for small businesses`    |

---

## Research Phases (Frontend Display)

Each command defines `phases[]` — these are the status messages shown to the user during processing. The AI backend should emit progress events matching these labels so the frontend can display real-time progress via the `ResearchProgress` component.

Example flow for `/market audit`:

```
[●] Fetching website content
[●] Analyzing content & messaging
[●] Evaluating conversion optimization
[●] Auditing SEO & discoverability
[●] Assessing competitive positioning
[●] Reviewing brand & trust signals
[●] Scoring growth & strategy
[●] Compiling final report
```

The backend should send phase updates as server-sent events (SSE) or WebSocket messages:

```json
{ "type": "phase", "index": 0, "label": "Fetching website content", "status": "in-progress" }
{ "type": "phase", "index": 0, "label": "Fetching website content", "status": "complete" }
{ "type": "phase", "index": 1, "label": "Analyzing content & messaging", "status": "in-progress" }
```

---

## API Integration Map

When we connect the AI backend, each command maps to a pipeline of API calls:

| Step           | API Service                | Purpose                                             |
| -------------- | -------------------------- | --------------------------------------------------- |
| **Web Fetch**  | Perplexity API (Sonar)     | Fetch live website content and competitor data      |
| **Analysis**   | Groq (Llama 3) or DeepSeek | Process and score the fetched content               |
| **Synthesis**  | Groq or DeepSeek           | Combine multi-agent findings into a coherent report |
| **Formatting** | Local (Cloud Function)     | Structure the output into Markdown for the frontend |

### Cost Considerations per Command

| Command               | Est. API Calls                              | Relative Cost |
| --------------------- | ------------------------------------------- | ------------- |
| `/market quick`       | 1 fetch + 1 analysis                        | $ (cheapest)  |
| `/market copy`        | 1 fetch + 2 analysis                        | $$            |
| `/market seo`         | 1 fetch + 2 analysis                        | $$            |
| `/market landing`     | 1 fetch + 2 analysis                        | $$            |
| `/market brand`       | 1 fetch + 2 analysis                        | $$            |
| `/market emails`      | 0 fetch + 2 generation                      | $$            |
| `/market social`      | 0 fetch + 2 generation                      | $$            |
| `/market ads`         | 1 fetch + 3 generation                      | $$$           |
| `/market funnel`      | 2 fetch + 2 analysis                        | $$$           |
| `/market competitors` | 4–6 fetch + 3 analysis                      | $$$$          |
| `/market audit`       | 1 fetch + 5 parallel analysis + 1 synthesis | $$$$          |
| `/market launch`      | 0–1 fetch + 3 generation                    | $$$           |
| `/market proposal`    | 0–1 fetch + 2 generation                    | $$            |
| `/market report`      | 2 fetch + 4 analysis + 1 synthesis          | $$$$          |

---

## What Happens Next

When the Cloud Functions backend is wired up, each command will:

1. Receive the `commandId` and `arg` from the frontend
2. Look up the directive for that command (this document)
3. Chain the appropriate API calls (Perplexity → LLM → Format)
4. Stream phase progress back to the frontend
5. Return the final structured report

This document serves as the **contract** the AI must follow. Every command's expected behavior, output format, and system prompt context is defined here so the AI produces consistent, high-quality results regardless of which LLM provider handles the work.
