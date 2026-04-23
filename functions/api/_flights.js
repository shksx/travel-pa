// Shared flight-search logic used by /api/chat (via Claude tool use)
// and /api/dev/flights (direct dev endpoint — no Claude in the loop).
// Underscore prefix tells Cloudflare Pages this isn't a route.

// ───────────────────────── SearchAPI.io Google Flights ─────────────────────────
// Docs: https://www.searchapi.io/docs/google-flights-api

export async function searchFlights(input, env, prefs) {
  if (!env.SEARCHAPI_API_KEY) {
    return { error: "Server is missing SEARCHAPI_API_KEY environment variable." };
  }

  const { origin, destination, departure_date, return_date, adults, travel_class } = input || {};
  if (!origin || !destination || !departure_date) {
    return { error: "search_flights requires origin, destination, and departure_date." };
  }

  // Base params reused for both the initial search and per-offer booking lookups.
  // SearchAPI Google Flights param reference: https://www.searchapi.io/docs/google-flights
  //   type: 1=Round trip, 2=One way, 3=Multi-city  (numeric, NOT "round_trip"/"one_way")
  //   travel_class: 1=Economy, 2=Premium Economy, 3=Business, 4=First  (numeric)
  const baseParams = {
    engine: "google_flights",
    api_key: env.SEARCHAPI_API_KEY,
    departure_id: origin,
    arrival_id: destination,
    outbound_date: departure_date,
    type: return_date ? 1 : 2,
    adults: String(adults || 1),
    currency: "AUD",
    gl: "au",
    hl: "en",
  };
  if (return_date) baseParams.return_date = return_date;
  const classCodes = { economy: 1, premium_economy: 2, business: 3, first: 4 };
  if (travel_class && classCodes[travel_class]) baseParams.travel_class = classCodes[travel_class];

  const searchLinks = buildSearchLinks(input);

  let resp;
  try {
    resp = await fetch(`https://www.searchapi.io/api/v1/search?${new URLSearchParams(baseParams)}`);
  } catch (e) {
    console.error("[search_flights] Network error:", String(e));
    return {
      error: `Network error reaching SearchAPI: ${String(e)}`,
      search_links: searchLinks,
    };
  }
  if (!resp.ok) {
    const details = await resp.text();
    const msg = `SearchAPI returned HTTP ${resp.status}. ${
      resp.status === 401 ? "Check that SEARCHAPI_API_KEY is set correctly in Cloudflare Pages environment variables." :
      resp.status === 429 ? "SearchAPI rate limit exceeded — try again shortly." :
      "See details for more info."
    }`;
    console.error(`[search_flights] ${msg}`, details.slice(0, 300));
    return {
      error: msg,
      details: details.slice(0, 300),
      search_links: searchLinks,
    };
  }

  const data = await resp.json();

  const raw = [...(data.best_flights || []), ...(data.other_flights || [])].slice(0, 10);

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

export function rankOffers(offers, prefs) {
  if (!offers || offers.length === 0) return [];
  const p = prefs || {};
  const directOnly = p.t_direct_only === true || p.t_direct_only === "true";
  const noOvernight = p.t_no_overnight === true || p.t_no_overnight === "true";
  const preferredAirlines = p.i_preferred_airlines
    ? String(p.i_preferred_airlines).toLowerCase().split(/[,\s]+/).filter(Boolean)
    : [];

  const prices = offers.map((o) => o.price_num);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice || 1;

  const durations = offers.map((o) => o.total_duration_min || 9999);
  const minDur = Math.min(...durations);
  const maxDur = Math.max(...durations);
  const durRange = maxDur - minDur || 1;

  const scored = offers.map((offer) => {
    let score = 0;

    const isDirect = !offer.layovers || offer.layovers.length === 0;
    if (isDirect) score += 40;
    if (!isDirect && directOnly) score -= 100;

    const hasOvernight = (offer.layovers || []).some((l) => l.overnight);
    if (hasOvernight && noOvernight) score -= 60;
    else if (hasOvernight) score -= 10;

    const maxLayover = Math.max(0, ...(offer.layovers || []).map((l) => l.duration_min || 0));
    if (maxLayover > 360) score -= 20;
    else if (maxLayover > 180) score -= 8;

    score += 30 * (1 - (offer.price_num - minPrice) / priceRange);

    const dur = offer.total_duration_min || 9999;
    score += 20 * (1 - (dur - minDur) / durRange);

    if (preferredAirlines.length) {
      const carriers = (offer.segments || []).map((s) => (s.airline || "").toLowerCase());
      if (preferredAirlines.some((pa) => carriers.some((c) => c.includes(pa)))) score += 25;
    }

    return { offer, score };
  });

  return scored
    .sort((a, b) => b.score - a.score)
    .map(({ offer }) => offer);
}

// ───────────────────────── Booking search-URL builders ─────────────────────────

export function buildSearchLinks(input) {
  const { origin, destination, departure_date, return_date, adults, travel_class } = input;
  const pax = adults || 1;
  const cabin = travel_class || "economy";

  const gfQuery = `flights from ${origin} to ${destination} on ${departure_date}${return_date ? ` returning ${return_date}` : ""}${pax > 1 ? `, ${pax} passengers` : ""}`;
  const gf = `https://www.google.com/travel/flights?q=${encodeURIComponent(gfQuery)}`;

  function toSkyscannerDate(iso) {
    return iso ? iso.slice(2).replace(/-/g, "") : "";
  }
  const skyCabin = cabin.replace("_", "");
  const skySuffix = return_date
    ? `${toSkyscannerDate(departure_date)}/${toSkyscannerDate(return_date)}/`
    : `${toSkyscannerDate(departure_date)}/`;
  const sky = `https://www.skyscanner.com.au/transport/flights/${origin.toLowerCase()}/${destination.toLowerCase()}/${skySuffix}?adultsv2=${pax}&cabinclass=${skyCabin}`;

  const kayakCabin = { economy: "y", premium_economy: "w", business: "j", first: "f" };
  const kayakBase = `https://www.kayak.com.au/flights/${origin}-${destination}/${departure_date}`;
  const kayak = `${return_date ? `${kayakBase}/${return_date}` : kayakBase}/${pax}adults?cabin=${kayakCabin[cabin] || "y"}`;

  function toExpediaDate(iso) {
    const [y, m, d] = iso.split("-");
    return `${m}/${d}/${y}`;
  }
  const cabinMap = { economy: "coach", premium_economy: "premiumeconomy", business: "business", first: "first" };
  const expCabin = cabinMap[cabin] || "coach";
  const tripType = return_date ? "roundtrip" : "oneway";
  let expLegs = `leg1=from:${origin},to:${destination},departure:${toExpediaDate(departure_date)}TANYT`;
  if (return_date) expLegs += `&leg2=from:${destination},to:${origin},departure:${toExpediaDate(return_date)}TANYT`;
  const expedia = `https://www.expedia.com.au/Flights-Search?mode=search&trip=${tripType}&${expLegs}&passengers=adults:${pax},children:0&options=cabinclass:${expCabin}`;

  return { google_flights: gf, skyscanner: sky, kayak, expedia };
}
