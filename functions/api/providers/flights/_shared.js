// Shared helpers used by every flight provider:
//   - rankOffers: scores normalised FlightResult[] against user prefs
//   - buildSearchLinks: builds fallback search-page deep-links per OTA
//
// Both are pure functions — no provider creds required.

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
