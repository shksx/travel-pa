// Cloudflare Pages Function: POST /api/dev/flights
// Dev-only endpoint that calls searchFlights() directly — no Claude in the loop.
// Purpose: iterate on the flight-search tool implementation and the UI cards
// without burning Anthropic tokens on every test.
//
// Request body: { origin, destination, departure_date, return_date?, adults?, travel_class?, prefs? }
// Response shape matches the tool_calls entries returned by /api/chat so the
// same renderFlightCard() code path can consume it.
//
// Optional gate: set DEV_TOKEN in Cloudflare Pages env vars to require an
// x-dev-token header on requests. If DEV_TOKEN is not set, the endpoint is open.

import { searchFlights } from "../providers/registry.js";

export async function onRequestPost(context) {
  const { request, env } = context;

  if (env.DEV_TOKEN) {
    const provided = request.headers.get("x-dev-token");
    if (provided !== env.DEV_TOKEN) {
      return json({ error: "Unauthorized. Missing or invalid x-dev-token header." }, 401);
    }
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Request body must be valid JSON." }, 400);
  }

  const { origin, destination, departure_date, return_date, adults, travel_class, prefs } = body || {};
  if (!origin || !destination || !departure_date) {
    return json({ error: "origin, destination, and departure_date are required." }, 400);
  }

  const input = { origin, destination, departure_date, return_date, adults, travel_class };
  const output = await searchFlights(input, env, prefs);

  return json({ tool: "search_flights", input, output });
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}
