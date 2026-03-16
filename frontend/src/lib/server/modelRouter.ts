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
  process.env.OPENROUTER_DEEP_MODEL || "qwen/qwen-2.5-72b-instruct:free";
const DEFAULT_GROQ_SIMPLE_MODEL =
  process.env.GROQ_SIMPLE_MODEL || "llama-3.1-8b-instant";
const DEFAULT_GROQ_DEEP_MODEL =
  process.env.GROQ_DEEP_MODEL || "llama-3.3-70b-versatile";

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

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

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

  const json = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };

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
  const groqFallback =
    mode === "simple" ? DEFAULT_GROQ_SIMPLE_MODEL : DEFAULT_GROQ_DEEP_MODEL;

  const errors: string[] = [];

  if (process.env.OPENROUTER_API_KEY) {
    try {
      return await callOpenRouter(openRouterPrimary, messages, temperature);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "OpenRouter failed");
    }
  }

  if (process.env.GROQ_API_KEY) {
    try {
      return await callGroq(groqFallback, messages, temperature);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : "Groq failed");
    }
  }

  throw new Error(`No model provider available. ${errors.join(" | ")}`);
}
