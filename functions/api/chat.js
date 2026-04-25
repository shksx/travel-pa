// Cloudflare Pages Function: POST /api/chat
// Proxies a chat conversation to Anthropic Claude, with tool use support.
// Tools currently available: search_flights (Google Flights via SearchAPI.io).
// Booking deep-links are generated for: Google Flights, Skyscanner, Kayak, Expedia.
//
// Required env vars (set in Cloudflare Pages → Settings → Environment variables):
//   ANTHROPIC_API_KEY  — Anthropic console key
//   SEARCHAPI_API_KEY  — SearchAPI.io key (https://www.searchapi.io)

import { searchFlights } from "./providers/registry.js";

const MODEL = "claude-haiku-4-5-20251001";
const MAX_TOKENS = 4096;
const MAX_TOOL_ITERATIONS = 5; // safety cap on tool-use loop

const TOOLS = [
  {
    name: "search_flights",
    description:
      "Search Google Flights for real flight offers between two airports. Use this whenever the user asks about flight prices, schedules, or availability. Convert city names to IATA airport codes yourself (e.g. Seoul=ICN, Da Nang=DAD, Sydney=SYD, Melbourne=MEL, Tokyo=HND or NRT, Bangkok=BKK, London=LHR). Returns flight offers with airline, times, duration, stops, and real prices in AUD.",
    input_schema: {
      type: "object",
      properties: {
        origin: {
          type: "string",
          description: "IATA airport code for departure (e.g. 'DAD', 'SYD', 'ICN').",
        },
        destination: {
          type: "string",
          description: "IATA airport code for arrival.",
        },
        departure_date: {
          type: "string",
          description: "Departure date in YYYY-MM-DD format.",
        },
        return_date: {
          type: "string",
          description: "Optional return date in YYYY-MM-DD format. Omit for one-way.",
        },
        adults: {
          type: "integer",
          description: "Number of adult passengers. Defaults to 1.",
        },
        travel_class: {
          type: "string",
          enum: ["economy", "premium_economy", "business", "first"],
          description: "Cabin class. Defaults to economy.",
        },
      },
      required: ["origin", "destination", "departure_date"],
    },
  },
];

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

  const { messages: clientMessages, prefs } = body;
  if (!Array.isArray(clientMessages) || clientMessages.length === 0) {
    return json({ error: "Request must include a non-empty `messages` array." }, 400);
  }

  // Working copy — we'll append assistant + tool result turns as the loop runs.
  const messages = clientMessages.map((m) => ({ role: m.role, content: m.content }));
  const system = buildSystem(prefs);

  // Collect tool calls + results across the loop so the frontend can render
  // structured data (flight cards, etc.) alongside Claude's text reply.
  const toolCalls = [];

  for (let iter = 0; iter < MAX_TOOL_ITERATIONS; iter++) {
    const claudeResp = await callClaude({
      apiKey: env.ANTHROPIC_API_KEY,
      system,
      messages,
      tools: TOOLS,
    });

    if (claudeResp.error) {
      return json({ error: claudeResp.error, details: claudeResp.details }, 502);
    }

    const { stop_reason, content } = claudeResp.data;

    // Always append the assistant turn (preserving full content blocks so tool_use IDs match).
    messages.push({ role: "assistant", content });

    if (stop_reason !== "tool_use") {
      const textBlock = content.find((b) => b.type === "text");
      return json({ reply: textBlock?.text ?? "", tool_calls: toolCalls });
    }

    // Execute every tool_use block this turn requested, then feed results back.
    const toolResultBlocks = [];
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(block.name, block.input, env, prefs);
      toolCalls.push({ tool: block.name, input: block.input, output: result });
      toolResultBlocks.push({
        type: "tool_result",
        tool_use_id: block.id,
        content: typeof result === "string" ? result : JSON.stringify(result),
        is_error: !!(result && result.error),
      });
    }

    messages.push({ role: "user", content: toolResultBlocks });
  }

  return json({ error: "Tool use loop exceeded max iterations." }, 500);
}

async function callClaude({ apiKey, system, messages, tools }) {
  let resp;
  try {
    resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODEL,
        max_tokens: MAX_TOKENS,
        system,
        messages,
        tools,
      }),
    });
  } catch (e) {
    return { error: "Network error reaching Claude API.", details: String(e) };
  }
  if (!resp.ok) {
    const details = await resp.text();
    return { error: `Claude API returned ${resp.status}.`, details };
  }
  return { data: await resp.json() };
}

async function executeTool(name, input, env, prefs) {
  if (name === "search_flights") {
    return await searchFlights(input, env, prefs);
  }
  return { error: `Unknown tool: ${name}` };
}

// ───────────────────────── helpers ─────────────────────────

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

// Layer 1 — agent rules, identical for every user. Cached for 5 min via
// cache_control below. Keep this string byte-stable across requests; any
// change invalidates the cache. Today's date and per-user prefs go in
// Layer 2 (after the breakpoint) so the static prefix stays cacheable.
const LAYER_1_AGENT_RULES = [
  "You are Travel PA, a proactive and deeply personalized travel assistant for digital nomads.",
  "Be warm, concise, and practical. Surface useful context the user might not have asked about (last train times, visa rules, weather, crowd patterns) when it genuinely helps.",
  "",
  "== Flight search flow ==",
  "When the user asks about flights, follow this flow exactly:",
  "1. PARSE intent and constraints from the message: origin, destination, dates, number of passengers, cabin class, flexibility.",
  "   - If the user gives only a departure date with no return date, treat it as a one-way search. Do NOT ask whether they want a return — they would have said so. Only ask about a return date if the user explicitly mentions one but the date is unclear.",
  "   - If the user mentions returning, coming back, or a round trip but didn't give a return date, then ask for it.",
  "   - Default passengers to 1 adult and cabin to economy unless the user says otherwise or saved preferences specify otherwise.",
  "2. CHECK saved preferences (listed below) for: preferred airlines, direct-only, no overnight flights, cabin class, seat preference, budget range.",
  "3. CALL the search_flights tool with the correct IATA codes — convert city names yourself (e.g. Seoul=ICN, Da Nang=DAD, Sydney=SYD, Melbourne=MEL, Tokyo=HND or NRT, Bangkok=BKK, London=LHR, Bali=DPS, Singapore=SIN, Ho Chi Minh City=SGN, Hanoi=HAN, Kuala Lumpur=KUL, Dubai=DXB). Never invent flight data.",
  "4. FILTER & RANK results against the user's preferences: flag if a flight violates direct-only, overnight, or airline preferences. Surface the best match first.",
  "5. EXPLAIN each option naturally: airline, depart/arrive times, total duration, stops, price in AUD. Always describe prices as 'around' or 'approximately' — they come from a cached search feed (up to 1 hour old) and actual fares can differ. Mention any tradeoff (e.g. cheaper but has a stop, or premium but direct).",
  "6. MENTION price context: if price_insights is included, say whether the price is lower/typical/higher than the historical range.",
  "7. SUGGEST next step: encourage the user to save the flight and click through to Google Flights, Skyscanner, Kayak, or Expedia using the booking links on the cards to see the live fare before booking. Remind them the prices shown are indicative estimates.",
  "If the search_flights tool returns an error: do NOT just apologise. Immediately provide the search_links from the error response as clickable links so the user can search manually. Say something like: 'The live search hit a technical issue, but you can search directly on these platforms:' then list the links. Also mention the error briefly so the developer knows what failed.",
  "If the tool returns no results (empty offers array): ask the user if they want to try different dates or a nearby airport.",
  "",
  "For everything else (weather, traffic, hotels, current events) where no tool exists yet, say so plainly and offer what general guidance you can.",
  "",
  "Format replies as plain text. Use line breaks for structure. Do not use markdown headings, asterisks, or HTML tags.",
].join("\n");

function buildSystem(prefs) {
  const today = new Date().toISOString().slice(0, 10);
  const dynamicLines = [
    `Today's date is ${today}. Use this when interpreting relative dates like "next Friday" or "in two weeks".`,
  ];
  const prefBlock = formatPrefs(prefs);
  if (prefBlock) dynamicLines.push("", "== Known user preferences ==", prefBlock);

  return [
    {
      type: "text",
      text: LAYER_1_AGENT_RULES,
      cache_control: { type: "ephemeral" },
    },
    {
      type: "text",
      text: dynamicLines.join("\n"),
    },
  ];
}

// Frontend stores prefs in localStorage under key `tpa3` with prefixed keys
// (t_=toggle, i_=input, s_=select, r_=radio, c_=chips). Render flat for the prompt.
function formatPrefs(prefs) {
  if (!prefs || typeof prefs !== "object") return "";
  const out = [];
  for (const [key, value] of Object.entries(prefs)) {
    if (value == null || value === "") continue;
    if (Array.isArray(value) && value.length === 0) continue;
    const label = key.length > 2 && key[1] === "_" ? key.slice(2) : key;
    const val = Array.isArray(value) ? value.join(", ") : String(value);
    out.push(`- ${label}: ${val}`);
  }
  return out.join("\n");
}
