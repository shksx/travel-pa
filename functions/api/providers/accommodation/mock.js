// Mock accommodation provider. Returns canned, realistic AccommodationResult[]
// so the UI and ranking layer can be built before Booking/Expedia/Hostelworld
// approvals land.

import { nightsBetween, normaliseRating, priceDisplay } from "../schema.js";

export const name = "mock";
export const supports = "accommodation";

export async function searchAccommodation(input, _env) {
  const { destination, check_in, check_out, adults, rooms, currency, max_results } = input || {};
  if (!destination || !check_in || !check_out) {
    return { error: "search_accommodation requires destination, check_in, and check_out." };
  }
  const nights = nightsBetween(check_in, check_out);
  const ccy = currency || "AUD";

  const samples = [
    {
      id: "mock:hotel-1", name: "Harbour View Boutique Hotel", type: "hotel",
      ppn: 220, rating_raw: 9.1, rating_scale_raw: 10, review_count: 1843,
      star_rating: 4, neighbourhood: "Old Town",
      images: ["https://placehold.co/600x400/0a4/fff?text=Harbour+View"],
      amenities: ["wifi", "breakfast", "rooftop_bar", "air_con"],
      free_cancel: true,
    },
    {
      id: "mock:apt-1", name: "Riverside Studio Apartment", type: "apartment",
      ppn: 145, rating_raw: 8.7, rating_scale_raw: 10, review_count: 612,
      star_rating: null, neighbourhood: "Riverside",
      images: ["https://placehold.co/600x400/06c/fff?text=Riverside+Studio"],
      amenities: ["wifi", "kitchen", "washer", "self_checkin"],
      free_cancel: true,
    },
    {
      id: "mock:hostel-1", name: "Wanderers Hostel", type: "hostel",
      ppn: 38, rating_raw: 9.4, rating_scale_raw: 10, review_count: 4271,
      star_rating: 2, neighbourhood: "Centre",
      images: ["https://placehold.co/600x400/c60/fff?text=Wanderers+Hostel"],
      amenities: ["wifi", "shared_kitchen", "lockers", "tour_desk"],
      free_cancel: false,
    },
    {
      id: "mock:resort-1", name: "Palm Cove Resort & Spa", type: "resort",
      ppn: 410, rating_raw: 9.0, rating_scale_raw: 10, review_count: 2204,
      star_rating: 5, neighbourhood: "Beachfront",
      images: ["https://placehold.co/600x400/090/fff?text=Palm+Cove+Resort"],
      amenities: ["wifi", "pool", "spa", "breakfast", "gym", "beach_access"],
      free_cancel: true,
    },
  ];

  const results = samples.slice(0, max_results || 20).map((s) => {
    const total = s.ppn * nights * (rooms || 1);
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      source: "mock",
      price_num: total,
      price: priceDisplay(total, ccy),
      currency: ccy,
      price_per_night_num: s.ppn,
      nights,
      rating: normaliseRating(s.rating_raw, s.rating_scale_raw),
      rating_raw: s.rating_raw,
      rating_scale_raw: s.rating_scale_raw,
      review_count: s.review_count,
      star_rating: s.star_rating,
      location: { city: destination, neighbourhood: s.neighbourhood },
      images: s.images,
      amenities: s.amenities,
      cancellation: { free_cancel: s.free_cancel },
      booking_links: {
        booking: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${check_in}&checkout=${check_out}&group_adults=${adults || 2}`,
      },
      _mock: true,
    };
  });

  return { results, count: results.length, _mock: true };
}
