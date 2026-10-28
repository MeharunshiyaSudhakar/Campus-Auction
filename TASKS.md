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

## Module 2: Item Listings
- [ ] Listing model with structured condition (grade, age, working status, defects, accessories, category details)
- [ ] Create listing endpoint with validation (required fields, defects mandatory for Fair/Poor)
- [ ] Photo upload (minimum 2-3 photos, size limit, defect photo prompt)
- [ ] Honesty declaration checkbox
- [ ] Edit listing (lock price fields once bids exist)
- [ ] Cancel listing (record cancelled outcome)
- [ ] Create-listing form in React with category-specific fields
- [ ] "My Listings" page

## Module 3: AI Description Helper
- [ ] aiService.js with provider, fallback and API key in .env
- [ ] Question flow per category (age, working status, defects, accessories)
- [ ] Endpoint that turns answers into a draft description
- [ ] Seller can edit and approve the draft
- [ ] Template fallback when the AI call fails
- [ ] Send no personal data to the AI

## Module 4: Search and Filters
- [ ] Text index and keyword search
- [ ] Filters: category, condition, price range, closing soon
- [ ] Listings grid with condition badges
- [ ] Auction detail page (details, photos, leading bid, bid history)
- [ ] Pagination or lazy loading

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

## Polish and Submission
- [ ] Mobile-responsive UI
- [ ] Error and loading states everywhere
- [ ] Seed script with sample items for the demo
- [ ] Walk the full flow end to end: list → bid → extension → close → approve → pickup
- [ ] Clean README (features, setup, decisions and why)
- [ ] Commit history is meaningful, one commit per finished piece
- [ ] Planning chat link ready to share
- [ ] Prepare a 2-minute pitch and your reasons for the build order
