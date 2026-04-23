# Travel Personal Assistant — Claude Code Instructions

## What We're Building

A proactive, intelligent **Travel Personal Assistant** app. This is not a simple chatbot — it is a deeply personalized, multi-device travel agent that acts *before* the user asks, combining account access, calendar awareness, real-time data, and highly contextual recommendations.

The full product vision and design live in the parent "Travel PA application" folder (configured as an additional working directory — readable via the Read tool):

- `../Nomad_App_Design_Document_v1.2.pdf` — primary app design document
- `../Nomad-App_Reducing-AI-Token-Costs.pdf` — AI cost architecture doc

Consult these when making architectural or product decisions.

---

## Core Philosophy

- **Proactive over reactive** — the assistant surfaces needs before the user asks
- **Personalized by history** — recommendations reflect the user's known preferences, budget range, and travel patterns
- **Contextually smart** — e.g., knows flight arrival times vs. last train times; knows couple vs. solo travel scenarios
- **Beyond free AI** — the differentiator is account login capability, calendar/email integration, and real-time proactive alerts

---

## Key Feature Areas

1. **Research & Booking** — accommodation, flights, car hire, transport, restaurants, groceries, activities
2. **Proactive Calendar Monitoring** — detects unbooked trips, flags clashes, initiates research unprompted
3. **Document Vault** — boarding passes, passports, visas, insurance, ESTA — all accessible, auto-fills forms
4. **Real-Time Alerts** — flight delays, gate changes, traffic, safety, weather
5. **Budget & Finance** — tracks spend vs. budget, compares FX rates, flags loyalty point differences
6. **Visual Timeline & Map** — shareable trip view with day-by-day itinerary
7. **Travel Intelligence** — visa requirements, vaccination suggestions, local app recommendations, crowd avoidance
8. **Post-Trip Debrief** — budget summary, photo montage, trip notes
9. **Nudges & Reminders** — check-in alerts, packing lists, passport expiry, watch notifications
10. **Voice Mode** — hands-free interaction

---

## Tech Considerations

- Multi-device (phone, tablet, desktop, watch)
- Email integration (read access for travel data extraction)
- Calendar integration (read access)
- Account login capability across booking platforms (Booking.com, Skyscanner, etc.)
- Bank/budgeting app integration
- Location awareness for routing and safety alerts
- Peer review monitoring for platform discovery

---

## Coding Preferences

- Keep components modular — each feature area should be independently buildable
- Prioritise the user profile / preferences data model early — it underpins personalisation throughout
- Use clear, descriptive naming that reflects the travel domain (e.g., `TripTimeline`, `DocumentVault`, `ProactiveAlert`)
