// Cloudflare Pages Function: POST /api/chat
// Proxies a chat conversation to Anthropic Claude, with tool use support.
// Tools currently available: search_flights (Google Flights via SearchAPI.io).
//
// Required env vars (set in Cloudflare Pages → Settings → Environment variables):
//   ANTHROPIC_API_KEY  — Anthropic console key
//   SEARCHAPI_API_KEY  — SearchAPI.io key (https://www.searchapi.io)

const MODEL = "claude-sonnet-4-6";
const MAX_TOKENS = 2048;
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
  const system = buildSystemPrompt(prefs);

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
      return json({ reply: textBlock?.text ?? "" });
    }

    // Execute every tool_use block this turn requested, then feed results back.
    const toolResultBlocks = [];
    for (const block of content) {
      if (block.type !== "tool_use") continue;
      const result = await executeTool(block.name, block.input, env);
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

async function executeTool(name, input, env) {
  if (name === "search_flights") {
    return await searchFlights(input, env);
  }
  return { error: `Unknown tool: ${name}` };
}

// ───────────────────────── SearchAPI.io Google Flights ─────────────────────────
// Docs: https://www.searchapi.io/docs/google-flights-api

async function searchFlights(input, env) {
  if (!env.SEARCHAPI_API_KEY) {
    return { error: "Server is missing SEARCHAPI_API_KEY environment variable." };
  }

  const { origin, destination, departure_date, return_date, adults, travel_class } = input || {};
  if (!origin || !destination || !departure_date) {
    return { error: "search_flights requires origin, destination, and departure_date." };
  }

  const params = new URLSearchParams({
    engine: "google_flights",
    api_key: env.SEARCHAPI_API_KEY,
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departure_date,
    flight_type: return_date ? "round_trip" : "one_way",
    adults: String(adults || 1),
    currency: "AUD",
    gl: "au",
    hl: "en",
  });
  if (return_date) params.set("return_date", return_date);
  if (travel_class) params.set("travel_class", travel_class);

  let resp;
  try {
    resp = await fetch(`https://www.searchapi.io/api/v1/search?${params.toString()}`);
  } catch (e) {
    return { error: "Network error reaching SearchAPI.", details: String(e) };
  }
  if (!resp.ok) {
    const details = await resp.text();
    return { error: `SearchAPI returned ${resp.status}.`, details: details.slice(0, 500) };
  }

  const data = await resp.json();

  // SearchAPI returns best_flights and other_flights — combine, take top 5.
  const raw = [...(data.best_flights || []), ...(data.other_flights || [])].slice(0, 5);

  const offers = raw.map((o) => ({
    price: o.price != null ? `${o.price} AUD` : "n/a",
    total_duration_min: o.total_duration,
    type: o.type,
    carbon_emissions_kg: o.carbon_emissions?.this_flight
      ? Math.round(o.carbon_emissions.this_flight / 1000)
      : null,
    layovers: (o.layovers || []).map((l) => ({
      airport: l.id || l.name,
      duration_min: l.duration,
      overnight: l.overnight,
    })),
    segments: (o.flights || []).map((s) => ({
      from: s.departure_airport?.id,
      from_name: s.departure_airport?.name,
      to: s.arrival_airport?.id,
      to_name: s.arrival_airport?.name,
      depart: s.departure_airport?.time,
      arrive: s.arrival_airport?.time,
      airline: s.airline,
      flight_number: s.flight_number,
      duration_min: s.duration,
      travel_class: s.travel_class,
    })),
  }));

  return {
    offers,
    count: offers.length,
    price_insights: data.price_insights
      ? {
          lowest_price: data.price_insights.lowest_price,
          typical_price_range: data.price_insights.typical_price_range,
          price_level: data.price_insights.price_level,
        }
      : null,
    source: "Google Flights via SearchAPI.io (real prices in AUD)",
  };
}

// ───────────────────────── helpers ─────────────────────────

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function buildSystemPrompt(prefs) {
  const today = new Date().toISOString().slice(0, 10);
  const lines = [
    "You are Travel PA, a proactive and deeply personalized travel assistant.",
    "Be warm, concise, and practical. Surface useful context the user might not have asked about (last train times, visa rules, weather, crowd patterns) when it genuinely helps.",
    "",
    `Today's date is ${today}. Use this when interpreting relative dates like "next Friday" or "in two weeks".`,
    "",
    "When the user asks about flights, schedules, or prices, ALWAYS use the search_flights tool — never invent flight numbers, times, or prices from your training data. Convert city names to IATA airport codes yourself before calling the tool (e.g. Seoul=ICN, Da Nang=DAD, Sydney=SYD, Melbourne=MEL, Tokyo=HND/NRT, Bangkok=BKK, London=LHR).",
    "When you receive tool results, summarize them naturally: airline, depart/arrive times, total duration, number of stops/layovers, and price in AUD. Highlight the best value or best match for the user's preferences. If price_insights is included, mention whether the price is low/typical/high vs the historical range.",
    "If a tool fails or returns no results, tell the user clearly rather than inventing data.",
    "For everything else (weather, traffic, hotels, current events) where no tool exists yet, say so plainly and offer what general guidance you can.",
    "",
    "Format replies as plain text. Use line breaks for structure. Do not use markdown headings, asterisks, or HTML tags.",
  ];
  const prefBlock = formatPrefs(prefs);
  if (prefBlock) lines.push("", "== Known user preferences ==", prefBlock);
  return lines.join("\n");
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
