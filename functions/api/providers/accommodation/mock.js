// Mock accommodation provider. Returns rich, varied AccommodationResult[]
// across hotels, apartments, hostels, resorts, villas, guesthouses, and
// capsule hotels — covering every persona (digital nomad, grey nomad,
// family, couple, solo, business).

import { nightsBetween, normaliseRating, priceDisplay } from "../schema.js";

export const name = "mock";
export const supports = "accommodation";

const PROPERTIES = [
  // ── Boutique / mid-range hotels ──────────────────────────────────────────
  {
    id: "mock:hotel-1", name: "Harbour View Boutique Hotel", type: "hotel",
    ppn: 220, rating_raw: 9.1, rating_scale_raw: 10, review_count: 1843, star_rating: 4,
    neighbourhood: "Old Town", lat: 35.683, lng: 139.752,
    images: [
      "https://placehold.co/600x400/0a4/fff?text=Harbour+View+1",
      "https://placehold.co/600x400/0a4/fff?text=Harbour+View+2",
    ],
    amenities: ["wifi", "breakfast_included", "rooftop_bar", "air_con", "concierge", "lift", "24h_reception"],
    free_cancel: true, breakfast_included: true, pet_friendly: false,
    description: "Restored 1920s townhouse with harbour-view rooms and a popular rooftop cocktail bar.",
    distance_from_centre_km: 0.4,
    deal_tag: null,
  },
  {
    id: "mock:hotel-2", name: "Central Square Inn", type: "hotel",
    ppn: 168, rating_raw: 8.4, rating_scale_raw: 10, review_count: 2876, star_rating: 3,
    neighbourhood: "City Centre",
    images: ["https://placehold.co/600x400/06c/fff?text=Central+Square+Inn"],
    amenities: ["wifi", "air_con", "lift", "24h_reception", "luggage_storage"],
    free_cancel: true, breakfast_included: false, pet_friendly: false,
    description: "Reliable mid-range hotel three minutes' walk from the metro. Rooms compact but well kept.",
    distance_from_centre_km: 0.1,
    deal_tag: "Member price",
  },
  {
    id: "mock:hotel-3", name: "Hotel Lumière", type: "hotel",
    ppn: 295, rating_raw: 9.4, rating_scale_raw: 10, review_count: 921, star_rating: 4,
    neighbourhood: "Arts District",
    images: ["https://placehold.co/600x400/903/fff?text=Hotel+Lumiere"],
    amenities: ["wifi", "breakfast_included", "spa", "gym", "restaurant", "bar", "air_con", "concierge"],
    free_cancel: true, breakfast_included: true, pet_friendly: true,
    description: "Design-forward boutique near the contemporary art museum. Pet-friendly with welcome treats.",
    distance_from_centre_km: 1.2,
    deal_tag: "Genius 10% off",
  },

  // ── Apartments / aparthotels ─────────────────────────────────────────────
  {
    id: "mock:apt-1", name: "Riverside Studio Apartment", type: "apartment",
    ppn: 145, rating_raw: 8.7, rating_scale_raw: 10, review_count: 612, star_rating: null,
    neighbourhood: "Riverside",
    images: ["https://placehold.co/600x400/06c/fff?text=Riverside+Studio"],
    amenities: ["wifi", "kitchen", "washer", "self_checkin", "air_con", "iron", "tv", "workspace"],
    free_cancel: true, breakfast_included: false, pet_friendly: false,
    description: "Self-contained studio with full kitchen and laundry. Self check-in via smart lock.",
    distance_from_centre_km: 2.3,
    deal_tag: "Long-stay 15% off",
    long_stay_friendly: true,
  },
  {
    id: "mock:apt-2", name: "Garden Loft 2BR", type: "apartment",
    ppn: 289, rating_raw: 9.2, rating_scale_raw: 10, review_count: 348, star_rating: null,
    neighbourhood: "Garden District",
    images: ["https://placehold.co/600x400/280/fff?text=Garden+Loft"],
    amenities: ["wifi", "kitchen", "washer", "dryer", "balcony", "air_con", "tv", "workspace", "dishwasher", "coffee_machine"],
    free_cancel: true, breakfast_included: false, pet_friendly: true,
    description: "Two-bedroom loft with private garden balcony. Sleeps four, ideal for families or two couples.",
    distance_from_centre_km: 3.0,
    sleeps: 4,
  },
  {
    id: "mock:apt-3", name: "Nomad Co-living House", type: "apartment",
    ppn: 95, rating_raw: 9.0, rating_scale_raw: 10, review_count: 1204, star_rating: null,
    neighbourhood: "Tech Quarter",
    images: ["https://placehold.co/600x400/c80/fff?text=Nomad+Co-living"],
    amenities: ["wifi", "fast_wifi_300mbps", "coworking_space", "shared_kitchen", "washer", "rooftop", "social_events"],
    free_cancel: false, breakfast_included: true, pet_friendly: false,
    description: "Co-living house geared at digital nomads. Private rooms, shared kitchen, weekly community dinners and a coworking floor.",
    distance_from_centre_km: 4.2,
    long_stay_friendly: true,
    deal_tag: "Monthly rate available",
  },

  // ── Hostels ──────────────────────────────────────────────────────────────
  {
    id: "mock:hostel-1", name: "Wanderers Hostel", type: "hostel",
    ppn: 38, rating_raw: 9.4, rating_scale_raw: 10, review_count: 4271, star_rating: 2,
    neighbourhood: "Centre",
    images: ["https://placehold.co/600x400/c60/fff?text=Wanderers+Hostel"],
    amenities: ["wifi", "shared_kitchen", "lockers", "tour_desk", "common_room", "laundry", "bar"],
    free_cancel: false, breakfast_included: false, pet_friendly: false,
    description: "Backpacker favourite with mixed and female-only dorms, plus a lively bar.",
    distance_from_centre_km: 0.2,
    sleeps: 1,
    dorm: true,
  },
  {
    id: "mock:hostel-2", name: "Quiet Retreat Hostel", type: "hostel",
    ppn: 52, rating_raw: 9.0, rating_scale_raw: 10, review_count: 887, star_rating: null,
    neighbourhood: "Riverside",
    images: ["https://placehold.co/600x400/680/fff?text=Quiet+Retreat"],
    amenities: ["wifi", "shared_kitchen", "lockers", "garden", "bike_rental", "laundry", "no_party"],
    free_cancel: true, breakfast_included: true, pet_friendly: false,
    description: "Quieter hostel with strict no-party policy. Female-only, mixed, and private rooms available.",
    distance_from_centre_km: 1.5,
    dorm: true,
  },

  // ── Capsule / pod hotel ──────────────────────────────────────────────────
  {
    id: "mock:capsule-1", name: "Pod Stay Capsule Hotel", type: "hotel",
    ppn: 64, rating_raw: 8.6, rating_scale_raw: 10, review_count: 1543, star_rating: 2,
    neighbourhood: "Station District",
    images: ["https://placehold.co/600x400/345/fff?text=Pod+Stay"],
    amenities: ["wifi", "shared_bathroom", "lockers", "lounge", "vending", "air_con"],
    free_cancel: false, breakfast_included: false, pet_friendly: false,
    description: "Modern capsule pods with private TV, USB ports, and reading light. Adults only.",
    distance_from_centre_km: 0.05,
    sleeps: 1,
  },

  // ── Resorts ──────────────────────────────────────────────────────────────
  {
    id: "mock:resort-1", name: "Palm Cove Resort & Spa", type: "resort",
    ppn: 410, rating_raw: 9.0, rating_scale_raw: 10, review_count: 2204, star_rating: 5,
    neighbourhood: "Beachfront",
    images: ["https://placehold.co/600x400/090/fff?text=Palm+Cove+Resort"],
    amenities: ["wifi", "pool", "spa", "breakfast_included", "gym", "beach_access", "kids_club", "all_inclusive_option", "water_sports", "restaurant", "bar"],
    free_cancel: true, breakfast_included: true, pet_friendly: false,
    description: "Five-star beachfront resort with three pools, full-service spa, and supervised kids' club.",
    distance_from_centre_km: 6.8,
    sleeps: 4,
  },
  {
    id: "mock:resort-2", name: "Mountain View Eco-Lodge", type: "resort",
    ppn: 238, rating_raw: 9.3, rating_scale_raw: 10, review_count: 467, star_rating: 4,
    neighbourhood: "Hill Country",
    images: ["https://placehold.co/600x400/263/fff?text=Mountain+View+Lodge"],
    amenities: ["wifi", "breakfast_included", "restaurant", "yoga_classes", "hiking_trails", "fireplace", "no_tv", "sustainable"],
    free_cancel: true, breakfast_included: true, pet_friendly: true,
    description: "Off-grid eco-lodge with solar power, organic restaurant, and guided hikes from the door.",
    distance_from_centre_km: 22.0,
    sustainable: true,
  },

  // ── Villas ───────────────────────────────────────────────────────────────
  {
    id: "mock:villa-1", name: "Cliffside Private Villa", type: "villa",
    ppn: 685, rating_raw: 9.7, rating_scale_raw: 10, review_count: 89, star_rating: null,
    neighbourhood: "Coastal",
    images: ["https://placehold.co/600x400/258/fff?text=Cliffside+Villa"],
    amenities: ["wifi", "private_pool", "kitchen", "washer", "ocean_view", "air_con", "private_chef_optional", "parking", "bbq"],
    free_cancel: false, breakfast_included: false, pet_friendly: false,
    description: "Three-bedroom villa with infinity pool overlooking the ocean. 3-night minimum.",
    distance_from_centre_km: 12.5,
    sleeps: 6,
    min_nights: 3,
  },

  // ── Guesthouse / B&B ─────────────────────────────────────────────────────
  {
    id: "mock:guest-1", name: "Maggie's Guesthouse", type: "guesthouse",
    ppn: 112, rating_raw: 9.5, rating_scale_raw: 10, review_count: 712, star_rating: 3,
    neighbourhood: "Heritage Quarter",
    images: ["https://placehold.co/600x400/843/fff?text=Maggies+Guesthouse"],
    amenities: ["wifi", "breakfast_included", "garden", "shared_lounge", "host_on_site", "parking"],
    free_cancel: true, breakfast_included: true, pet_friendly: true,
    description: "Family-run guesthouse in a 19th-century cottage. Home-cooked breakfast with local produce.",
    distance_from_centre_km: 1.8,
  },

  // ── Budget / older infrastructure ────────────────────────────────────────
  {
    id: "mock:hotel-4", name: "Budget Stay Inn", type: "hotel",
    ppn: 78, rating_raw: 7.2, rating_scale_raw: 10, review_count: 3210, star_rating: 2,
    neighbourhood: "Outer Ring",
    images: ["https://placehold.co/600x400/666/fff?text=Budget+Stay+Inn"],
    amenities: ["wifi", "air_con", "tv", "lift"],
    free_cancel: false, breakfast_included: false, pet_friendly: false,
    description: "No-frills hotel near the airport bus stop. Functional, clean, well-priced for short stays.",
    distance_from_centre_km: 8.5,
    deal_tag: "Lowest in area",
  },

  // ── Long-stay / serviced apartment ───────────────────────────────────────
  {
    id: "mock:apt-4", name: "The Nomad Residence (Aparthotel)", type: "apartment",
    ppn: 175, rating_raw: 9.1, rating_scale_raw: 10, review_count: 1086, star_rating: 4,
    neighbourhood: "Business District",
    images: ["https://placehold.co/600x400/068/fff?text=Nomad+Residence"],
    amenities: ["wifi", "fast_wifi_500mbps", "kitchenette", "gym", "pool", "workspace", "weekly_cleaning", "24h_reception", "co-working_space"],
    free_cancel: true, breakfast_included: false, pet_friendly: false,
    description: "Serviced aparthotel built for stays of 7+ nights. In-unit workspace and high-speed wifi audited weekly.",
    distance_from_centre_km: 2.0,
    long_stay_friendly: true,
    deal_tag: "Weekly rate available",
  },

  // ── Premium / luxury ─────────────────────────────────────────────────────
  {
    id: "mock:hotel-5", name: "The Grand Imperial", type: "hotel",
    ppn: 540, rating_raw: 9.6, rating_scale_raw: 10, review_count: 1892, star_rating: 5,
    neighbourhood: "Historic Quarter",
    images: ["https://placehold.co/600x400/420/fff?text=The+Grand+Imperial"],
    amenities: ["wifi", "breakfast_included", "spa", "pool", "gym", "concierge", "valet_parking", "michelin_restaurant", "butler_service", "club_lounge"],
    free_cancel: true, breakfast_included: true, pet_friendly: true,
    description: "Five-star landmark hotel. Michelin-starred restaurant on site, club lounge for top-tier rooms.",
    distance_from_centre_km: 0.6,
  },

  // ── Family-focused ───────────────────────────────────────────────────────
  {
    id: "mock:resort-3", name: "Sunshine Family Apartments", type: "apartment",
    ppn: 198, rating_raw: 8.9, rating_scale_raw: 10, review_count: 1567, star_rating: 4,
    neighbourhood: "Beachside",
    images: ["https://placehold.co/600x400/f80/fff?text=Sunshine+Family"],
    amenities: ["wifi", "kitchen", "pool", "kids_pool", "playground", "kids_club", "washer", "balcony", "parking"],
    free_cancel: true, breakfast_included: false, pet_friendly: false,
    description: "Two-bedroom apartments around a kids' pool with daily activities. Cots and high chairs free.",
    distance_from_centre_km: 5.4,
    sleeps: 5,
  },

  // ── Adults-only / romantic ───────────────────────────────────────────────
  {
    id: "mock:hotel-6", name: "Lumen Adults-Only Hideaway", type: "hotel",
    ppn: 365, rating_raw: 9.5, rating_scale_raw: 10, review_count: 542, star_rating: 4,
    neighbourhood: "Lakeside",
    images: ["https://placehold.co/600x400/728/fff?text=Lumen+Hideaway"],
    amenities: ["wifi", "breakfast_included", "spa", "pool", "adults_only", "couples_packages", "in-room_dining", "fireplace"],
    free_cancel: true, breakfast_included: true, pet_friendly: false,
    description: "Adults-only retreat on a quiet lake. Couples spa packages, in-room dining, no children allowed.",
    distance_from_centre_km: 14.0,
  },
];

export async function searchAccommodation(input, _env) {
  const { destination, check_in, check_out, adults, rooms, currency, max_results } = input || {};
  if (!destination || !check_in || !check_out) {
    return { error: "search_accommodation requires destination, check_in, and check_out." };
  }
  const nights = nightsBetween(check_in, check_out);
  const ccy = currency || "AUD";
  const cap = max_results || 50;

  const results = PROPERTIES.slice(0, cap).map((s) => {
    // Simulate long-stay discounts when a property advertises one
    const longStayDiscount = s.long_stay_friendly && nights >= 7 ? 0.85 : 1;
    const ppn = Math.round(s.ppn * longStayDiscount);
    const total = ppn * nights * (rooms || 1);
    return {
      id: s.id,
      name: s.name,
      type: s.type,
      source: "mock",
      price_num: total,
      price: priceDisplay(total, ccy),
      currency: ccy,
      price_per_night_num: ppn,
      nights,
      rating: normaliseRating(s.rating_raw, s.rating_scale_raw),
      rating_raw: s.rating_raw,
      rating_scale_raw: s.rating_scale_raw,
      review_count: s.review_count,
      star_rating: s.star_rating,
      location: {
        city: destination,
        neighbourhood: s.neighbourhood,
        lat: s.lat,
        lng: s.lng,
        distance_from_centre_km: s.distance_from_centre_km,
      },
      images: s.images,
      amenities: s.amenities,
      cancellation: {
        free_cancel: s.free_cancel,
        deadline: s.free_cancel ? new Date(Date.parse(check_in) - 86400000 * 2).toISOString().slice(0, 10) : undefined,
      },
      description: s.description,
      breakfast_included: !!s.breakfast_included,
      pet_friendly: !!s.pet_friendly,
      long_stay_friendly: !!s.long_stay_friendly,
      sleeps: s.sleeps || (adults || 2),
      min_nights: s.min_nights || 1,
      dorm: !!s.dorm,
      sustainable: !!s.sustainable,
      deal_tag: s.deal_tag || (longStayDiscount < 1 ? "15% long-stay discount" : null),
      booking_links: {
        booking: `https://www.booking.com/searchresults.html?ss=${encodeURIComponent(destination)}&checkin=${check_in}&checkout=${check_out}&group_adults=${adults || 2}`,
        agoda: `https://www.agoda.com/search?city=${encodeURIComponent(destination)}&checkIn=${check_in}&checkOut=${check_out}&adults=${adults || 2}`,
        hostelworld: s.type === "hostel"
          ? `https://www.hostelworld.com/findabed.php/ChosenCity.${encodeURIComponent(destination)}/Dates.${check_in.replace(/-/g, "")}.${nights}`
          : undefined,
      },
      _mock: true,
    };
  });

  return {
    results,
    count: results.length,
    price_insights: {
      lowest_price: 38 * nights,
      median_price: 198 * nights,
      typical_price_range: [110 * nights, 320 * nights],
    },
    _mock: true,
  };
}
