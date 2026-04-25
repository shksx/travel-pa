// Mock flight provider. Returns canned, realistic FlightResult[] so the UI,
// ranking, and downstream logic can be exercised without a real API key.
//
// Activated by the registry when no real flight providers are configured,
// or explicitly when env.MOCK_PROVIDERS includes "flights".

import { buildSearchLinks, rankOffers } from "./_shared.js";

export const name = "mock";
export const supports = "flights";

export async function searchFlights(input, _env, prefs) {
  const { origin, destination, departure_date, return_date, adults, travel_class } = input || {};
  if (!origin || !destination || !departure_date) {
    return { error: "search_flights requires origin, destination, and departure_date." };
  }

  const links = buildSearchLinks(input);
  const dep = `${departure_date}T08:30`;
  const arr = `${departure_date}T14:55`;

  const offers = [
    {
      price: "742 AUD", price_num: 742, total_duration_min: 385, type: return_date ? "Round trip" : "One way",
      source: "Mock Airlines", carbon_emissions_kg: 410,
      layovers: [],
      segments: [{
        from: origin, to: destination, depart: dep, arrive: arr,
        airline: "Mock Airlines", flight_number: "MA101",
        duration_min: 385, travel_class: travel_class || "economy",
      }],
      booking_links: { ...links }, has_direct_link: false,
    },
    {
      price: "612 AUD", price_num: 612, total_duration_min: 595, type: return_date ? "Round trip" : "One way",
      source: "FauxJet", carbon_emissions_kg: 380,
      layovers: [{ airport: "SIN", duration_min: 120, overnight: false }],
      segments: [
        { from: origin, to: "SIN", depart: dep, arrive: `${departure_date}T12:00`, airline: "FauxJet", flight_number: "FJ22", duration_min: 380 },
        { from: "SIN", to: destination, depart: `${departure_date}T14:00`, arrive: `${departure_date}T18:25`, airline: "FauxJet", flight_number: "FJ45", duration_min: 215 },
      ],
      booking_links: { ...links }, has_direct_link: false,
    },
    {
      price: "884 AUD", price_num: 884, total_duration_min: 410, type: return_date ? "Round trip" : "One way",
      source: "TestAir", carbon_emissions_kg: 420,
      layovers: [],
      segments: [{
        from: origin, to: destination, depart: `${departure_date}T19:15`, arrive: `${departure_date}T02:05`,
        airline: "TestAir", flight_number: "TA77",
        duration_min: 410, travel_class: travel_class || "economy",
      }],
      booking_links: { ...links }, has_direct_link: false,
    },
  ];

  const ranked = rankOffers(offers, prefs).slice(0, 3);
  return {
    offers: ranked,
    count: ranked.length,
    price_insights: { lowest_price: 612, typical_price_range: [650, 950], price_level: "typical" },
    _mock: true,
  };
  // adults consumed by buildSearchLinks; referenced here to silence unused warnings if any: void adults;
}
