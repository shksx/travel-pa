// SearchAPI.io Google Flights provider.
// Docs: https://www.searchapi.io/docs/google-flights-api
//
// Returns FlightResult[] (see ../schema.js). Until per-airline affiliate APIs
// (Skyscanner, Kiwi) are approved, this is our primary flight source — it
// surfaces real Google Flights inventory and direct booking URLs when
// available, plus fallback search-page deep-links for Skyscanner/Kayak/Expedia.

import { rankOffers, buildSearchLinks } from "./_shared.js";

export const name = "searchapi";
export const supports = "flights";

export async function searchFlights(input, env, prefs) {
  if (!env.SEARCHAPI_API_KEY) {
    return { error: "Server is missing SEARCHAPI_API_KEY environment variable." };
  }

  const { origin, destination, departure_date, return_date, adults, travel_class } = input || {};
  if (!origin || !destination || !departure_date) {
    return { error: "search_flights requires origin, destination, and departure_date." };
  }

  // SearchAPI Google Flights param reference: https://www.searchapi.io/docs/google-flights
  //   type: 1=Round trip, 2=One way, 3=Multi-city  (numeric, NOT "round_trip"/"one_way")
  //   travel_class: 1=Economy, 2=Premium Economy, 3=Business, 4=First  (numeric)
  const hasReturn = return_date && String(return_date).trim() !== "";
  const baseParams = {
    engine: "google_flights",
    api_key: env.SEARCHAPI_API_KEY,
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departure_date,
    type: hasReturn ? 1 : 2,
    adults: String(adults || 1),
    currency: "AUD",
    gl: "au",
    hl: "en",
  };
  if (hasReturn) baseParams.return_date = return_date;
  const classMap = { economy: "economy", premium_economy: "premium_economy", business: "business", first: "first_class" };
  if (travel_class && classMap[travel_class]) baseParams.travel_class = classMap[travel_class];

  const searchLinks = buildSearchLinks(input);

  // Google Flights has two tabs — "Best" (default) and "Cheapest". Fetching only
  // the default sort misses cheaper-with-stops options that appear under the
  // Cheapest tab. Fire both in parallel and merge.
  // SearchAPI sort_by: 1=Top, 2=Price, 3=Departure, 4=Arrival, 5=Duration, 6=Emissions
  async function fetchSort(sortBy) {
    const params = { ...baseParams };
    if (sortBy) params.sort_by = sortBy;
    return fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams(params)}`);
  }

  let bestResp, cheapResp;
  try {
    [bestResp, cheapResp] = await Promise.all([fetchSort(), fetchSort(2)]);
  } catch (e) {
    console.error("[searchapi] Network error:", String(e));
    return { error: `Network error reaching SearchAPI: ${String(e)}`, search_links: searchLinks };
  }
  if (!bestResp.ok) {
    const details = await bestResp.text();
    const msg = `SearchAPI returned HTTP ${bestResp.status}. ${
      bestResp.status === 401 ? "Check that SEARCHAPI_API_KEY is set correctly in Cloudflare Pages environment variables." :
      bestResp.status === 429 ? "SearchAPI rate limit exceeded — try again shortly." :
      "See details for more info."
    }`;
    console.error(`[searchapi] ${msg}`, details.slice(0, 300));
    return { error: msg, details: details.slice(0, 300), search_links: searchLinks };
  }

  const bestData = await bestResp.json();
  const cheapData = cheapResp.ok ? await cheapResp.json() : { best_flights: [], other_flights: [] };

  // Dedupe by booking_token (or segment fingerprint as fallback) so the same
  // flight appearing in both sorts only ranks once.
  const fingerprint = (o) =>
    o.booking_token ||
    (o.flights || []).map(s => `${s.flight_number}@${s.departure_airport?.time}`).join("|");
  const seen = new Set();
  const merged = [];
  for (const o of [
    ...(bestData.best_flights || []),
    ...(cheapData.best_flights || []),
    ...(bestData.other_flights || []),
    ...(cheapData.other_flights || []),
  ]) {
    const fp = fingerprint(o);
    if (seen.has(fp)) continue;
    seen.add(fp);
    merged.push(o);
  }
  const raw = merged.slice(0, 20);
  const data = bestData; // price_insights comes from the default sort response

  const mapped = raw.map((o) => ({
    price: o.price != null ? `${o.price} AUD` : "n/a",
    price_num: o.price != null ? o.price : 99999,
    total_duration_min: o.total_duration,
    type: o.type,
    source: "Google Flights",
    carbon_emissions_kg: o.carbon_emissions?.this_flight
      ? Math.round(o.carbon_emissions.this_flight / 1000)
      : null,
    layovers: (o.layovers || []).map((l) => ({
      airport: l.id || l.name,
      duration_min: l.duration,
      overnight: !!l.overnight,
    })),
    segments: (o.flights || []).map((s) => ({
      from: s.departure_airport?.id,
      from_name: s.departure_airport?.name,
      to: s.arrival_airport?.id,
      to_name: s.arrival_airport?.name,
      depart: s.departure_airport?.time,
      arrive: s.arrival_airport?.time,
      airline: s.airline,
      airline_logo: s.airline_logo,
      flight_number: s.flight_number,
      duration_min: s.duration,
      travel_class: s.travel_class,
    })),
    booking_links: {
      google_flights: searchLinks.google_flights,
      skyscanner: searchLinks.skyscanner,
      kayak: searchLinks.kayak,
      expedia: searchLinks.expedia,
    },
    has_direct_link: false,
    _departure_token: o.booking_token || null,
  }));

  const top3 = rankOffers(mapped, prefs).slice(0, 3);

  const offers = await Promise.all(
    top3.map(async (offer) => {
      const token = offer._departure_token;
      delete offer._departure_token;
      if (!token) return offer;

      const bookingOption = await fetchBookingOption(token, baseParams);
      if (bookingOption) {
        offer.booking_links.google_flights = bookingOption.url;
        offer.source = bookingOption.book_with || "Google Flights";
        offer.has_direct_link = true;
      }
      return offer;
    })
  );

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
  };
}

async function fetchBookingOption(departureToken, baseParams) {
  try {
    const params = new URLSearchParams({ ...baseParams, departure_token: departureToken });
    const resp = await fetch(`https://www.searchapi.io/api/v1/search?${params}`);
    if (!resp.ok) return null;
    const data = await resp.json();

    const candidates = (data.booking_options || [])
      .flatMap((b) => [b.together, ...(Array.isArray(b.separately) ? b.separately : [b.separately])])
      .filter((b) => b?.option?.url)
      .map((b) => ({ book_with: b.book_with || "Book", url: b.option.url, price: b.price ?? 99999 }));

    if (!candidates.length) return null;
    return candidates.sort((a, b) => a.price - b.price)[0];
  } catch {
    return null;
  }
}
