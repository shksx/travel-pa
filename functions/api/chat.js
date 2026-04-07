// Cloudflare Pages Function: POST /api/chat
// Proxies a chat conversation to the Anthropic Claude API.
// Reads ANTHROPIC_API_KEY from Pages environment variables (set in Cloudflare dashboard).

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 1024;

export async function onRequestPost(context) {
  const { request, env } = context;

  if (!env.ANTHROPIC_API_KEY) {
    return json({ error: "Server is missing ANTHROPIC_API_KEY environment variable." }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { messages, prefs } = body;
  if (!Array.isArray(messages) || messages.length === 0) {
    return json({ error: "Request must include a non-empty `messages` array." }, 400);
  }

  const system = buildSystemPrompt(prefs);

  let apiResp;
  try {
    apiResp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": env.ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
      }),
    });
  } catch (e) {
    return json({ error: "Network error reaching Claude API.", details: String(e) }, 502);
  }

  if (!apiResp.ok) {
    const details = await apiResp.text();
    return json({ error: `Claude API returned ${apiResp.status}.`, details }, 502);
  }

  const data = await apiResp.json();
  const reply = data?.content?.[0]?.text ?? "";
  return json({ reply });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(prefs) {
  const lines = [
    "You are Travel PA, a proactive and deeply personalized travel assistant.",
    "Be warm, concise, and practical. Surface useful context the user might not have asked about (last train times, visa rules, weather, crowd patterns) when it genuinely helps.",
    "If you don't have real-time data for something — live flight prices, current weather, traffic — say so plainly rather than inventing numbers. It's better to admit a gap than mislead.",
    "Format replies as plain text. Use line breaks for structure. Do not use markdown headings, asterisks, or HTML tags.",
  ];

  const prefBlock = formatPrefs(prefs);
  if (prefBlock) {
    lines.push("", "== Known user preferences ==", prefBlock);
  }

  return lines.join("\n");
}

// The frontend stores prefs in localStorage under key `tpa3` with prefixed keys
// (t_ = toggle, i_ = input, s_ = select, r_ = radio, c_ = chips). We render them
// as a flat readable list for the system prompt.
function formatPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return "";
  const out = [];
  for (const [key, value] of Object.entries(prefs)) {
    if (value === null || value === undefined || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const label = key.length > 2 && key[1] === "_" ? key.slice(2) : key;
    const val = Array.isArray(value) ? value.join(", ") : String(value);
    out.push(`- ${label}: ${val}`);
  }
  return out.join("\n");
}
