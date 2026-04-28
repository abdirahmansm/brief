# Agent Instructions for Building 'Brief' - AI Market Research Assistant

## 1. Agent Operating Architecture: The 3-Layer System

This system operates within a robust 3-layer architecture designed to maximize reliability and separate responsibilities. This approach addresses the probabilistic nature of Large Language Models (LLMs) by isolating deterministic business logic, ensuring consistency and accuracy in application functionality.

### Layer 1: Directive (What to do)

Directives are Standard Operating Procedures (SOPs) written in Markdown, residing in the `directives/` directory. They define objectives, required inputs, tools/scripts to use, expected outputs, and edge cases. These are natural-language instructions, similar to those provided to a mid-level employee, guiding the overall task execution.

### Layer 2: Orchestration (Decisions)

This layer is responsible for intelligent routing and decision-making. It involves reading the directives, calling execution tools in the correct order, handling errors, asking clarifying questions when necessary, and updating directives with new learnings. This layer acts as the crucial link between the user's intent and the deterministic execution of tasks.

### Layer 3: Execution (Doing the work)

This layer consists of deterministic Python scripts located in the `execution/` directory. These scripts handle API calls, data processing, file operations, and database interactions. Environment variables and API tokens are securely stored in `.env` files. The execution layer is designed to be reliable, testable, and fast, prioritizing scripts over manual work and ensuring all code is well-commented.

**Why it works**: By pushing complexity into deterministic code, the system minimizes the compounding of errors. This allows the orchestration layer to focus solely on decision-making, significantly improving overall success rates.

## 2. App Idea: Brief – AI Market Research Assistant

**Brief** is an intelligent, minimalist market research tool designed to help startups, product managers, and marketing teams quickly gather actionable insights. It continuously scans the market, summarizes key trends, and produces concise, structured reports from a single prompt interface, offering a significant advantage over traditional, often slow and costly research methods.

The app prioritizes user-friendliness and a distraction-free experience, featuring a clean chat-like interface where users can focus entirely on their research tasks without navigating complex dashboards or controls.

### Workflow

1.  **User Prompt**: The user initiates research by entering a question or topic of interest (e.g., “Current trends in e-commerce payment solutions” or “Key pain points for Shopify users”).
2.  **Live Market Scan**: An AI agent scans publicly available sources, including news articles, forums, and customer reviews, presenting a live preview of the sources being consulted.
3.  **Analysis and Summarization**: The AI synthesizes the gathered information, highlighting recurring patterns, customer pain points, competitor insights, and emerging trends.
4.  **Report Generation**: A structured report is produced, including:
    - Market overview
    - Key competitors
    - Customer complaints / challenges
    - Emerging trends
    - Market gaps and opportunities
    - Cited sources for transparency
5.  **Instant Delivery**: The final report is immediately displayed in the interface, providing actionable intelligence without manual compilation or analysis.

**Core Principle**: Brief transforms raw market data into clear, actionable insights in real-time, enabling decision-makers to shift from reactive to predictive strategies through a simple, elegant interface.

## 3. Technical Architecture: Firebase Adapted

The 'Brief' application will leverage a modern, scalable architecture with Firebase as the primary backend, integrated with a Next.js frontend and external APIs for specialized tasks.

### Frontend

A Next.js application (using the App Router) will provide the user interface. This will be hosted on Firebase Hosting for fast, secure, and reliable content delivery.

### Backend (Firebase-centric)

Firebase will serve as the core backend, managing user authentication, data storage, and serverless logic. This approach aligns with the 3-layer architecture by providing deterministic, scalable services for critical backend operations.

- **Authentication**: Firebase Authentication will handle user sign-up, sign-in, and session management. The Spark plan offers a generous free tier, supporting up to 50,000 Monthly Active Users (MAU) [1].
- **Firestore (NoSQL Database)**: Used for storing user prompts, search results, and generated reports. The free tier includes 1 GiB of stored data, 50,000 document reads, 20,000 writes, and 20,000 deletes per day [1].
- **Cloud Functions**: These serverless functions will host the business logic for interacting with external APIs (Perplexity, LLMs) and processing data. While external API calls typically require the Blaze (pay-as-you-go) plan, the free tier for Cloud Functions still applies, offering 2 million invocations, 400,000 GB-seconds, and 200,000 CPU-seconds per month [1].

### External API Integrations

- **Live Market Scan (Perplexity API)**: The Perplexity API, specifically the **Sonar** model, will be used for real-time web search. Pricing is approximately $1 per 1M input tokens and $1 per 1M output tokens, with an additional request fee of around $5 per 1,000 requests [2].
- **Analysis and Summarization (Cost-Efficient LLMs)**: For synthesizing findings, cost-efficient LLMs will be integrated:
  - **Groq**: Recommended for summarization due to its speed and generous free tier for Llama 3 models (e.g., 500,000 tokens/day for Llama 3 8B) [3].
  - **DeepSeek**: Offers competitive pricing for models like DeepSeek-V3 (approx. $0.14 - $0.28 per 1M input tokens, $0.28 per 1M output tokens) for more complex analysis [3].
  - **OpenRouter**: Can be used as an aggregator to access various LLMs, including free models, and to find the most economical options across providers [3].

## 4. Operating Principles

1.  **Check existing tools first**: Before writing new scripts, check the `execution/` directory according to the directive. Create new scripts only if none exist.
2.  **Self-correct when something breaks**: Read error messages and stack traces. Fix scripts and retest. If paid tokens/credits are involved, ask the user first. Update the directive with learnings (API limits, timing constraints, edge cases).
3.  **Update directives as you learn**: Directives are living documents. Update them when discovering API constraints, better approaches, common errors, or timing expectations. Do not create or overwrite directives without explicit instruction. Directives must be preserved and improved over time.

## 5. File Organization

### Deliverables vs. Intermediates

- **Deliverables**: Cloud-based outputs accessible to the user (e.g., Google Sheets, Google Slides, or the deployed 'Brief' application).
- **Intermediates**: Temporary files needed during processing.

### Directory Rules

- `.tmp/`: All intermediate files (folders, scraped data, temporary exports). Never commit to version control. Always regenerable.
- `execution/`: Deterministic Python scripts (tools) for Layer 3.
- `directives/`: Markdown SOPs (instruction set) for Layer 1.
- `.env`: Environment variables and API keys for local development.
- `credentials.json`, `token.json`: Google OAuth credentials (must be in `.gitignore`).

**Key principle**: Local files are only for processing. Deliverables live in cloud services where the user can access them. Everything in `.tmp/` can be deleted and regenerated at any time.

## 6. Project Structure Example

```plaintext
project-root/
├── frontend/ # Next.js app
│   ├── app/ # Next.js App Router
│   ├── components/ # React components
│   ├── public/ # Static assets
│   └── package.json
├── functions/ # Firebase Cloud Functions
│   ├── index.js # Entry point for Cloud Functions
│   ├── package.json # Cloud Function dependencies
│   └── .env # Environment variables for Cloud Functions (securely managed)
├── directives/ # Markdown SOPs
├── execution/ # Utility Python scripts
├── .tmp/ # Intermediate files
└── .env # Environment variables for local development
```

## 7. Workspace Skills

- **UI/UX Design Skill**: `ai-marketing-claude/skills/ui-ux-pro-max/SKILL.md`
  - Use this skill for UI/UX direction, design system generation, and frontend implementation quality checks.

## References

[1] Firebase Pricing. (n.d.). _Firebase_. Retrieved from [https://firebase.google.com/pricing](https://firebase.google.com/pricing)
[2] Perplexity API Pricing. (n.d.). _Perplexity Docs_. Retrieved from [https://docs.perplexity.ai/docs/pricing](https://docs.perplexity.ai/docs/pricing)
[3] Cost-Efficient LLM APIs. (2025). _Various sources including Reddit and AI API comparison blogs_.
