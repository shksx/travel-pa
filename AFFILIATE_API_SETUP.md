# Nomad App — Affiliate API Setup

**Purpose:** Get free affiliate API access to flight and accommodation providers so the Research Engine (§4.2 of the design doc) has real, live, structured data to query.

**Principle:** Every API on this list is free to use because it's funded by affiliate commission on bookings the user makes through Nomad's deep-links. There are no per-call charges. Your only "cost" is application time and integration work.

---

## Step 0 — Prerequisites (do these first)

Affiliate programs will not approve an application without these in place. Tackle in this order:

1. **Live domain with a landing page.** Doesn't need to be the full app — a one-page Nomad teaser with value prop, coming-soon signup form, and privacy policy is enough for Booking and Skyscanner approval. Deploy on Cloudflare Pages against your real domain.
2. **Business entity to receive payouts.** Sole trader / ABN works for Booking and most affiliate programs. Expedia and Amadeus prefer a registered company. Bank account details get attached during application.
3. **Privacy policy + Terms of Service on the landing site.** Required for affiliate compliance. A Termly or iubenda generated template is acceptable for early-stage.
4. **Business email on your domain** (e.g., `partners@nomad-app.com`). Gmail addresses get applications approved more slowly.

---

## Phase 1 — Apply now (fast approval, highest priority)

### 1. Booking.com Affiliate Partner Program

| | |
|---|---|
| **URL** | https://www.booking.com/affiliate-program/ |
| **What you get** | Two products: (a) Search Box widget (instant approval, embed-style) and (b) Demand API / Affiliate API (proper structured search). |
| **Apply for** | Demand API. Search Box is fine for landing-page demo but you need the structured API for the Research Engine. |
| **Approval time** | 1–3 days for Search Box; 1–4 weeks for full Demand API. |
| **Commission** | ~25–40% of Booking's commission (their commission is ~15% of booking value), so you net roughly 4–6% of total booking value per conversion. |
| **Tracking** | `aid=` parameter on deep-links carries your affiliate ID. |
| **Notes** | This is the flagship integration. Per your §4.2, accommodation is the lead category, and Booking has the broadest hotel + apartment inventory of any single provider. |

### 2. Skyscanner Partners

| | |
|---|---|
| **URL** | https://www.partners.skyscanner.net/ |
| **What you get** | Free affiliate program with flight search and redirect URLs to OTAs/airlines, your tracking ID embedded. (Their B2B Travel APIs are commercial/paid — not for now.) |
| **Approval time** | 3–10 business days. |
| **Commission** | Lead-based revenue share; varies by partner. |
| **Notes** | Skyscanner has tightened their best APIs over time. If full access is gated for new partners, **Tequila by Kiwi.com is the fallback** (next item). |

### 3. Tequila by Kiwi.com (flight backup / complement)

| | |
|---|---|
| **URL** | https://tequila.kiwi.com/portal/login/affiliate |
| **What you get** | Free flight search affiliate API. Easier approval than Skyscanner. |
| **Approval time** | Hours to a day. |
| **Why include alongside Skyscanner** | Kiwi has unique virtual-interlining routes that are genuinely valuable to your nomad audience doing multi-stop trips. Different inventory, complementary not duplicative. |

---

## Phase 2 — Apply after Phase 1 lands (heavier process)

### 4. Expedia Group Partner Solutions (formerly EAN)

| | |
|---|---|
| **URL** | https://developers.expediagroup.com/ |
| **What you get** | Hotels.com, Vrbo, and Expedia inventory under one API. |
| **Approval time** | 2–6 weeks. Enterprise process — they evaluate your business model. |
| **Commission** | ~3–5% of booking value. |
| **Why Phase 2** | Heavier application, easier to get approved once you can show traction or a working app. |

### 5. Amadeus Self-Service

| | |
|---|---|
| **URL** | https://developers.amadeus.com/ |
| **What you get** | Flight search, hotel search, airport data, flight status. **Not affiliate-based — paid API with a free test tier.** |
| **Free tier** | 10,000 calls/month in test environment (real data, sandboxed). |
| **Production cost** | Pay-per-call but cheap at your scale; covered by affiliate revenue from bookings it surfaces. |
| **Why include** | Best fallback for flight data quality. Useful for cross-checking Skyscanner/Kiwi and for flight-status monitoring (§4.5). |

### 6. Hostelworld Affiliate Programme

| | |
|---|---|
| **URL** | https://www.hostelworld.com/affiliate |
| **What you get** | Hostel and budget accommodation inventory + API access on request. |
| **Why include** | Long-stay budget accommodation matters to digital nomads and grey nomads — your two biggest personas. |

### 7. Agoda Partners

| | |
|---|---|
| **URL** | https://partners.agoda.com/ |
| **What you get** | Strong APAC accommodation inventory. |
| **Why include** | A chunk of your nomad audience travels through Asia where Agoda often beats Booking on price. |

---

## Realistic timeline

| Week | Action |
|---|---|
| Week 1 | Stand up landing page on real domain, set up business email, draft privacy policy + ToS. |
| Week 1 | Submit applications to **Booking, Skyscanner, Tequila** in parallel. |
| Week 1–4 | Phase 1 approvals trickle in. I scaffold integration code in `travel-pa/` Workers as each one lands. |
| Week 4 | Submit Phase 2 applications: **Expedia, Amadeus, Hostelworld, Agoda**. |
| Week 6–10 | Phase 2 approvals land progressively, integrations bolt onto the existing abstraction layer. |

---

## Integration prep — buildable now without any credentials

These can be built immediately, in parallel with the application waits:

1. **Provider abstraction layer.** Common interface in Workers code so each provider implements `searchAccommodation(criteria) → Result[]` and `searchFlights(criteria) → Result[]`. Lets us swap, add, or A/B providers without rewriting downstream logic.
2. **Result normalisation schema.** Each provider returns different field names, currencies, star scales, image structures. Define a single `AccommodationResult` and `FlightResult` schema in D1; coerce every provider response into it.
3. **Affiliate ID configuration.** Store per-provider affiliate IDs in Cloudflare environment variables, not hard-coded. One ID per provider, swappable per environment.
4. **Mock provider for development.** A fake provider returning canned realistic data so the UI, ranking logic, and review aggregation can be built and tested before any real API access lands.
5. **Caching layer.** Identical queries inside a 30–60 minute window hit the cache. Cloudflare KV or D1. Saves on per-call quotas (matters once Amadeus and Expedia come online).
6. **Rate-limit handling.** Each provider has limits. Retry-with-backoff and quota tracking from day one — much harder to retrofit later.
7. **Ranking engine against the Wants/Red Flags vector.** Pure code, no LLM. Takes the normalised result list and the user's preference profile from Layer 2 (§6.4), returns a scored and ranked list. This is a chunk of the differentiator from generic chat tools — get it right.

---

## Known gaps to set expectations on

Things that look like they should be available but aren't, so the design doesn't promise them:

- **Airbnb has no public affiliate API.** They closed it. You can deep-link to specific Airbnb listings but can't query their inventory programmatically. Workaround: be strong on Booking + Hotels.com + Hostelworld for apartments and long-stay; be transparent in the UI when Airbnb is excluded from a result set.
- **Direct airline APIs** (Qantas, BA, Singapore Airlines, etc.) are mostly closed to affiliates. Airline inventory comes through Skyscanner / Kiwi / Amadeus aggregators.
- **Google Flights has no public API** despite being mentioned in §5.2. Replace mentions with Skyscanner / Kiwi / Amadeus when next revising the design doc.

---

## What I need from you to keep moving

1. Confirm the domain is registered (or pick one and register it) so applications can reference a real URL.
2. Confirm the business entity status — sole trader vs registered company. This affects which Phase 2 programs to prioritise.
3. Once Booking or Skyscanner approves, drop the credentials into Cloudflare environment variables and tell me — I'll wire the first real integration into the Workers code.

---

*Last updated: 2026-04-25*
