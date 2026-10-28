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
2+3. AI-Guided Sell Flow (one-question-at-a-time, autosaved drafts, facts-only AI rephrase, review screen)
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
14. Profile & History Dashboard
15. Unsold Item Alerts

## Module 2+3: AI-Guided Sell Flow
- "Sell Item" opens a guided page; the AI asks one question at a time
- The backend defines the question list per category (cycle, calculator, books, electronics);
  the AI adds friendly phrasing, category suggestions, and the final rephrase
- Answers autosave to a SellDraft; the seller can resume
- Review screen: structured summary, original vs AI-rephrased description, suggestions,
  honesty declaration, edit anything, then Publish
- The AI never invents facts and never publishes; the seller publishes after server validation
- Fallback: template description if the AI call fails
- Palette: Forest, Sage, Warm white, Amber, Charcoal (CSS variables)

## Module 14: Profile & History Dashboard
Each student has a private profile area showing their own activity.
- Selling history: items listed, sold, unsold, cancelled, with outcome and final price
- Buying history: auctions bid on, won, lost, with outcome
- Money summary: total spent (completed purchases) and total received (completed sales).
  Only count a sale after handover is confirmed. Show reserved/pending amounts separately.
- Charts: spending and earnings over time (bar/line), plus sold vs unsold count
- Period filter: day, month, year, or a custom date range; filters apply to the history list, totals and charts together
- Privacy: this dashboard is visible only to its owner. The public profile still shows only the name.

## Module 15: Unsold Item Alerts
- Detect a seller's listings that are not selling: active listings with no bids after N days (default 3), and auctions that closed unsold
- Notify the seller (in-app and browser), once per listing per threshold, with no repeats
- "Needs Attention" page lists those items with reasons (no bids yet, closed unsold, rejected price)
  and quick actions: edit the price/closing time, cancel, or relist
- Relisting is a convenience that prefills a new listing from the old one; it creates a new auction
- Build order: after Modules 8 and 9

## Module 16: Payments (Razorpay)
- Seller selects accepted payment methods when listing (>= 1): online via Razorpay
  (UPI/cards/netbanking), direct UPI to seller, cash on pickup
- After approval, the buyer chooses one of the seller's methods
- Razorpay: server creates the order (amount from the DB, never the client), checkout on
  the client, server verifies the payment signature; optional webhook
- Cash / direct UPI: recorded as pending and confirmed by the seller at handover
- Payment status shown in the pickup tracker; sale completes after handover
- Failed pickup after an online payment is flagged "refund needed"
- Key Secret only in server .env; test mode for the hackathon

## Module 17: Home Page & Navigation
- Home (landing + feature explanations), Live Auctions via a header icon, Sell Item in the header

## Module 18: Categories
- Broad categories (Vehicles, Stationery, Books, Electronics, Furniture, Clothing, Sports, Other);
  seller then fills in what the item is. Question sets exist per category, with generic condition
  questions for Other.

## Module 19: Instagram-style Profile
- Public view: name, Posts (listings), Reels (short demo clips, optional), Reposts
- Owner-only: Investments (spent/received), charts, history, engagement
  (views, bids received, watchlist saves, questions answered)
- Filters as dropdowns (period, type, status)
- Build order: reels and reposts last

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
Auth → sell flow (with categories and payment-method step) → browse → bidding → live updates and extension → closing → approval → payments → pickup tracker → notifications → Home and header → profile and investments → Q&A, auto-bidding, AI assistant, wanted alerts → reposts → reels (if time).

## Rationale
Basics are mandatory, so they come first and must work end to end. Live updates and the
extension make it feel like a real auction. AI features depend on everything else, so they come last.

## Workflow
- Public GitHub repo from day one; commit after each finished piece.
- One module per task; review before moving on.
- Keep secrets in .env, never commit them.
- All planning happens in one chat session; the link is shared with evaluators.
