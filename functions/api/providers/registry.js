// Provider registry — single entry point for accommodation and flight search.
//
// Behaviour:
//   1. For each provider relevant to the search kind, check whether its env-var
//      credentials are set (see affiliate.js / PROVIDER_ENV).
//   2. If at least one real provider is active, query the first active one.
//      (Multi-provider fan-out + result merging is a follow-up — see
//      AFFILIATE_API_SETUP.md "Integration prep" §1.)
//   3. Otherwise, fall back to the mock provider so the rest of the app keeps
//      working in dev without credentials.
//   4. `env.MOCK_PROVIDERS` (comma-separated, e.g. "flights,accommodation")
//      forces mock for the listed kinds even when real creds are present —
//      useful for offline UI work or canned demos.

import { getCreds } from "./affiliate.js";

import * as searchapi from "./flights/searchapi.js";
import * as flightsMock from "./flights/mock.js";

import * as bookingProvider from "./accommodation/booking.js";
import * as accommodationMock from "./accommodation/mock.js";

const FLIGHT_PROVIDERS = [searchapi];           // skyscanner, kiwi, amadeus to be added as approved
const ACCOMMODATION_PROVIDERS = [bookingProvider]; // expedia, hostelworld, agoda to be added as approved

function mockForced(env, kind) {
  const list = String(env?.MOCK_PROVIDERS || "").toLowerCase().split(/[,\s]+/).filter(Boolean);
  return list.includes(kind);
}

function pickActive(env, providers) {
  // SearchAPI is the one currently-active flight provider — it doesn't go
  // through PROVIDER_ENV's affiliate flow because it's a paid metasearch API
  // rather than an affiliate program. Treat any provider whose own creds-check
  // passes (or which doesn't declare creds via PROVIDER_ENV) as eligible.
  return providers.filter((p) => {
    const creds = getCreds(env, p.name);
    return creds.active;
  });
}

export async function searchFlights(input, env, prefs) {
  if (mockForced(env, "flights")) return flightsMock.searchFlights(input, env, prefs);

  const active = pickActive(env, FLIGHT_PROVIDERS);
  if (active.length === 0) return flightsMock.searchFlights(input, env, prefs);

  // Future: fan out to all active providers, merge, dedupe, re-rank.
  return active[0].searchFlights(input, env, prefs);
}

export async function searchAccommodation(input, env, prefs) {
  if (mockForced(env, "accommodation")) return accommodationMock.searchAccommodation(input, env, prefs);

  const active = pickActive(env, ACCOMMODATION_PROVIDERS);
  if (active.length === 0) return accommodationMock.searchAccommodation(input, env, prefs);

  return active[0].searchAccommodation(input, env, prefs);
}

// Diagnostics — handy for a future /api/dev/providers status page.
export function listProviderStatus(env) {
  const status = (providers, kind) => providers.map((p) => {
    const creds = getCreds(env, p.name);
    return { name: p.name, kind, active: creds.active, missing: creds.missing };
  });
  return {
    flights: status(FLIGHT_PROVIDERS, "flights"),
    accommodation: status(ACCOMMODATION_PROVIDERS, "accommodation"),
    mock_forced: String(env?.MOCK_PROVIDERS || "").toLowerCase().split(/[,\s]+/).filter(Boolean),
  };
}
