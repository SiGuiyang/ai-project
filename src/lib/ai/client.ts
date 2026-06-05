import { AI_CONFIG } from "./config";

class AiError extends Error {
  constructor(
    message: string,
    public readonly status?: number,
  ) {
    super(message);
    this.name = "AiError";
  }
}

async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeoutMs: number,
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(timeout);
  }
}

export async function callAI(
  systemPrompt: string,
  userContent: string,
  maxRetries = 2,
): Promise<string> {
  const { baseUrl, apiKey, model, maxTokens, temperature } = AI_CONFIG;

  if (!apiKey) {
    throw new AiError("AI_API_KEY is not configured");
  }

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetchWithTimeout(
        `${baseUrl.replace(/\/$/, "")}/v1/chat/completions`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${apiKey}`,
          },
          body: JSON.stringify({
            model,
            messages: [
              { role: "system", content: systemPrompt },
              { role: "user", content: userContent },
            ],
            max_tokens: maxTokens,
            temperature,
          }),
        },
        60_000,
      );

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new AiError(
          `AI API error: ${response.status} ${response.statusText}${body ? ` - ${body}` : ""}`,
          response.status,
        );
      }

      const json = await response.json();
      const text = json.choices?.[0]?.message?.content;

      if (!text) {
        throw new AiError("AI response missing content");
      }

      return text;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));
      if (attempt < maxRetries) {
        await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
      }
    }
  }

  throw lastError ?? new AiError("AI call failed after retries");
}
