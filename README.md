# 🎯 NebulaCorp CTF Challenge

A full-stack Capture The Flag (CTF) web application with 7 progressive security challenges, built with Next.js 16, MongoDB, and NextAuth.

## 🚀 Quick Start

### Prerequisites
- Node.js 18+
- MongoDB (local or Atlas)
- pnpm (recommended) or npm

### Installation

```bash
# Install dependencies
pnpm install

# Set up environment variables
cp .env.example .env.local
# Edit .env.local with your MongoDB URI and secrets

# Seed the database (REQUIRED before first use)
pnpm seed:all

# Run development server
pnpm dev
```

Visit http://localhost:3000

## 📦 Database Setup

**IMPORTANT:** Before users can play, you must seed the database:

```bash
# Seed everything (recommended)
pnpm seed:all

# Or seed individually
pnpm seed:flags      # Add all 7 level flags
pnpm seed:employees  # Add employee data for Level 7
```

## 🎮 Game Structure

### Act 1: Client-Side Vulnerabilities (4 Levels)
- **Level 1** - DNS Discovery (View Source, HTML Comments)
- **Level 2** - Client Validation Bypass (MaxLength)
- **Level 3** - JavaScript Guard Bypass (Console Manipulation)
- **Level 4** - Hidden Endpoint Discovery (API Reconnaissance)

### Act 2: Server-Side Exploitation (1 Level)
- **Level 5** - IDOR Vulnerability (User Enumeration → ID 7777)

### Act 3: Advanced Challenges (2 Levels) ⚠️ EXTREME DIFFICULTY
- **Level 6** - The Gauntlet (5-Phase Interactive Puzzle: Rapid Click, Extended Konami, Critical Error Triage, Cipher Decode, Final Authentication)
- **Level 7** - NoSQL Injection (MongoDB Query Exploitation)

**Total Points:** 1,600
**Total Levels:** 7

## 🔑 Key Features

### Authentication System
- ✅ Secure signup/signin with bcrypt
- ✅ Session management with NextAuth
- ✅ Change password functionality
- ✅ JWT-based session tokens
- ✅ Protected routes and middleware

### Timer System
- ✅ Auto-starts when user begins
- ✅ Persists across page reloads
- ✅ Stored in MongoDB
- ✅ Real-time countdown display

### Admin Dashboard
- ✅ Real-time leaderboard
- ✅ Level monitoring and statistics
- ✅ Submission tracking
- ✅ Auto-refresh (5s intervals)
- ✅ Filter by all 7 levels

### Progressive Hint System
- ✅ Hints appear after multiple attempts
- ✅ No spoilers on first tries
- ✅ Guides users without giving away answers

## 📁 Project Structure

```
ctf-game/
├── app/
│   ├── api/              # API routes (levels, auth, admin)
│   ├── auth/             # Authentication pages
│   ├── levels/           # 7 level pages (1-7)
│   ├── admin/            # Admin dashboard
│   └── completion/       # Success pages
├── components/           # Reusable UI components
├── lib/
│   ├── models/          # MongoDB schemas
│   └── auth.ts          # NextAuth configuration
├── scripts/             # Database seed scripts
└── proxy.ts             # Middleware (route protection)
```

## 🔧 Environment Variables

Create `.env.local` with:

```env
# MongoDB
MONGODB_URI=mongodb://localhost:27017/ctf-game
# or MongoDB Atlas: mongodb+srv://user:pass@cluster.mongodb.net/ctf-game

# NextAuth
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-super-secret-key-here-min-32-chars

# Optional: Node Environment
NODE_ENV=development
```

## 🎯 Level Solutions Reference

See [SOLUTIONS.md](SOLUTIONS.md) for complete walkthrough and hints.

## 🛠️ Development Commands

```bash
# Development
pnpm dev              # Start dev server on port 3000

# Production
pnpm build            # Build for production
pnpm start            # Start production server

# Database
pnpm seed:all         # Seed all collections
pnpm seed:flags       # Seed flags only
pnpm seed:employees   # Seed employees only

# Code Quality
pnpm lint             # Run ESLint
```

## 🐛 Troubleshooting

### Issue: "Loading..." stuck on level pages
**Solution:** This has been fixed. If you still see it, clear browser cache and refresh.

### Issue: Level 7 returns "No employee found"
**Solution:** Run `pnpm seed:employees` to populate the database.

### Issue: Timer doesn't persist
**Solution:** Verify MongoDB connection and check that timer API routes are working.

### Issue: Admin dashboard shows 0/0
**Solution:** Users need to complete levels first. Admin accounts cannot play levels.

## 🔐 Security Notes

This is an **intentionally vulnerable** application for educational purposes:

- ✅ Real vulnerabilities: IDOR, Client-Side Bypass, NoSQL Injection
- ✅ Safe environment: Sandboxed, no real user data
- ⚠️ **DO NOT** deploy on public internet without security hardening
- ⚠️ **FOR EDUCATIONAL USE ONLY**

## 📊 Testing

## 🧰 MongoDB Keep-Alive (GitHub Actions)

If you are using a free-tier MongoDB provider that may pause inactive clusters (for example MongoDB Atlas free tier), you can add a simple keep-alive workflow that periodically connects to the database to prevent idle shutdowns.

1. Add the repository secret `MONGODB_URI` (your connection string) in GitHub Settings → Secrets.
2. The project includes a workflow at `.github/workflows/mongodb-keepalive.yml` that runs `scripts/db-keepalive.ts` on a schedule and pings the DB.

Notes:
- This is a workaround for development/demo purposes only — for production, prefer a paid always-on cluster.
- The workflow uses `pnpm` and `tsx` to run the script; ensure your lockfile is committed.


### Create Test Accounts

**Regular User:**
1. Visit `/auth/signup`
2. Create account
3. Complete levels 1 through 7

**Admin User:**
Create admin manually in MongoDB:
```javascript
db.users.updateOne(
  { email: "admin@example.com" },
  { $set: { isAdmin: true } }
)
```

## 🎨 Tech Stack

- **Framework:** Next.js 16 (App Router, Turbopack)
- **Database:** MongoDB with Mongoose
- **Authentication:** NextAuth v4
- **Styling:** Tailwind CSS v4
- **Animations:** Framer Motion
- **Forms:** React Hook Form + Zod
- **Icons:** Lucide React

## 📝 License

MIT License - Free for educational use

## 🤝 Contributing

This is a complete, production-ready CTF platform. Fork and customize for your own events!

---

**Ready to hack?** Start with `pnpm install && pnpm seed:all && pnpm dev` 🚀
