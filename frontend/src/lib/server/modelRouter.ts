type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface GenerateParams {
  mode: "simple" | "deep";
  messages: ChatMessage[];
  temperature?: number;
}

const DEFAULT_OPENROUTER_SIMPLE_MODEL =
  process.env.OPENROUTER_SIMPLE_MODEL || "meta-llama/llama-3.1-8b-instruct:free";
const DEFAULT_OPENROUTER_DEEP_MODEL =
  process.env.OPENROUTER_DEEP_MODEL || "meta-llama/llama-3.1-70b-instruct";
const DEFAULT_GROQ_SIMPLE_MODEL =
  process.env.GROQ_SIMPLE_MODEL || "llama-3.1-8b-instant";
const DEFAULT_GROQ_DEEP_MODEL =
  process.env.GROQ_DEEP_MODEL || "llama-3.3-70b-versatile";
const DEFAULT_PERPLEXITY_MODEL = process.env.PERPLEXITY_MODEL || "sonar";

const OPENROUTER_SAFE_FALLBACKS = [
  "meta-llama/llama-3.1-8b-instruct:free",
  "meta-llama/llama-3.1-70b-instruct",
];

const GROQ_SAFE_FALLBACKS = [
  "llama-3.1-8b-instant",
  "llama-3.3-70b-versatile",
];

function uniqueNonEmpty(values: Array<string | undefined | null>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];

  values.forEach((value) => {
    const normalized = value?.trim();
    if (!normalized) return;
    if (seen.has(normalized)) return;
    seen.add(normalized);
    out.push(normalized);
  });

  return out;
}

function parseModelList(value?: string): string[] {
  if (!value) return [];
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractRetryWindow(errors: string[]): string | null {
  for (const error of errors) {
    const match = error.match(/try again in\s+([0-9a-zA-Z:.]+)/i);
    if (match?.[1]) {
      return match[1];
    }
  }
  return null;
}

function isCapacityError(error: string): boolean {
  return /(rate limit|429|tokens per day|capacity)/i.test(error);
}

function isModelUnavailableError(error: string): boolean {
  return /(no endpoints found|404)/i.test(error);
}

async function callPerplexity(
  messages: ChatMessage[],
  temperature = 0.3
): Promise<string> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error("PERPLEXITY_API_KEY is missing.");
  }

  const response = await fetch("https://api.perplexity.ai/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: DEFAULT_PERPLEXITY_MODEL,
      temperature,
      messages,
    }),
  });

  const bodyText = await response.text();
  if (!response.ok) {
    throw new Error(`Perplexity error ${response.status}: ${bodyText}`);
  }

  let json: any;
  try {
    json = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }> };
  } catch (err) {
    throw new Error(`Perplexity returned non-JSON response: ${bodyText.slice(0,1000)}`);
  }

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Perplexity returned empty content.");
  }

  return content;
}

async function callOpenRouter(
  model: string,
  messages: ChatMessage[],
  temperature = 0.3
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY is missing.");
  }

  const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
      "HTTP-Referer": "https://brief.local",
      "X-Title": "Brief AI",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`OpenRouter error ${response.status}: ${body}`);
  }

  const bodyText = await response.text();
  let json: any;
  try {
    json = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }> };
  } catch (err) {
    throw new Error(`OpenRouter returned non-JSON response: ${bodyText.slice(0,1000)}`);
  }

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("OpenRouter returned empty content.");
  }

  return content;
}

async function callGroq(
  model: string,
  messages: ChatMessage[],
  temperature = 0.3
): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) {
    throw new Error("GROQ_API_KEY is missing.");
  }

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature,
      messages,
      response_format: { type: "json_object" },
    }),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Groq error ${response.status}: ${body}`);
  }

  const bodyText = await response.text();
  let json: any;
  try {
    json = JSON.parse(bodyText) as { choices?: Array<{ message?: { content?: string } }> };
  } catch (err) {
    throw new Error(`Groq returned non-JSON response: ${bodyText.slice(0,1000)}`);
  }

  const content = json.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new Error("Groq returned empty content.");
  }

  return content;
}

export async function generateStructuredJson({
  mode,
  messages,
  temperature = 0.3,
}: GenerateParams): Promise<string> {
  const openRouterPrimary =
    mode === "simple" ? DEFAULT_OPENROUTER_SIMPLE_MODEL : DEFAULT_OPENROUTER_DEEP_MODEL;
  const groqPrimary =
    mode === "simple" ? DEFAULT_GROQ_SIMPLE_MODEL : DEFAULT_GROQ_DEEP_MODEL;

  const openRouterCandidates = uniqueNonEmpty([
    openRouterPrimary,
    ...parseModelList(process.env.OPENROUTER_MODEL_FALLBACKS),
    mode === "deep" ? DEFAULT_OPENROUTER_SIMPLE_MODEL : DEFAULT_OPENROUTER_DEEP_MODEL,
    ...OPENROUTER_SAFE_FALLBACKS,
  ]);

  const groqCandidates = uniqueNonEmpty([
    groqPrimary,
    ...parseModelList(process.env.GROQ_MODEL_FALLBACKS),
    mode === "deep" ? DEFAULT_GROQ_SIMPLE_MODEL : DEFAULT_GROQ_DEEP_MODEL,
    ...GROQ_SAFE_FALLBACKS,
  ]);

  const errors: string[] = [];

  if (process.env.OPENROUTER_API_KEY) {
    for (const model of openRouterCandidates) {
      try {
        return await callOpenRouter(model, messages, temperature);
      } catch (error) {
        const message = error instanceof Error ? error.message : "OpenRouter failed";
        errors.push(`OpenRouter:${model} -> ${message}`);
      }
    }
  }

  if (process.env.GROQ_API_KEY) {
    for (const model of groqCandidates) {
      try {
        return await callGroq(model, messages, temperature);
      } catch (error) {
        const message = error instanceof Error ? error.message : "Groq failed";
        errors.push(`Groq:${model} -> ${message}`);
      }
    }
  }

  if (process.env.PERPLEXITY_API_KEY) {
    try {
      return await callPerplexity(messages, temperature);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Perplexity failed";
      errors.push(`Perplexity -> ${message}`);
    }
  }

  const retryWindow = extractRetryWindow(errors);
  const capacityFailures = errors.filter(isCapacityError).length;
  const unavailableModelFailures = errors.filter(isModelUnavailableError).length;

  if (capacityFailures > 0) {
    const guidance = retryWindow
      ? `Try again in ${retryWindow} (Groq reset window).`
      : "Try again shortly after model capacity resets.";
    throw new Error(
      `Model capacity temporarily limited. The app tried OpenRouter, Groq, and Perplexity fallbacks, but the route still could not complete. ${guidance}`
    );
  }

  if (unavailableModelFailures > 0) {
    throw new Error(
      "Model configuration issue: one or more configured/fallback models are unavailable (no endpoint). Update model names in environment settings."
    );
  }

  throw new Error(
    "Model request failed after retrying fallback models. Please try again shortly."
  );
}
