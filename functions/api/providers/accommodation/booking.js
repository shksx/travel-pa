// Booking.com Demand API provider — STUB.
// Activates only when BOOKING_AFFILIATE_ID (and eventually BOOKING_API_KEY for
// the full Demand API) is set in Cloudflare env. Until application is approved
// (see AFFILIATE_API_SETUP.md §1), this returns an explanatory error so the
// registry can fall back to mock without crashing.
//
// When credentials land, replace the body of searchAccommodation() with a real
// call to https://distribution-xml.booking.com/json/bookings.getHotels (or the
// successor endpoint for the program tier we're approved for) and coerce each
// hotel into the AccommodationResult shape from ../schema.js.

import { getCreds } from "../affiliate.js";

export const name = "booking";
export const supports = "accommodation";

export async function searchAccommodation(_input, env) {
  const creds = getCreds(env, "booking");
  if (!creds.active) {
    return {
      error: `Booking provider not configured. Missing env vars: ${creds.missing.join(", ")}.`,
      provider_inactive: true,
    };
  }

  // TODO: implement Demand API call once approved. The aid= deep-link parameter
  // carries our affiliate ID — every booking_links.booking URL we emit must
  // include `aid=${creds.values.BOOKING_AFFILIATE_ID}`.
  return {
    error: "Booking provider implementation pending — credentials present but real API call not yet wired.",
    provider_inactive: true,
  };
}
