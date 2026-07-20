const ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models";

// `-latest` rather than a pinned version: Google retires dated model ids on its own schedule, and a
// pin that silently 404s is worse than tracking the current flash model. Override per environment.
const DEFAULT_MODEL = "gemini-flash-latest";

/**
 * Gemini is asked for structured output rather than free text. `responseSchema` makes the JSON shape
 * a decoding constraint instead of a prompt request, which removes the markdown-fence stripping and
 * parse-retry loop the previous provider needed.
 */
const OUTREACH_SCHEMA = {
  type: "OBJECT",
  properties: {
    subject: { type: "STRING", description: "Catchy, professional email subject line" },
    email: { type: "STRING", description: "Personalized email body, strictly 60 to 90 words" },
    dm: { type: "STRING", description: "Personalized Instagram DM, strictly 15 to 30 words" },
  },
  required: ["subject", "email", "dm"],
} as const;

export async function generateOutreach(args: { system: string; prompt: string; apiKey: string; model?: string }) {
  const model = args.model || DEFAULT_MODEL;
  const response = await fetch(`${ENDPOINT}/${model}:generateContent`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-goog-api-key": args.apiKey },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: args.system }] },
      contents: [{ role: "user", parts: [{ text: args.prompt }] }],
      generationConfig: {
        temperature: 0.45,
        // Flash models reason before answering and bill that thinking against the output budget.
        // At 900 tokens the draft was truncated before it finished, so thinking is disabled (the
        // task is short-form copy, not reasoning) and the ceiling is raised well clear of two
        // ~90-word messages plus a subject line.
        thinkingConfig: { thinkingBudget: 0 },
        maxOutputTokens: 2048,
        responseMimeType: "application/json",
        responseSchema: OUTREACH_SCHEMA,
      },
    }),
    signal: AbortSignal.timeout(25_000),
  });

  if (!response.ok) {
    // Gemini returns a structured error body; surfacing its message makes key and quota problems
    // diagnosable instead of collapsing every failure into a bare status code.
    const detail = await response
      .json()
      .then((body: { error?: { message?: string } }) => body?.error?.message)
      .catch(() => null);
    throw new Error(detail ? `Gemini error: ${detail}` : `Gemini returned ${response.status}.`);
  }

  const body = (await response.json()) as {
    candidates?: Array<{ content?: { parts?: Array<{ text?: string }> }; finishReason?: string }>;
    promptFeedback?: { blockReason?: string };
  };

  if (body.promptFeedback?.blockReason) {
    throw new Error(`Gemini blocked this brief (${body.promptFeedback.blockReason}).`);
  }

  const candidate = body.candidates?.[0];
  if (candidate?.finishReason === "MAX_TOKENS") {
    throw new Error("Gemini response was truncated before completing the draft.");
  }

  const content = candidate?.content?.parts?.map((part) => part.text ?? "").join("").trim();
  if (!content) throw new Error("Gemini returned an empty response.");
  return content;
}
