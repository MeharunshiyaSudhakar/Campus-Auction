# Campus Auction: Task Checklist

## Phase 0: Setup
- [x] Create public GitHub repo (`campus-auction`) and configure remote
- [x] Add PLAN.md and TASKS.md
- [x] Create /server (Express, Mongoose) and /client (React + Vite)
- [x] Add .gitignore, .env.example, and a README with run steps
- [x] Connect MongoDB (Compass / local 27017) and test the connection
- [x] First commit and push

## Module 1: Student Auth
- [x] User model (name, email/roll number, password hash)
- [x] Register and login endpoints with JWT
- [x] Auth middleware to protect routes
- [x] GET /me endpoint
- [x] Login and register pages in React
- [x] Protected routes and logout
- [x] Check: public profile shows only the name (zero private leak)

## Module 2+3: AI-Guided Sell Flow
- [x] SellDraft model (seller, category, answers, step, status)
- [x] Question config per category (key, label, type, required)
- [x] Endpoints: start draft, get next question, save answer, go back, resume draft
- [x] Server-side validation per answer (price, increment, closing time in future, photos)
- [x] Photo upload step (minimum 2-3 photos, size limit)
- [x] AI endpoint: rephrase description from the seller's answers (facts only)
- [x] AI endpoint: category suggestions for missing or helpful details
- [x] Template fallback if the AI fails
- [x] Review screen: structured summary, original vs rephrased, accept/reject suggestions
- [x] Honesty declaration required before Publish
- [x] Publish endpoint creates the Listing from the draft and deletes the draft
- [x] Check: seller cannot publish with missing required fields
- [x] Check: rephrase never adds details the seller did not give
- [x] Add palette as CSS variables in the client

## Module 4: Search and Filters
- [x] Text index and keyword search
- [x] Filters: category, condition, price range, closing soon
- [x] Listings grid with condition badges
- [x] Auction detail page (details, photos, leading bid, bid history)
- [x] Pagination or lazy loading

## Module 5: Bidding
- [ ] Bid model (bidder, amount, time)
- [ ] First bid ≥ starting price; later bids ≥ current price + increment
- [ ] Reject bids after closing, using the server clock
- [ ] Seller cannot bid on their own item
- [ ] Update current price and leading bidder atomically
- [ ] Public bid history on the detail page
- [ ] Bid form with clear error messages

## Module 6: Live Updates, Countdown and Extension
- [ ] Socket.io server and client setup, with a room per auction
- [ ] Broadcast new bids and price changes live
- [ ] Countdown timer driven by the server’s closing time
- [ ] Valid bid in the last 30s moves closing time to 60s after that bid
- [ ] Broadcast the new countdown to all viewers
- [ ] Test: multiple extensions in a row, and a bid exactly at close

## Module 7: Auction Closing Engine
- [ ] Scheduler (node-cron or timers rebuilt on server restart)
- [ ] Close auctions when time passes (respecting extensions)
- [ ] Set provisional winner, or mark unsold if no bids
- [ ] Idempotent closing (never closes twice)
- [ ] Test: server restart during an active auction

## Module 8: Approval and Pickup Tracker
- [ ] Seller approve/reject the winning price
- [ ] Approval reserves the item for the winner
- [ ] Pickup scheduling (time and place on campus)
- [ ] Handover confirmation (optionally via handover code)
- [ ] Record outcomes: rejected, cancelled, pickup failed, completed
- [ ] Tracker page visible to both buyer and seller
- [ ] Status history log

## Module 9: Notifications
- [ ] Notification model and endpoints
- [ ] In-app bell with unread count
- [ ] Events: outbid, won, approval needed, approved/rejected, pickup updates
- [ ] Browser Notification API permission prompt
- [ ] Browser pop-ups when the tab is in the background
- [ ] Mark as read

## Module 10: Q&A Before Bidding
- [ ] Question model (auction, asker, text, answer)
- [ ] Buyers ask questions; the seller answers once, publicly
- [ ] Rate limit and length limit on questions
- [ ] Seller can hide spam
- [ ] Notify the seller of new questions and the asker of answers
- [ ] Q&A section on the auction page

## Module 11: Auto-Bidding
- [ ] AutoBid model (user, auction, maximum)
- [ ] Bid only as much as needed to keep the user leading
- [ ] Handle two competing maximums correctly
- [ ] Maximums are public, per the brief
- [ ] Trigger on every new bid
- [ ] Cannot go beyond the maximum
- [ ] Tests for tie and edge cases

## Module 12: AI Shopping Assistant
- [ ] Assistant tab and chat UI
- [ ] Parse needs and budget into structured JSON (category, max price)
- [ ] Search listings and show matches
- [ ] Propose a bid, then wait for explicit confirmation
- [ ] Backend enforces the agreed limit before any bid is placed
- [ ] Never expose other students’ account details
- [ ] AiActionLog of proposed and approved actions
- [ ] Natural-language search ("cycle under ₹2,000")

## Module 13: Wanted Alerts
- [ ] WantedAlert model (keywords, category, max price)
- [ ] Create and delete alerts page
- [ ] On new listing, match alerts and create notifications
- [ ] Show missed alerts on next login

## Module 14: Profile and History Dashboard
- [x] Profile page route (owner only)
- [x] Selling history endpoint with outcome and final price
- [x] Buying history endpoint with outcome (won / lost / pending)
- [x] Totals: spent and received (completed handovers only); pending shown separately
- [x] Mongo aggregation grouped by day / month / year
- [x] Period filter (day, month, year, custom range) with query params
- [x] Charts: spending and earnings over time, sold vs unsold
- [x] Empty states when the period has no data
- [x] Check: totals match the sum of listed history rows
- [x] Check: another user cannot read someone else's history

## Module 15: Unsold Item Alerts
- [x] Configurable threshold (default 3 days, set in .env)
- [x] Scheduled job finds stale listings (no bids) and unsold closures
- [x] Notification created once per listing per threshold (store a flag)
- [x] Needs Attention endpoint and page
- [x] Quick actions: edit, cancel, relist (prefilled new listing)
- [x] Check: no duplicate notifications after a server restart

## Polish and Submission
- [ ] Mobile-responsive UI
- [ ] Error and loading states everywhere
- [ ] Seed script with sample items for the demo
- [ ] Walk the full flow end to end: list → bid → extension → close → approve → pickup
- [ ] Clean README (features, setup, decisions and why)
- [ ] Commit history is meaningful, one commit per finished piece
- [ ] Planning chat link ready to share
- [ ] Prepare a 2-minute pitch and your reasons for the build order
