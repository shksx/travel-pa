// Normalised result schemas for accommodation and flight providers.
// Every provider must coerce its raw response into one of these shapes
// before returning, so the UI, ranking engine, and persistence layer
// see one consistent format regardless of source.
//
// Kept as JSDoc typedefs (no TS yet) to avoid build tooling on Workers.

/**
 * @typedef {Object} FlightSegment
 * @property {string} from               - IATA code, e.g. "SYD"
 * @property {string} [from_name]
 * @property {string} to                 - IATA code
 * @property {string} [to_name]
 * @property {string} depart             - ISO datetime string from provider
 * @property {string} arrive
 * @property {string} airline
 * @property {string} [airline_logo]
 * @property {string} [flight_number]
 * @property {number} [duration_min]
 * @property {string} [travel_class]
 */

/**
 * @typedef {Object} FlightLayover
 * @property {string} airport
 * @property {number} duration_min
 * @property {boolean} overnight
 */

/**
 * @typedef {Object} FlightResult
 * @property {string} price              - Display string e.g. "1234 AUD"
 * @property {number} price_num          - Numeric, for sorting/scoring
 * @property {number} [total_duration_min]
 * @property {string} [type]
 * @property {string} source             - Provider/booking source name
 * @property {number|null} [carbon_emissions_kg]
 * @property {FlightLayover[]} layovers
 * @property {FlightSegment[]} segments
 * @property {Object<string,string>} booking_links - { google_flights, skyscanner, kayak, expedia, ... }
 * @property {boolean} has_direct_link
 */

/**
 * @typedef {Object} FlightSearchCriteria
 * @property {string} origin             - IATA
 * @property {string} destination        - IATA
 * @property {string} departure_date     - YYYY-MM-DD
 * @property {string} [return_date]
 * @property {number} [adults]
 * @property {"economy"|"premium_economy"|"business"|"first"} [travel_class]
 */

/**
 * @typedef {Object} AccommodationLocation
 * @property {string} [city]
 * @property {string} [country]
 * @property {number} [lat]
 * @property {number} [lng]
 * @property {string} [neighbourhood]
 * @property {string} [address]
 */

/**
 * @typedef {Object} AccommodationResult
 * @property {string} id                 - Provider-prefixed unique id, e.g. "booking:12345"
 * @property {string} name
 * @property {"hotel"|"apartment"|"hostel"|"guesthouse"|"villa"|"resort"|"other"} type
 * @property {string} source             - Provider name ("booking", "mock", etc.)
 * @property {number} price_num          - Total stay, in `currency`
 * @property {string} price              - Display string e.g. "AUD 480"
 * @property {string} currency           - ISO 4217
 * @property {number} [price_per_night_num]
 * @property {number} [nights]
 * @property {number|null} [rating]      - Normalised to /10
 * @property {number|null} [rating_raw]  - Original value from provider
 * @property {number|null} [rating_scale_raw] - 5 or 10, what the provider used
 * @property {number} [review_count]
 * @property {number|null} [star_rating] - Hotel star rating if available
 * @property {AccommodationLocation} location
 * @property {string[]} images
 * @property {string[]} amenities
 * @property {{free_cancel: boolean, deadline?: string}} [cancellation]
 * @property {Object<string,string>} booking_links - { booking, expedia, agoda, ... }
 */

/**
 * @typedef {Object} AccommodationSearchCriteria
 * @property {string} destination        - Free-text city or "City, Country"; providers resolve to their own ids
 * @property {string} check_in           - YYYY-MM-DD
 * @property {string} check_out          - YYYY-MM-DD
 * @property {number} [adults]
 * @property {number} [children]
 * @property {number} [rooms]
 * @property {string} [currency]         - Defaults to "AUD"
 * @property {number} [max_results]      - Provider may cap; default 20
 */

// Helpers ────────────────────────────────────────────────────────────────────

/**
 * Coerce a numeric rating to /10 regardless of source scale.
 * Booking uses /10, Google/Expedia /5, Agoda /10, Hostelworld /10.
 */
export function normaliseRating(raw, scale) {
  if (raw == null) return null;
  if (scale === 5) return Math.round(raw * 20) / 10; // 4.6 → 9.2
  return Math.round(raw * 10) / 10;
}

export function priceDisplay(amount, currency) {
  if (amount == null) return "n/a";
  return `${currency || "AUD"} ${Math.round(amount)}`;
}

export function nightsBetween(checkIn, checkOut) {
  const a = Date.parse(checkIn);
  const b = Date.parse(checkOut);
  if (!a || !b || b <= a) return 1;
  return Math.round((b - a) / 86400000);
}
