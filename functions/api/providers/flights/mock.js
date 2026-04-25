// Mock flight provider. Returns rich, varied FlightResult[] so the UI,
// ranking, and downstream logic can be exercised without burning real
// SearchAPI credits.
//
// Activated by the registry when no real flight providers are configured,
// or explicitly when env.MOCK_PROVIDERS includes "flights".

import { buildSearchLinks, rankOffers } from "./_shared.js";

export const name = "mock";
export const supports = "flights";

// Realistic carrier pool — covers full-service, low-cost, and long-haul.
const CARRIERS = [
  { code: "QF", name: "Qantas", logo: "https://logos.skyscnr.com/images/airlines/favicon/QF.png" },
  { code: "VA", name: "Virgin Australia", logo: "https://logos.skyscnr.com/images/airlines/favicon/VA.png" },
  { code: "JQ", name: "Jetstar", logo: "https://logos.skyscnr.com/images/airlines/favicon/JQ.png" },
  { code: "SQ", name: "Singapore Airlines", logo: "https://logos.skyscnr.com/images/airlines/favicon/SQ.png" },
  { code: "EK", name: "Emirates", logo: "https://logos.skyscnr.com/images/airlines/favicon/EK.png" },
  { code: "QR", name: "Qatar Airways", logo: "https://logos.skyscnr.com/images/airlines/favicon/QR.png" },
  { code: "CX", name: "Cathay Pacific", logo: "https://logos.skyscnr.com/images/airlines/favicon/CX.png" },
  { code: "JL", name: "Japan Airlines", logo: "https://logos.skyscnr.com/images/airlines/favicon/JL.png" },
  { code: "NH", name: "ANA", logo: "https://logos.skyscnr.com/images/airlines/favicon/NH.png" },
  { code: "TG", name: "Thai Airways", logo: "https://logos.skyscnr.com/images/airlines/favicon/TG.png" },
  { code: "MH", name: "Malaysia Airlines", logo: "https://logos.skyscnr.com/images/airlines/favicon/MH.png" },
  { code: "AK", name: "AirAsia", logo: "https://logos.skyscnr.com/images/airlines/favicon/AK.png" },
  { code: "BA", name: "British Airways", logo: "https://logos.skyscnr.com/images/airlines/favicon/BA.png" },
  { code: "KE", name: "Korean Air", logo: "https://logos.skyscnr.com/images/airlines/favicon/KE.png" },
];

// Common Asia/Oceania hub layover airports
const LAYOVER_HUBS = [
  { code: "SIN", name: "Singapore Changi" },
  { code: "HKG", name: "Hong Kong Intl" },
  { code: "DXB", name: "Dubai Intl" },
  { code: "DOH", name: "Hamad Intl Doha" },
  { code: "BKK", name: "Bangkok Suvarnabhumi" },
  { code: "KUL", name: "Kuala Lumpur Intl" },
  { code: "ICN", name: "Seoul Incheon" },
  { code: "NRT", name: "Tokyo Narita" },
];

function pad(n) { return String(n).padStart(2, "0"); }
function timeStr(h, m) { return `${pad(h)}:${pad(m % 60)}`; }
function isoTime(date, h, m) { return `${date}T${timeStr(h, m)}`; }
function addMinutes(h, m, mins) {
  const total = h * 60 + m + mins;
  return [Math.floor(total / 60) % 24, total % 60, Math.floor(total / 1440)];
}
function pick(arr, i) { return arr[i % arr.length]; }
function flightNum(code, n) { return `${code}${100 + n}`; }

export async function searchFlights(input, _env, prefs) {
  const { origin, destination, departure_date, return_date, travel_class } = input || {};
  if (!origin || !destination || !departure_date) {
    return { error: "search_flights requires origin, destination, and departure_date." };
  }

  const links = buildSearchLinks(input);
  const cabin = travel_class || "economy";

  // Helper: build a direct flight offer
  function buildDirect(idx, carrier, depHour, depMin, durMin, price, source, hasDirectLink = false, extras = {}) {
    const [arrH, arrM, dayOffset] = addMinutes(depHour, depMin, durMin);
    const arrDate = dayOffset
      ? new Date(Date.parse(departure_date) + dayOffset * 86400000).toISOString().slice(0, 10)
      : departure_date;
    return {
      price: `${price} AUD`, price_num: price,
      total_duration_min: durMin,
      type: return_date ? "Round trip" : "One way",
      source,
      carbon_emissions_kg: extras.co2 || Math.round(durMin * 1.05),
      layovers: [],
      segments: [{
        from: origin, from_name: extras.fromName,
        to: destination, to_name: extras.toName,
        depart: isoTime(departure_date, depHour, depMin),
        arrive: isoTime(arrDate, arrH, arrM),
        airline: carrier.name, airline_logo: carrier.logo,
        flight_number: flightNum(carrier.code, idx),
        duration_min: durMin, travel_class: cabin,
      }],
      booking_links: { ...links },
      has_direct_link: hasDirectLink,
    };
  }

  // Helper: build a 1-stop flight offer
  function buildOneStop(idx, carrier, hub, depHour, depMin, leg1Min, layoverMin, leg2Min, price, source, opts = {}) {
    const [hubArrH, hubArrM, d1] = addMinutes(depHour, depMin, leg1Min);
    const [leg2DepH, leg2DepM, d2] = addMinutes(hubArrH, hubArrM, layoverMin);
    const [arrH, arrM, d3] = addMinutes(leg2DepH, leg2DepM, leg2Min);
    const totalDay = d1 + d2 + d3;
    const date = (offset) => offset
      ? new Date(Date.parse(departure_date) + offset * 86400000).toISOString().slice(0, 10)
      : departure_date;
    const overnight = layoverMin >= 360 || (leg2DepH >= 22 || leg2DepH < 6);
    return {
      price: `${price} AUD`, price_num: price,
      total_duration_min: leg1Min + layoverMin + leg2Min,
      type: return_date ? "Round trip" : "One way",
      source,
      carbon_emissions_kg: opts.co2 || Math.round((leg1Min + leg2Min) * 1.1),
      layovers: [{ airport: hub.code, duration_min: layoverMin, overnight }],
      segments: [
        {
          from: origin, to: hub.code, to_name: hub.name,
          depart: isoTime(departure_date, depHour, depMin),
          arrive: isoTime(date(d1), hubArrH, hubArrM),
          airline: carrier.name, airline_logo: carrier.logo,
          flight_number: flightNum(carrier.code, idx),
          duration_min: leg1Min, travel_class: cabin,
        },
        {
          from: hub.code, from_name: hub.name, to: destination,
          depart: isoTime(date(d1 + d2), leg2DepH, leg2DepM),
          arrive: isoTime(date(totalDay), arrH, arrM),
          airline: opts.carrier2?.name || carrier.name,
          airline_logo: opts.carrier2?.logo || carrier.logo,
          flight_number: flightNum(opts.carrier2?.code || carrier.code, idx + 50),
          duration_min: leg2Min, travel_class: cabin,
        },
      ],
      booking_links: { ...links },
      has_direct_link: !!opts.hasDirectLink,
    };
  }

  // Helper: build a 2-stop flight offer (cheapest of the bunch typically)
  function buildTwoStop(idx, carrier, hub1, hub2, depHour, depMin, mins, price, source) {
    const [l1, l2, l3] = mins.legs;
    const [w1, w2] = mins.waits;
    let cur = [depHour, depMin, 0];
    const segs = [];
    const layovers = [];
    const date = (offset) => offset
      ? new Date(Date.parse(departure_date) + offset * 86400000).toISOString().slice(0, 10)
      : departure_date;
    const stops = [origin, hub1.code, hub2.code, destination];
    const stopNames = [null, hub1.name, hub2.name, null];
    const legs = [l1, l2, l3];
    const waits = [w1, w2];
    for (let i = 0; i < 3; i++) {
      const dep = [...cur];
      const [aH, aM, dOff] = addMinutes(cur[0], cur[1], legs[i]);
      cur = [aH, aM, cur[2] + dOff];
      segs.push({
        from: stops[i], from_name: stopNames[i] || undefined,
        to: stops[i + 1], to_name: stopNames[i + 1] || undefined,
        depart: isoTime(date(dep[2]), dep[0], dep[1]),
        arrive: isoTime(date(cur[2]), cur[0], cur[1]),
        airline: carrier.name, airline_logo: carrier.logo,
        flight_number: flightNum(carrier.code, idx + i * 10),
        duration_min: legs[i], travel_class: cabin,
      });
      if (i < 2) {
        const overnight = waits[i] >= 360 || cur[0] >= 22 || cur[0] < 6;
        layovers.push({ airport: stops[i + 1], duration_min: waits[i], overnight });
        const [waitH, waitM, waitOff] = addMinutes(cur[0], cur[1], waits[i]);
        cur = [waitH, waitM, cur[2] + waitOff];
      }
    }
    return {
      price: `${price} AUD`, price_num: price,
      total_duration_min: l1 + l2 + l3 + w1 + w2,
      type: return_date ? "Round trip" : "One way",
      source,
      carbon_emissions_kg: Math.round((l1 + l2 + l3) * 1.15),
      layovers,
      segments: segs,
      booking_links: { ...links },
      has_direct_link: false,
    };
  }

  // Build a varied 12-offer pool
  const offers = [
    // Direct flights — premium
    buildDirect(1, pick(CARRIERS, 0), 8, 30, 565, 1289, "Qantas", true, { co2: 410 }),
    buildDirect(2, pick(CARRIERS, 7), 21, 5, 580, 1395, "Japan Airlines", true, { co2: 425 }),
    buildDirect(3, pick(CARRIERS, 1), 14, 45, 580, 1145, "Virgin Australia", true, { co2: 415 }),
    // Direct — overnight
    buildDirect(4, pick(CARRIERS, 8), 23, 15, 555, 1349, "ANA", false, { co2: 405 }),

    // 1-stop — mid-range, common hubs
    buildOneStop(5, pick(CARRIERS, 3), pick(LAYOVER_HUBS, 0), 9, 45, 470, 110, 380, 924, "Singapore Airlines", { hasDirectLink: true, co2: 530 }),
    buildOneStop(6, pick(CARRIERS, 6), pick(LAYOVER_HUBS, 1), 11, 20, 540, 145, 220, 875, "Cathay Pacific", { hasDirectLink: true }),
    buildOneStop(7, pick(CARRIERS, 9), pick(LAYOVER_HUBS, 4), 6, 30, 525, 95, 360, 798, "Thai Airways"),
    buildOneStop(8, pick(CARRIERS, 4), pick(LAYOVER_HUBS, 2), 22, 15, 825, 180, 535, 1085, "Emirates", { hasDirectLink: true, co2: 720 }),

    // 1-stop — long overnight layover (cheaper)
    buildOneStop(9, pick(CARRIERS, 11), pick(LAYOVER_HUBS, 5), 19, 40, 510, 480, 250, 612, "AirAsia", { co2: 510 }),

    // 1-stop — codeshare (different carrier on each leg)
    buildOneStop(10, pick(CARRIERS, 5), pick(LAYOVER_HUBS, 3), 15, 5, 920, 130, 300, 1012, "Qatar Airways", {
      carrier2: pick(CARRIERS, 13), hasDirectLink: true, co2: 680,
    }),

    // 2-stop — cheapest of the lot, awkward routing
    buildTwoStop(11, pick(CARRIERS, 11), pick(LAYOVER_HUBS, 5), pick(LAYOVER_HUBS, 4), 5, 50,
      { legs: [310, 240, 295], waits: [165, 220] }, 547, "AirAsia"),

    // Premium cabin example — much higher price
    buildDirect(12, pick(CARRIERS, 0), 10, 0, 565, cabin === "business" ? 5840 : cabin === "first" ? 9120 : cabin === "premium_economy" ? 2245 : 1289,
      "Qantas", true, { co2: 410 }),
  ];

  // Return all offers ranked by user prefs (rankOffers handles direct-only,
  // no-overnight, preferred-airlines penalties/bonuses).
  const ranked = rankOffers(offers, prefs);
  return {
    offers: ranked,
    count: ranked.length,
    price_insights: {
      lowest_price: 547,
      typical_price_range: [780, 1320],
      price_level: "typical",
    },
    _mock: true,
  };
}
