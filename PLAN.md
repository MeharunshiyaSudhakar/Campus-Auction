# Campus Auction: PLAN.md

## Vision
A fair, honest auction web app where seniors leaving campus sell items to juniors.
Fair = everyone sees the same bids and timers. Honest = every listing discloses the exact condition.

## Stack
MongoDB, Express, React (Vite), Node.js, Socket.io, JWT auth, an AI API for the description helper and assistant.

## Architecture
- /server: routes -> controllers -> services -> models
- /client: React pages, components, API layer, socket hook
- Server clock is the single source of truth for all timers and bid validation.

## Core Rules (from the brief)
- Each item is its own auction with its own closing time.
- First bid >= starting price; later bids >= current price + minimum increment.
- No bids after closing. Every bid is recorded (bidder, amount, time) and public.
- Highest valid bid = provisional winner. No bids = unsold.
- Seller approves or rejects the winning price. Approval reserves the item; confirmed
  campus handover completes the sale.
- Rejection, cancellation and failed pickup are recorded with a clear outcome.
- Bid in the last 30s -> closing time moves to 60s after that bid.

## Data Models
User, Listing, Bid, Question, Notification, WantedAlert, AutoBid, AiActionLog

## Status Flow (Listing)
active -> closed -> pending_approval -> approved/reserved -> pickup_scheduled -> completed
Other outcomes: unsold, rejected, cancelled, pickup_failed

## Modules
1. Student Auth
2. Item Listings (structured condition form, photos, honesty declaration)
3. AI Description Helper (AI asks condition questions, drafts description, seller approves)
4. Search & Filters (keyword, category, condition, price, closing soon, natural-language search)
5. Live Bidding (validation, public history, Socket.io updates)
6. Countdown & 30s Extension
7. Auction Closing Engine (scheduler)
8. Approval & Pickup Tracker (shared tracker for buyer and seller, handover code)
9. Q&A Before Bidding (public answers, rate limit, hide spam)
10. Notifications (in-app + browser)
11. Auto-Bidding (max set by buyer, bids only as needed)
12. AI Shopping Assistant (needs and budget, proposes bids, acts only with approval)
13. Wanted Alerts (saved requests, notify even if offline)

## Standout Features (pick 2-3 to polish)
- AI condition interview for honest listings
- Condition badges and listing quality score
- Permission-gated AI bidding with an approval log
- Pickup tracker with a handover code
- "Leaving campus" urgency view
- Fair-play transparency panel (why a bid was accepted, when an extension happened)

## AI Guardrails
- Never place a bid without explicit student confirmation.
- Never exceed the limit the student agreed to.
- Never reveal other students' account details.
- Log every AI-proposed and approved action.

## Build Order
Phase 1 (core, end to end): setup + auth -> listings -> browse/search -> bidding -> closing -> approval + pickup
Phase 2 (live + fair): Socket.io + countdown -> 30s extension -> notifications
Phase 3 (differentiators): AI description helper -> auto-bidding -> Q&A -> AI assistant + NL search -> wanted alerts

## Rationale
Basics are mandatory, so they come first and must work end to end. Live updates and the
extension make it feel like a real auction. AI features depend on everything else, so they come last.

## Workflow
- Public GitHub repo from day one; commit after each finished piece.
- One module per task; review before moving on.
- Keep secrets in .env, never commit them.
- All planning happens in one chat session; the link is shared with evaluators.
