# Nomad App — App Design Document

**Version:** 1.2
**Date:** 22 April 2026
**Status:** Confidential
**Tagline:** Search, compare, monitor, anticipate — across every trip.

> Source of truth for product scope, architecture, and roadmap. Derived from `../Nomad_App_Design_Document_v1.2.pdf`. Update this file and the PDF together when the design changes.

---

## Changes vs v1.1

Read this section first if you only want to know what has moved.

### Product direction

- **Web-first launch.** Ships as a responsive web app (with PWA support) first; native iOS and Android follow in Phase 2. v1.1 treated web as secondary.
- **Multi-language from launch.** Available in multiple languages at day one, not English-only.
- **Freemium model.** A free tier sits alongside the paid tier as top of funnel. Family and group plans removed.
- **No self-booking.** Nomad App never completes bookings — users are always deep-linked to the provider. v1.1 left this open as a possibility.
- **No third-party travel-account logins.** Does not log into airline, hotel, or booking sites on the user's behalf, ever. v1.1 framed this as phase-gated; it is now a permanent structural decision.
- **Hosting stack documented.** Web app and API on Cloudflare (Pages + Workers + D1 + Cron Triggers + Queues). Phase 2 native apps call the same Workers API. See §6.2.

### Features added

- **Cross-Platform Review Aggregation (Phase 1).** Single weighted score across Booking, Airbnb, Google, TripAdvisor, Hotels.com, etc. — recent reviews weighted more heavily.
- **AI Itinerary Generation** via a configured Claude managed agent. Replaces v1.1's "Concierge Mode".
- **Post-stay feedback.** Two questions after every accommodation stay: "Did the property meet your expectations?" and "Did this save you time?"
- **Importance scales (0–10)** on every preference, plus conditional IF/THEN rules ("My Rules").
- **Pause Subscription.** Pause 1–6 months while retaining the profile.
- **Joint Partner Account.** One account, two logins, one shared data pool. Replaces the two-account Partner Connection model.

### Features removed or deferred

- **Concierge Mode** — removed, replaced by AI Itinerary Generation.
- **Visual Map Timeline** — deferred to Phase 2.
- **Budget & Finance** — deferred to Phase 3.
- **Nomad Community Reviews** — demoted to "Future Consideration" (Phase 4 at earliest).
- **Smart watch / wearable integration** — removed.
- **Family and group subscription plans** — removed.
- **Account-login features** across the document — removed.

### Priorities reshuffled

- **Accommodation is the flagship category** — first area of the research engine built out end-to-end. Flights, car hire, and local transport follow.
- **Proactive monitoring runs on a scheduled cadence** (typically every 24 hours), not continuously. Driven by AI token cost.
- **Budget sensitivity is location-relative** — a "budget" spend in Vietnam is normalised against local cost-of-travel rather than absolute dollar bands.

### Metrics

- NPS replaced by **Time Saved Per User** as the headline satisfaction metric.
- **Free-to-Paid Conversion** and **Accommodation Review Aggregation Usage** added as supporting KPIs.

### Risks

- **AI Token Cost** added as a first-class risk.
- **Account Login Legality** risk removed (no longer applicable).

---

## 1. Executive Summary

Nomad App is an AI travel assistant for people who travel often: digital nomads, grey nomads, and frequent independent travellers (4–12 trips per year). The job it does is simple: remove the endless research cycle — hunting for accommodation, flights, transfers, car hire — that consumes hours every week for anyone who lives this way.

Unlike general AI tools (ChatGPT, Gemini, Claude direct), Nomad App has persistent memory of the user's preferences and trip history, connects to their calendar and (opt-in) email, and monitors relevant changes on a schedule so it can surface actions at the right moment. It is a purpose-built travel companion, not a chatbot.

Nomad App **does not complete bookings**. It searches and compares across providers, presents the best options with context, and deep-links to the provider's own booking flow. It also does **not hold passport scans, ID, health records, or payment cards**, and does **not log into third-party travel accounts** on the user's behalf. These are structural product decisions.

The app launches as a web-first product (responsive web + PWA), available in multiple languages. Native iOS and Android follow in Phase 2. Freemium subscription model: a free tier to bring users in, plus a paid tier that unlocks the full research engine, review aggregation, AI itinerary generation, and proactive monitoring.

### 1.1 Why Nomad App, not ChatGPT?

General AI tools are knowledgeable but passive. They answer when asked, forget when the window closes, and have no visibility into the user's calendar, preferences, or trip state.

- **Aggregates research in one place.** Searches multiple providers in parallel — Skyscanner, Booking, Airbnb, Rome2Rio, review sites — and presents a single comparison view with loyalty-point and price-history context.
- **Connects to the tools the user already uses.** Calendar and opt-in email integrations mean the app already knows when the user is travelling, where the gaps are, and what's booked.
- **Monitors on a scheduled cadence.** Checks visa validity, weather, FX, and budget on a managed schedule (typically every 24 hours) and surfaces alerts only when they matter — without burning tokens on continuous polling.
- **Surfaces actions, not just answers.** Deep-links straight into the provider's booking flow. The app removes the research friction; the transaction happens with the provider.
- **Persists across sessions.** Preferences, travel history, and trip timeline follow the user — no starting over.

---

## 2. Product Vision & Goals

### 2.1 Vision

To be the most proactive, personalised travel intelligence platform for people who travel often — removing the friction of planning so the user can focus on the trip itself.

### 2.2 Core Goals

- Automate the travel research workflow — accommodation (flagship), flights, car hire, house-sitting, local transport — optimised for rolling, open-ended itineraries rather than one-off trips.
- Surface needs the user hasn't yet thought of (visa renewals, FX, packing, check-in nudges) on a scheduled cadence.
- Personalise everything using the user's real history, preferences, and location-relative budget.
- Ship web-first, multi-language, on day one. Native mobile follows in Phase 2.
- Hold the minimum data necessary. No passport / ID / health records. No third-party travel-account logins.

---

## 3. Target Users

### 3.1 Primary Personas (Launch)

The launch audience is three overlapping groups: high trip frequency, strong preferences, high data-trust sensitivity, willingness to pay for time back.

- **Digital nomads** — remote workers who move every few weeks or months, manage rolling visas, need long-stay accommodation (30+ days). Existing travel tools assume a short-trip, home-based model they don't fit.
- **Grey nomads / long-stay travellers** — retired or semi-retired travellers on extended trips, often by campervan. Value slow travel, house-sitting, off-peak travel.
- **Frequent independent travellers** — solo or couples taking 4–12 trips a year, mix of leisure, long weekends, bleisure. Technology-comfortable, strong preferences, frustrated by fragmented tools.

### 3.2 Later Expansion

Casual once-a-year holidaymakers, pure business travellers, and family travel are addressable in later phases. The launch product is not built for them and should not be compromised to serve them early.

---

## 4. Feature Set

Two central capabilities carry the product: the **trip calendar** (where everything in the user's travel life lives) and the **research engine** (which eliminates the research cycle). Everything else flows through these.

### 4.1 Trip Calendar & Day-by-Day Timeline

The trip calendar is the source of truth for the user's travel life. The app reads from Google / Apple / Outlook to detect trip dates and avoid conflicts, but every flight, stay, activity, transfer, and note lives inside Nomad App's own calendar.

| Feature | Description |
|---|---|
| Day-by-Day View | Scrollable day-by-day view of the trip in chronological order. Tap any day to expand or jump to a booking. |
| Month & Rolling Views | Month view for planning; rolling 30-day view for nomads who don't think in trips. |
| Two-Way Calendar Sync | Trip items can be surfaced back to Google / Apple / Outlook as read-only events. External calendars are never written to without explicit permission. |
| Manual Additions | Add dinner reservations, medical appointments, visa-run dates directly — first-class alongside imported bookings. |
| Conflict Detection | Overlapping stays, impossible transit times, double-booked days — surfaced here because the app has full visibility. |
| Offline Access | Current day and trip available offline on mobile — critical when landing in a new country. |
| Shareable View | One-tap share with a partner, family member, or emergency contact. Recipients don't need an account. |

*Visual Map Timeline (map overlay of flights, stays, and activities) is Phase 2, not launch.*

### 4.2 Research Engine

The single biggest time sink for the target audience is the research cycle — repeated every few weeks or months for years. The research engine searches and compares across providers in real time, replacing what the user would otherwise do manually across a dozen tabs.

**Nomad App does not complete bookings.** Once the user picks an option, the app deep-links into the provider's own booking flow. This preserves provider relationships, avoids holding payment data, and keeps the app firmly on the research side.

**Accommodation is the flagship category** — built out end-to-end first. Flights, car hire, and local transport follow.

| Feature | Description |
|---|---|
| Accommodation (flagship) | Searches Booking, Airbnb, Hotels.com, Hostelworld, Vio, Agoda. Filters on preferences (location, amenities, importance scores). Surfaces loyalty differences. Includes cross-platform review aggregation (§4.3). |
| Flight Search | Multi-provider comparison (Skyscanner, Google Flights, Kayak, direct airlines). Price history and fare-drop alerts. |
| Car Hire | Rental and insurance comparison. Remembers licence details and preferences. |
| House-Sitting | TrustedHousesitters, HouseCarers integrations (Phase 2). |
| Local Transport | Bus, rail, rideshare, ferry, airport transfers — including timing against flight arrival. |
| Restaurant Discovery | Curated suggestions based on dietary requirements, cuisine, budget, reviews (Phase 2). |
| Grocery Options | Local supermarkets and markets relevant to dietary requirements. |
| Things To Do | Activities based on interests, budget, season, crowd tolerance (Phase 2). |

### 4.3 Cross-Platform Review Aggregation

For each accommodation result, the app scans reviews across Booking, Airbnb, Google, TripAdvisor, Hotels.com, and equivalents, and produces a single weighted overall score. Recent reviews carry more weight — the score reflects the property as it is today.

Users see the aggregated score alongside the per-platform breakdown. This replaces roughly twenty minutes of cross-checking per property and is a primary differentiator for long-stay accommodation, where recent review trends matter most. **Phase 1.**

### 4.4 AI Itinerary Generation

The user can ask Nomad App to generate a complete end-to-end itinerary on demand — destination, dates, pace, interests, budget — and the app produces a structured day-by-day plan covering accommodation, flights, transfers, and suggested activities. Every line item is editable; nothing is booked automatically.

Powered by a **configured Claude managed agent** (a long-running multi-step AI session). Keeping itinerary generation off the main chat thread protects chat responsiveness and controls cost — the agent only runs on explicit request. This is the direct equivalent of what Layla and Mindtrip offer, fitted to Nomad App's memory, review aggregation, and rolling-life context.

### 4.5 Proactive Intelligence

Nomad App watches the user's situation on a managed schedule and surfaces relevant actions at the right moment.

Monitoring runs on a scheduled cadence — typically every 24 hours, with shorter intervals only for time-sensitive items (flight status on active travel days). Continuous polling would burn AI tokens unnecessarily; the scheduler is the operating heart of the proactive layer.

| Feature | Description |
|---|---|
| Calendar Monitoring | Daily check for upcoming travel gaps. "You have no accommodation booked after [date] — shall I look?" |
| Booking Conflict Detection | Cross-references new bookings against existing ones at point of entry. |
| Transport Cut-Off Warnings | "You land at Osaka at 9:30pm. The last train runs at 10:20pm. 15% of these flights arrive too late — I've saved a taxi link." |
| Flight Status Monitoring | Delays, gate changes, cancellations, rebooking — the one category running at higher polling frequency. |
| Check-In Nudges | Reminders at the right time: "24-hour check-in is open for tomorrow's flight." |
| Visa & Document Alerts | ESTA/ETA requirements, passport validity, entry restrictions per destination. |
| Vaccination Advice | Recommended and required vaccinations based on current health-authority guidance. |
| Passport Expiry | Renewal reminders well ahead of country-specific minimum validity windows. |
| Weather Packing Nudges | "Rain predicted for your first week in Edinburgh — waterproof jacket?" |
| Day Trip Route Optimisation | Optimal order for multi-stop days factoring crowds and opening times. |
| Provider Monitoring | Periodic scan of new travel platforms so coverage stays current. |

### 4.6 Account Access & Information Retrieval

The app retrieves, monitors, and surfaces information via a small set of user-authorised API integrations — **not** by acting as a document vault or account aggregator.

| Feature | Description |
|---|---|
| Calendar Integration | OAuth to Google, Apple, or Outlook Calendar. Required for proactive features to function. |
| Email Integration (read-only, opt-in) | OAuth; extracts booking confirmations and travel receipts only. No sending, no general inbox access. |
| Auto-Fill Forms (opt-in, non-sensitive) | Stores name, email, home airport, dietary preferences, frequent-flyer numbers. Never stores passport, ID, or payment cards. |
| Entry Permit Reminders | Tracks ESTA, eTA, Schengen 90/180, and equivalents — status and expiry dates only, never document copies. |
| Insurance Reminders | Policy reference and expiry for renewal reminders. Full policy documents stay with the insurer. |

**Third-party travel-account logins (airlines, hotels, booking sites) are not supported** — structural decision, not a phase gap. See §6.5.

### 4.7 Post-Stay Feedback

After every accommodation stay, the app asks two questions:

- Did the property meet your expectations?
- Did this save you time?

Single-tap answers (yes / mostly / no) plus optional short comment. Response data feeds personalisation (boost similar properties, down-weight misses) and supplies the app's headline satisfaction metric (**Time Saved Per User** — see §13).

### 4.8 Budget & Finance (Phase 3)

Deferred. Launch and Phase 2 have lightweight expense notes within the trip calendar. The full budget module arrives in Phase 3 and will include native tracking, CSV/PDF import from apps like Trail Wallet or TravelSpend, multi-currency FX, and location-relative categorisation.

Budget sensitivity is **location-relative**. A "budget" accommodation spend in Vietnam is normalised differently from one in New York — preferences are ranked against local cost-of-travel data, not absolute dollar bands.

### 4.9 Safety & Local Awareness

| Feature | Description |
|---|---|
| Safe Street Tracker | Optional location awareness flagging areas of concern, drawing on advisories and community reports. |
| Traffic & Delay Alerts | Live conditions and alternative routes for planned destinations. |
| Local Apps Guide | Handy local apps for each destination — transport, food delivery, payments — saving time on arrival. |
| FX Kiosk Locations | Reputable exchange options near accommodation or arrival points. |

### 4.10 Trip Experience & Sharing

| Feature | Description |
|---|---|
| Multi-Traveller Mode | On trip creation, the assistant asks whether the trip is solo or for two+. Both travellers' preferences are accommodated. |
| Share Itinerary | One-tap share with partner, family, or emergency contact. |
| Joint Partner Account | Two users, one subscription, one shared data pool (see §9). |

### 4.11 Nomad Community Reviews (Future Consideration)

A member-only review layer is set aside for now. The higher-priority review capability is the cross-platform aggregation in §4.3, which delivers signal from day one without seeding a first-party review corpus. If and when the subscriber base makes first-party reviews worthwhile, a lightweight member system can layer on top.

---

## 5. Integrations & Data Sources

### 5.1 Integration Principle — API-First

Nomad App only integrates live with services that expose a supported API (public API, OAuth, documented webhook). Providers without an API get alternative paths: manual entry, CSV / PDF import, or deep-link handoff. **Screen-scraping and reverse-engineered endpoints are out of scope** — legal, reliability, and security risk the product will not carry.

Separately: the app does not authenticate into third-party travel accounts on the user's behalf. Structural decision — see §4.6.

### 5.2 Travel Booking Platforms

- **Accommodation (priority):** Booking.com, Airbnb, Hotels.com, Hostelworld, Agoda, Vio
- **Flights:** Skyscanner, Google Flights, Kayak, Expedia, direct airline APIs
- **Car Hire:** Rentalcars.com, Kayak, direct supplier APIs (Hertz, Avis, Enterprise)
- **House-Sitting:** TrustedHousesitters, HouseCarers, Nomador
- **Local Transport:** Google Maps, Rome2Rio, Trainline, local transit APIs
- **Ride-hail:** Uber, Grab, Bolt, Didi, and regional equivalents

### 5.3 Productivity

- **Calendar:** Google Calendar, Apple Calendar, Outlook Calendar
- **Email (read-only booking extraction):** Gmail, Outlook, Apple Mail
- **Contacts:** Device contacts for itinerary sharing

### 5.4 Financial Data (Phase 3)

- **FX providers:** Wise, Revolut, XE, Travelex
- **Loyalty programmes:** Qantas, Velocity, BA Avios, Marriott Bonvoy, Hilton Honors, others
- **Open Banking (PSD2 / CDR):** optional, opt-in, later-phase
- **Travel budgeting apps (one-time import):** Trail Wallet, TravelSpend, Trabee Pocket

### 5.5 Travel Intelligence & Safety

- **Visa:** IATA Travel Centre, Sherpa, official government portals
- **Health:** WHO, CDC, Smartraveller (DFAT), FCO Travel Aware
- **Flight status:** FlightAware, FlightRadar24, airline APIs
- **Weather:** OpenWeatherMap, Weather.com, local meteorological services
- **Safety:** Government travel advisories, GeoSure

### 5.6 Content & Reviews

- **Restaurants & activities:** TripAdvisor API, Google Places, Yelp
- **Accommodation review aggregation:** Booking, Airbnb, Google, TripAdvisor, Hotels.com — pulled into one recent-weighted score (§4.3)
- **Local apps:** Curated editorial + community database

---

## 6. Technical Architecture (Overview)

### 6.1 Platform

- **Web app (primary, launch):** Responsive web app in any modern browser — desktop, tablet, mobile. PWA-capable (installable, offline support for current trip, web push where supported). Not a cut-down companion to a native app.
- **Native mobile (Phase 2):** iOS (Swift/SwiftUI) and Android (Kotlin/Jetpack Compose), built at feature parity with the web. Adds superior push, tighter OS integration, richer offline for in-trip use.
- **Multi-language:** Available in multiple languages from day one. The audience is global by definition.
- **Not planned:** No desktop app, no voice, no smartwatch / wearable.
- **AI Engine:** Claude API. Messages API for real-time chat; configured Claude managed agents for itinerary generation and long-running research. Scheduler for proactive monitoring (see §4.5).

### 6.2 Hosting & Infrastructure

The entire web stack runs on **Cloudflare**. One responsive Pages project covers desktop, tablet, and mobile browser — installable to home screen as a PWA. The Phase 2 native iOS and Android apps are distributed via the App Store and Play Store and call the same Cloudflare Workers API as the web app. **One backend, three frontends.**

| Layer | Implementation |
|---|---|
| Web frontend | Cloudflare Pages. Single responsive SPA / SSR project — no separate "mobile web" build. PWA-installable with offline support for the current trip and web push where supported. |
| API backend | Cloudflare Workers. Handles chat, search, OAuth flows (calendar, email), auth, subscriptions, webhooks. Same endpoints serve the web app and (Phase 2) the native mobile apps. |
| Database | Cloudflare D1 (SQLite) at launch — user profiles, trips, preferences, rules. Can migrate heavy relational workload to managed Postgres (Neon, Supabase) later if scale requires. Phase 3 consideration, not a launch blocker. |
| Scheduler | Cloudflare Cron Triggers run the 24-hour proactive monitoring cadence (see §4.5). |
| Async jobs | Cloudflare Queues and Durable Objects handle work too long for a single Worker invocation. The Claude managed agent for itinerary generation runs against Anthropic infrastructure and webhooks back to a Worker on completion — the Worker coordinates, it does not hold the session open. |
| Native mobile (Phase 2) | iOS (Swift/SwiftUI), Android (Kotlin/Jetpack Compose). Distributed via App Store and Play Store. Call the same Cloudflare Workers API. |

**Why Cloudflare:** cost-efficient for this workload profile, edge-distributed (aligns with a global, multi-language audience), and a native fit with the scheduled + queued architecture the product depends on. Avoids the operational overhead of running AWS or GCP for a product where most requests are lightweight API calls or static-asset delivery.

### 6.3 Data Architecture

- **User Profile Store:** encrypted preferences (with importance scales and IF/THEN rules), travel history, dietary, budget.
- **Trip Database:** structured trip data with real-time sync across devices.
- **Integration Layer:** OAuth to calendar and email APIs only — no third-party travel-account auth.
- **Notification Engine:** web push (primary) and native mobile push (Phase 2).
- **Offline Cache:** current itinerary and today's timeline cached locally.

### 6.4 Memory & Preferences Architecture

Nomad App's memory is built in **two layers**. Keeping them separate is foundational.

**Layer 1 — Agent rules (same for every user).** The system prompt that defines what Nomad is: identity, tone, data-minimisation principles, search behaviour, when to escalate, safety guardrails. Set centrally, versioned centrally, identical across accounts. Users never see it directly.

**Layer 2 — User state (different per account).** The user's travel identity, stored in Nomad App's database and loaded into context each conversation. It's what makes Nomad feel like theirs.

Layer 2 has four interlocking surfaces the user can inspect and edit:

- **Wants** — things the user looks for. Each carries an importance score 0–10 (e.g. Gym: 9, Pool: 5, Balcony: 3).
- **Red Flags** — things the user actively avoids. Also scored 0–10 for severity.
- **My Rules** — IF/THEN statements applied in context. "IF booked <1 week before stay THEN cancellation policy not required"; "IF city is one I've stayed in THEN prioritise the same neighbourhood."
- **Active state** — current trip calendar, bookings, travel history, post-stay feedback, loyalty memberships, visa status, passport expiry date (never the document itself).

Importance scores **rank**; they don't hard-filter. When a listing matches a high Want but triggers a Red Flag, the app still shows it with the trade-off displayed. The user makes the call.

Layer 1 is deliberately unopinionated. Behaviours like weighting recent reviews or filtering on noise keywords live in Layer 2, expressed through the user's own Wants, Red Flags, and Rules — because every nomad's priorities differ and an opinionated agent alienates users whose defaults don't match.

The longer a user stays, the richer Layer 2 becomes — and the harder it is to leave for generic chat AI, which has none of this state.

### 6.5 Security & Privacy

**Data-minimisation is the principle.** The app doesn't hold information it doesn't need.

- No storage of passports, ID scans, or health records — no document vault.
- No payment card storage — transactions happen in the provider's environment.
- No third-party travel-account logins on the user's behalf.
- OAuth 2.0 / PKCE for calendar and email integrations; passwords never stored.
- End-to-end encryption for user data in transit and at rest.
- Biometric auth (Face ID / fingerprint) once native apps ship.
- Data residency options for regulated jurisdictions.
- GDPR, Australian Privacy Act, and equivalents.
- Business model never depends on selling user data — precluded architecturally.

---

## 7. User Experience Design

### 7.1 Onboarding

First-run onboarding is conversational, guided by the AI. It captures travel style, dietary requirements, accommodation preferences (with importance ratings), location-relative budget, loyalty memberships, home airport, and calendar / email connection.

### 7.2 Home Dashboard

The home screen is contextual. Pre-trip: countdown, day's itinerary, flight status. Between trips: upcoming booking gaps, FX alerts, destination ideas.

### 7.3 Conversational Interface

Natural-language research. The assistant holds context so users can refine: "Find accommodation in Kyoto for the 15th" → "Kitchen, under $120" → "Open the second on Booking.com." The last step deep-links out; Nomad App doesn't complete the transaction.

### 7.4 Visual Trip Timeline (Phase 2)

Interactive map-and-timeline view of each trip. Phase 2 feature — Phase 1 uses the day-by-day list (§4.1).

### 7.5 Notifications

Each notification carries context and a clear action — a gate-change alert opens the terminal map; a check-in reminder opens the airline's check-in page. Users control preferences by category and urgency.

### 7.6 Preferences Profile

The user can inspect and edit everything Nomad has learned. Four surfaces, mirroring the memory model (§6.4):

- **Things I Want** — with an importance slider (0–10) per entry.
- **Things I Don't Want** — with a severity slider (0–10) per entry.
- **My Rules** — IF/THEN conditionals the user can add, edit, or remove. The agent may propose rules from conversation patterns and asks before adopting them.
- **Budget by Category** — per-category bands that are location-relative.

**No hidden learning.** If it influences a result, it appears in the profile.

---

## 8. Personalisation

Nomad App builds a model of each user's travel identity over time, all feeding from the profile surfaces in §6.4 and §7.6:

- **Accommodation style** — from past bookings, ratings, post-stay feedback (boutique vs chain, central vs budget).
- **Cuisine and dietary** — hard requirements (allergies, religious) and preferences.
- **Budget sensitivity** by category, location-relative (Vietnam vs New York).
- **Crowd tolerance** — landmark tourism vs off-the-beaten-path.
- **Loyalty priorities** — which points the user actually values.
- **Travel pace** — packed vs slack.

**Transparent throughout.** The assistant can explain any recommendation by pointing to the relevant preference, importance score, or rule.

---

## 9. Multi-Traveller & Joint Accounts

At trip creation the app asks whether the trip is solo or with someone. If with a partner, both travellers' dietary, preferences, and interests feed research. Accommodation defaults to double occupancy. One traveller flying out earlier or later is handled without confusion.

A guest view lets non-users track a trip without creating an account.

### 9.1 Joint Partner Account

Two users who travel together operate as a joint account — **one subscription, two logins, one shared pool of trip data**. Both see and edit the same calendar, bookings, preferences, and notes in real time. Individual dietary preferences are still expressed within the joint profile; the trip is shared.

Accounts can be un-merged, and each user's profile can be detached to an individual subscription. Default: one account, one trip, two people.

---

## 10. Monetisation

### 10.1 Subscription Model

**Freemium.** The free tier brings users in; the paid tier is the commercial backbone.

- **Free Tier.** Deliberately basic. Trip calendar (view + manual entry), accommodation search on a single provider, limited AI queries per month. Enough to feel the product; not enough to run a nomadic life on.
- **Individual Plan.** Monthly or annual (annual discount). Full research engine, cross-platform review aggregation, AI itinerary generation, proactive monitoring, opt-in email extraction, full preferences profile.
- **Joint Account Plan.** One subscription, two users, shared data pool (§9.1). Priced above Individual, well below two separate subscriptions.
- **Pause Subscription.** Pause for 1–6 months. Trip history, preferences, and rules are preserved; AI and proactive features are suspended. Fits the rhythm of nomadic life and reduces outright churn.

Family and group plans are out of scope — adjacent market, later expansion.

### 10.2 Affiliate Revenue

When users deep-link through to a provider and complete a booking, Nomad App earns standard affiliate commissions. **Disclosed transparently. Does not influence the ranking of recommendations — enforced architecturally.**

---

## 11. Roadmap

| Phase | Timeframe | Key Deliverables |
|---|---|---|
| **Phase 1 — MVP (Nomad Core)** | Months 1–6 | Web-first launch (responsive + PWA). Accommodation research engine (flagship). Cross-platform review aggregation. Flight search. Trip calendar with day-by-day view. Calendar integration. Opt-in email booking extraction. Visa / entry-permit reminders (incl. Schengen 90/180). Preferences Profile with importance scores and IF/THEN rules. Multi-language. Free tier + Individual Plan. Post-stay feedback. |
| **Phase 2 — Intelligence** | Months 7–12 | Native iOS and Android (feature parity with web). Visual map timeline. AI itinerary generation via Claude managed agent. Proactive monitoring (24h cadence). House-sitting. Restaurant + activity recommendations. Personalisation v1. Joint Account Plan. Pause Subscription. |
| **Phase 3 — Budget & Automation** | Months 13–18 | Budget & Finance module (native tracker, CSV/PDF import, location-relative categorisation, multi-currency FX). Car hire. Safe Street Tracker. Personalisation v2. Loyalty points intelligence. |
| **Phase 4 — Ecosystem & Expansion** | Months 19–24 | Nomad Community Reviews (if warranted). Optional open banking. Provider review monitoring. Expansion to casual / once-a-year travellers. |

---

## 12. Risks

### 12.1 Privacy & Data Trust

The audience is especially trust-sensitive. Response is structural: no passport/ID/health record storage, no third-party travel-account credentials, no selling of user data. Privacy must be visibly demonstrated in the UI — e.g. at the point of connecting a calendar or email account.

### 12.2 AI Token Cost

Unit economics depend on keeping AI token consumption under control. Continuous polling would be prohibitive — monitoring runs on a 24h cadence with tight exceptions, and long-running work is delegated to managed agents to keep real-time chat cheap. Cost-per-user is instrumented from day one. See the separate `Nomad-App_Reducing-AI-Token-Costs.pdf` design guide.

### 12.3 AI Reliability

Proactive features depend on accurate inference. The app handles ambiguity by presenting options, never taking unilateral action on high-stakes decisions. Because Nomad App doesn't complete bookings itself, the transaction boundary is structural.

### 12.4 API Dependency

Third-party APIs change. Diversified sources and an abstraction layer reduce brittleness. Providers without APIs are not live integrations — see §5.1.

### 12.5 Regulation

Financial features (FX, open banking in Phase 4) require compliance per market. Travel insurance presentation may require licensing in some jurisdictions.

---

## 13. Success Metrics

| Metric | Description |
|---|---|
| Subscription Retention | Monthly and annual churn — target <5% monthly at steady state. |
| Free-to-Paid Conversion | % of free-tier users who upgrade within 30 / 90 days — the central commercial metric. |
| Proactive Engagement Rate | % of proactive nudges the user acts on — measures relevance. |
| Research-to-Booking Deep-Link Rate | % of research sessions ending in a click-through to a provider — measures whether the research is actually useful. |
| **Time Saved Per User** | Derived from the "Did this save you time?" question plus usage telemetry. Replaces NPS as the headline satisfaction metric. |
| Daily Active Usage | % of users opening the app or interacting with a notification during active travel. |
| Accommodation Review Aggregation Usage | % of accommodation search sessions in which the aggregated score is viewed — engagement with the flagship Phase 1 differentiator. |

---

## 14. Appendix — Example Interactions

### A. Transport Cut-Off

> "You're landing at Osaka Kansai at 9:30pm. Trains stop after 10:20pm. Around 15% of JL727 flights arrive too late for the last service. I've saved a taxi link and a hotel transfer — tap to view."

### B. Booking Gap

> "Nothing booked from 20 April, and your Tokyo plans run to the 22nd. Shall I look? Based on your rules and preferences: central neighbourhoods, under ¥15,000/night, gym (importance 9), strong recent reviews."

### C. Weather Packing

> "Rain predicted for the first 5 days of your Edinburgh trip. Your packing list doesn't include waterproof gear — pick up a jacket or packable poncho before you go? I've found options near you."

### D. Post-Stay

> "Quick one while it's fresh — did the Lisbon apartment meet your expectations? And did Nomad save you time on this one?"
