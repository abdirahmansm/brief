import { NextResponse } from "next/server";

const PRIMARY_ADMIN_EMAIL = "abdirahmansm02@gmail.com";

interface ProviderProbe {
  provider: "groq" | "openrouter" | "perplexity";
  configured: boolean;
  ok: boolean;
  status: number | null;
  note: string;
  checkedAt: string;
}

async function probeGroq(): Promise<ProviderProbe> {
  const key = process.env.GROQ_API_KEY;
  if (!key) {
    return {
      provider: "groq",
      configured: false,
      ok: false,
      status: null,
      note: "GROQ_API_KEY missing",
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch("https://api.groq.com/openai/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    return {
      provider: "groq",
      configured: true,
      ok: response.ok,
      status: response.status,
      note: response.ok
        ? "Groq reachable"
        : `Groq responded with status ${response.status}`,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider: "groq",
      configured: true,
      ok: false,
      status: null,
      note: error instanceof Error ? error.message : "Groq probe failed",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function probeOpenRouter(): Promise<ProviderProbe> {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    return {
      provider: "openrouter",
      configured: false,
      ok: false,
      status: null,
      note: "OPENROUTER_API_KEY missing",
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch("https://openrouter.ai/api/v1/models", {
      headers: {
        Authorization: `Bearer ${key}`,
      },
      cache: "no-store",
    });

    return {
      provider: "openrouter",
      configured: true,
      ok: response.ok,
      status: response.status,
      note: response.ok
        ? "OpenRouter reachable"
        : `OpenRouter responded with status ${response.status}`,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider: "openrouter",
      configured: true,
      ok: false,
      status: null,
      note: error instanceof Error ? error.message : "OpenRouter probe failed",
      checkedAt: new Date().toISOString(),
    };
  }
}

async function probePerplexity(): Promise<ProviderProbe> {
  const key = process.env.PERPLEXITY_API_KEY;
  if (!key) {
    return {
      provider: "perplexity",
      configured: false,
      ok: false,
      status: null,
      note: "PERPLEXITY_API_KEY missing",
      checkedAt: new Date().toISOString(),
    };
  }

  try {
    const response = await fetch("https://api.perplexity.ai/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: process.env.PERPLEXITY_MODEL || "sonar",
        messages: [{ role: "user", content: "Return JSON {\"ok\":true}" }],
        temperature: 0,
      }),
      cache: "no-store",
    });

    return {
      provider: "perplexity",
      configured: true,
      ok: response.ok,
      status: response.status,
      note: response.ok
        ? "Perplexity reachable"
        : `Perplexity responded with status ${response.status}`,
      checkedAt: new Date().toISOString(),
    };
  } catch (error) {
    return {
      provider: "perplexity",
      configured: true,
      ok: false,
      status: null,
      note: error instanceof Error ? error.message : "Perplexity probe failed",
      checkedAt: new Date().toISOString(),
    };
  }
}

export async function GET(request: Request) {
  const adminEmail =
    request.headers.get("x-admin-email")?.trim().toLowerCase() || "";
  const allowlistHeader = request.headers.get("x-admin-allowlist") || "";
  const allowlist = Array.from(
    new Set(
      allowlistHeader
        .split(",")
        .map((item) => item.trim().toLowerCase())
        .filter(Boolean)
        .concat([PRIMARY_ADMIN_EMAIL])
    )
  );

  if (!allowlist.includes(adminEmail)) {
    return NextResponse.json(
      {
        error:
          "Not an admin registered email unless abdirahmansm02@gmail.com adds more admin emails.",
      },
      { status: 403 }
    );
  }

  const probes = await Promise.all([
    probeGroq(),
    probeOpenRouter(),
    probePerplexity(),
  ]);

  return NextResponse.json({
    checkedAt: new Date().toISOString(),
    modelConfig: {
      groqSimple: process.env.GROQ_SIMPLE_MODEL || "llama-3.1-8b-instant",
      groqDeep: process.env.GROQ_DEEP_MODEL || "llama-3.3-70b-versatile",
      openRouterSimple:
        process.env.OPENROUTER_SIMPLE_MODEL ||
        "meta-llama/llama-3.1-8b-instruct:free",
      openRouterDeep:
        process.env.OPENROUTER_DEEP_MODEL || "meta-llama/llama-3.1-70b-instruct",
      perplexityModel: process.env.PERPLEXITY_MODEL || "sonar",
    },
    probes,
    note:
      "Most providers do not expose exact remaining dollar balance via this runtime endpoint. Use provider billing dashboards for exact credits.",
  });
}
