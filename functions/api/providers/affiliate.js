// Centralised affiliate-ID / API-key config.
// Every provider reads its credentials through here so we never hard-code IDs
// and can swap them per environment (dev/staging/prod) via Cloudflare Pages
// environment variables.
//
// As affiliate programs approve us, set the matching env var in
// Cloudflare Pages → Settings → Environment variables. A provider whose
// required env vars are missing is treated as inactive by the registry
// (see registry.js).

/**
 * @typedef {Object} ProviderCreds
 * @property {boolean} active        - True when all required vars are present
 * @property {string[]} missing      - Names of missing vars (for diagnostics)
 * @property {Object<string,string>} values - Resolved values (only when active)
 */

/**
 * Read credentials for a single provider.
 * @param {Object} env - Cloudflare env binding
 * @param {string[]} requiredVars
 * @returns {ProviderCreds}
 */
export function readCreds(env, requiredVars) {
  const missing = [];
  const values = {};
  for (const name of requiredVars) {
    const v = env?.[name];
    if (!v) missing.push(name);
    else values[name] = v;
  }
  return { active: missing.length === 0, missing, values };
}

// Per-provider required-var declarations. Single source of truth — registry.js
// uses these to decide which providers are active in the current environment.
export const PROVIDER_ENV = {
  // Flights
  searchapi: ["SEARCHAPI_API_KEY"],          // existing — Google Flights via SearchAPI.io
  skyscanner: ["SKYSCANNER_API_KEY", "SKYSCANNER_PARTNER_ID"],
  kiwi: ["KIWI_API_KEY", "KIWI_AFFILIATE_ID"],
  amadeus: ["AMADEUS_CLIENT_ID", "AMADEUS_CLIENT_SECRET"],

  // Accommodation
  booking: ["BOOKING_AFFILIATE_ID"],         // Demand API also needs BOOKING_API_KEY once granted
  expedia: ["EXPEDIA_API_KEY", "EXPEDIA_PARTNER_ID"],
  hostelworld: ["HOSTELWORLD_AFFILIATE_ID"],
  agoda: ["AGODA_SITE_ID", "AGODA_API_KEY"],
};

export function getCreds(env, providerName) {
  const required = PROVIDER_ENV[providerName];
  if (!required) {
    return { active: false, missing: [`unknown provider: ${providerName}`], values: {} };
  }
  return readCreds(env, required);
}
