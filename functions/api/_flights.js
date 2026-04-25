// Backward-compat shim. The flight-search implementation moved to
// ./providers/ as part of the affiliate-API integration scaffolding
// (see AFFILIATE_API_SETUP.md). New code should import from
// ./providers/registry.js directly.

export { searchFlights } from "./providers/registry.js";
export { rankOffers, buildSearchLinks } from "./providers/flights/_shared.js";
