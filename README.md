# Campus Auction 🎓🔨

> A fair, transparent, and honest auction web application where seniors graduating and leaving campus pass down cycles, calculators, books, and electronics to juniors.

Built with the **MERN** stack (**M**ongoDB, **E**xpress, **R**eact, **N**ode.js) + **Socket.io** for real-time bid updates and anti-sniping timers.

---

## 🌟 Core Principles

1. **100% Mandatory Structured Condition Disclosure**:
   - Buyers are customers who need to know exactly what they are bidding on.
   - Structured condition grades: `New`, `Like new`, `Good`, `Fair`, `Poor`.
   - Disclosed age, working status, mandatory defect descriptions for Fair/Poor condition, and category-specific specs (e.g. cycle brakes & tyres, calculator display contrast & battery, book editions & page annotations).
   - Minimum 2 photos, defect close-up prompt, and a seller honesty declaration.
2. **Server-Authoritative Clock & Fair Play**:
   - No client clock cheating. Server clock controls auction close and bid validation.
   - Anti-sniping: Bids placed in the final 30 seconds extend closing by 60 seconds.
3. **Privacy by Design**:
   - Only the student's name is publicly visible. Private contact details (email, phone, roll number) are never exposed publicly and are securely unlocked only between the winning buyer and seller upon price approval.

---

## 📁 Architecture Overview

```text
Campus Auction/
├── PLAN.md                   # Complete system design & feature roadmap
├── README.md                 # Setup & execution instructions
├── .gitignore
├── server/                   # Express, Mongoose, JWT, Socket.io backend
│   ├── .env.example
│   ├── .env
│   ├── package.json
│   └── src/
│       ├── server.js         # Express + HTTP + Socket.io server entry point
│       ├── config/
│       │   ├── db.js         # MongoDB connection
│       │   └── socket.js     # Socket.io room management
│       ├── middleware/
│       │   ├── auth.js       # JWT Bearer protection & req.user extraction
│       │   └── errorHandler.js # Centralized API error handling
│       ├── models/
│       │   ├── User.js       # User model with bcrypt & public profile methods
│       │   ├── Listing.js    # Detailed listing model with structured condition
│       │   └── Bid.js        # Immutable auction bid ledger
│       ├── services/
│       │   └── authService.js # Business logic for registration & authentication
│       ├── controllers/
│       │   └── authController.js # Request parsing & HTTP response mapping
│       ├── routes/
│       │   └── authRoutes.js  # /api/auth/register, /login, /me
│       └── utils/
│           └── apiResponse.js # Standardized JSON response envelope
└── client/                   # React + Vite frontend
    ├── package.json
    ├── vite.config.js
    ├── tailwind.config.js
    ├── index.html
    └── src/
        ├── api/client.js     # Axios client with JWT interceptor
        ├── context/AuthContext.jsx # Global auth state
        ├── components/Navbar.jsx   # Top navigation with auth state
        ├── pages/
        │   ├── HomePage.jsx
        │   ├── LoginPage.jsx
        │   └── RegisterPage.jsx
        ├── App.jsx
        └── main.jsx
```

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: v18+ or v20+
- **MongoDB**: Local MongoDB Server running on default port `27017` (e.g. viewable with **MongoDB Compass** at `mongodb://localhost:27017`).

---

### Step 1: Start the Backend Server

```bash
cd server
npm install
npm run dev    # or npm start
```
The server will start at `http://localhost:5000` and automatically connect to `mongodb://127.0.0.1:27017/campus_auction`.

---

### Step 2: Start the Frontend Client

In a separate terminal:
```bash
cd client
npm install
npm run dev
```
The client will start at `http://localhost:5173`. Open your browser to explore the app.

---

### Step 3: View Database in MongoDB Compass
Open **MongoDB Compass** and connect to:
```text
mongodb://localhost:27017
```
Select the database `campus_auction` to inspect the collections:
- `users`: stores registered students with encrypted passwords and private contact fields.
- `listings`: auctions with structured condition data.
- `bids`: immutable bid audit ledger.

---

## 🔑 Auth API Endpoints

| Method | Endpoint | Description | Access |
|---|---|---|---|
| `GET` | `/api/health` | Backend & server clock health check | Public |
| `POST` | `/api/auth/register` | Register student account (name, email, password, phone) | Public |
| `POST` | `/api/auth/login` | Log in and receive JWT token | Public |
| `GET` | `/api/auth/me` | Fetch public-safe profile of current student | Private (Bearer JWT) |
