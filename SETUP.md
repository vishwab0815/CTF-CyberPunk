# CTF Game - Setup & Implementation Guide

## 🎯 Overview

Your CTF game has been significantly enhanced with:
- ✅ MongoDB integration with User, Submission, and LevelProgress models
- ✅ NextAuth.js authentication with sign-in/sign-up pages
- ✅ Server-based timer that persists across page reloads
- ✅ Admin dashboard with real-time leaderboard and level monitoring
- ✅ Universal flag submission API with database tracking
- ✅ Protected routes via middleware
- ✅ Difficulty improvements (hints removed from Levels 1.1 and 1.2)

## 📋 What's Been Completed

### 1. Database Setup
- **Models Created:**
  - `User` - stores user accounts, team names, progress, and timer data
  - `Submission` - tracks all flag submission attempts
  - `LevelProgress` - individual progress tracking for each level

### 2. Authentication System
- Sign-in page at `/auth/signin`
- Sign-up page at `/auth/signup` (includes team name)
- Session management with NextAuth.js
- Middleware protection for level routes

### 3. Admin Dashboard
- **Access:** `admin@gmail.com` / `admin1234`
- **Features:**
  - Real-time leaderboard (auto-refreshes every 5 seconds)
  - Level monitoring with submission tracking
  - Statistics per level (attempts, success rate, unique users)
  - Filter submissions by level

### 4. Timer System
- Server-based timer API at `/api/timer`
- Timer component displayed on all pages
- Persists across page reloads
- Shows team name and elapsed time

### 5. Level Improvements
- **Level 1.1:**
  - ✅ Removed all hints from API responses
  - ✅ Made HTML comment more subtle
  - ✅ Integrated submission API
  - ✅ Updated mission briefing to be less explicit

- **Level 1.2:**
  - ✅ Removed copy button
  - ✅ Removed explicit instructions about DevTools
  - ✅ Made HTML comment more subtle
  - ✅ Integrated submission API

- **Levels 1.3, 2.1, 2.2:** Need similar updates (instructions below)

## 🚀 Setup Instructions

### Step 1: Install Dependencies
Dependencies are already installed. If needed:
```bash
pnpm install
```

### Step 2: Set Up MongoDB

1. **Get MongoDB Connection String:**
   - Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
   - Create a free cluster (if you don't have one)
   - Click "Connect" → "Connect your application"
   - Copy the connection string

2. **Create `.env.local` file:**
```bash
cp .env.local.example .env.local
```

3. **Edit `.env.local` and add your MongoDB URI:**
```env
# MongoDB Connection
MONGODB_URI=mongodb+srv://YOUR_USERNAME:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/ctf-game?retryWrites=true&w=majority

# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-secret-key-here-generate-with-openssl-rand-base64-32

# Admin Credentials
ADMIN_EMAIL=admin@gmail.com
ADMIN_PASSWORD=admin1234
```

4. **Generate NEXTAUTH_SECRET:**
```bash
# On Linux/Mac:
openssl rand -base64 32

# On Windows (PowerShell):
[Convert]::ToBase64String([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

### Step 3: Run the Application
```bash
pnpm dev
```

The app will be available at `http://localhost:3000`

## 🔐 Admin Access

1. Navigate to `/auth/signup`
2. Register with:
   - Email: `admin@gmail.com`
   - Password: `admin1234`
   - Team Name: Any name you want
3. The system will automatically grant admin privileges
4. Access the admin dashboard at `/admin`

## 📝 Remaining Tasks

### Level Updates Needed

#### **Level 1.3** (JavaScript Bypass)
**Current Issues:**
- Line 10: Comment says "players must delete this in DevTools"
- Line 70: Explicit tip about opening DevTools → Sources
- Line 194: Tells users exactly what to do

**Changes Needed:**
1. Remove the explicit DevTools instructions
2. Make hints more subtle
3. Integrate submission API (currently auto-redirects)
4. Update API route to use submission tracking

#### **Level 2.1** (IDOR Vulnerability)
**Current Issues:**
- Only 2 profiles exist (ID 1 and 1001)
- Admin ID is obvious (ID 1)
- No red herrings

**Changes Needed:**
1. Add more profile IDs (decoys) between 1-1001
2. Make admin ID less obvious (e.g., 1337, 7777, or random)
3. Add misleading profiles
4. Remove obvious hints from mission brief
5. Integrate submission API

#### **Level 2.2** (Token Forgery)
**Current Issues:**
- Mentions "base64" explicitly
- Shows JWT structure
- Too obvious about role manipulation

**Changes Needed:**
1. Remove "base64" mentions
2. Make token structure less obvious
3. Add complexity (maybe obfuscated JSON)
4. Integrate submission API
5. Navigation goes to non-existent 2.3

### Pages to Create

#### **Level 2 Completion Page**
Create: `app/completion/level-2-completed/page.tsx`
Similar to Level 1 completion, but:
- Congratulate on completing all levels
- Show final time
- Link to leaderboard
- "Play Again" button

#### **Level Selection Page**
Create: `app/levels/page.tsx`
Features:
- Grid of all 5 levels
- Show completion status (✓ or locked)
- Display best time for completed levels
- Progress bar
- Link to admin dashboard (if admin)

#### **Landing Page Update**
Update: `app/page.tsx`
- Make "Start Hacking" button functional → `/levels` or `/levels/1.1`
- Add "View Leaderboard" button (if authenticated)
- Add "Admin Dashboard" link (if admin user)
- Add logout button (if authenticated)

## 🎨 UI Consistency Checklist

All levels should use:
- ✅ AuroraBackground component (Levels 2.1, 2.2 already use it)
- ✅ Shared Terminal component
- ✅ Consistent color scheme (cyan, green, purple gradients)
- ✅ Timer component visible on all pages
- ✅ Similar animation patterns

**Levels 1.1, 1.2, 1.3** still use custom background implementations. Consider updating to use `AuroraBackground`.

## 🔧 File Structure Reference

```
ctf-game/
├── app/
│   ├── api/
│   │   ├── auth/
│   │   │   ├── [...nextauth]/route.ts  ✅
│   │   │   └── register/route.ts       ✅
│   │   ├── admin/
│   │   │   ├── leaderboard/route.ts    ✅
│   │   │   └── submissions/route.ts    ✅
│   │   ├── timer/route.ts              ✅
│   │   ├── submit-flag/route.ts        ✅
│   │   └── levels/
│   │       ├── 1.1/route.ts            ✅ (hints removed)
│   │       ├── 1.2/route.ts            ✅
│   │       ├── 1.3/route.ts            ⚠️ (needs update)
│   │       ├── 2.1/route.ts            ⚠️ (needs update)
│   │       └── 2.2/route.ts            ⚠️ (needs update)
│   ├── admin/page.tsx                  ✅
│   ├── auth/
│   │   ├── signin/page.tsx             ✅
│   │   └── signup/page.tsx             ✅
│   ├── levels/
│   │   ├── page.tsx                    ❌ (needs creation)
│   │   ├── 1.1/page.tsx                ✅ (updated)
│   │   ├── 1.2/page.tsx                ✅ (updated)
│   │   ├── 1.3/page.tsx                ⚠️ (needs update)
│   │   ├── 2.1/page.tsx                ⚠️ (needs update)
│   │   └── 2.2/page.tsx                ⚠️ (needs update)
│   ├── completion/
│   │   ├── level-1-completed/page.tsx  ✅
│   │   └── level-2-completed/page.tsx  ❌ (needs creation)
│   ├── layout.tsx                      ✅ (SessionProvider added)
│   └── page.tsx                        ⚠️ (needs button updates)
├── components/
│   ├── SessionProvider.tsx             ✅
│   ├── Timer.tsx                       ✅
│   ├── Terminal.tsx                    ✅ (unused in 1.1-1.3)
│   └── visuals/
│       └── AuroraBackground.tsx        ✅ (unused in 1.1-1.3)
├── lib/
│   ├── mongodb.ts                      ✅
│   ├── auth.ts                         ✅
│   └── models/
│       ├── User.ts                     ✅
│       ├── Submission.ts               ✅
│       ├── LevelProgress.ts            ✅
│       └── index.ts                    ✅
├── types/
│   └── next-auth.d.ts                  ✅
├── middleware.ts                       ✅
├── .env.local.example                  ✅
└── .env.local                          ⚠️ (you need to create)
```

## 🐛 Known Issues to Fix

1. **Navigation Issues:**
   - Level 1.3 → tries to go to 1.4 (should go to 2.1) ✅ Fixed in completion page
   - Level 2.2 → tries to go to 2.3 (should go to completion page)

2. **Level 1 Completion Page:**
   - Button tries to navigate to `/levels/1.4`
   - Should navigate to `/levels/2.1`

## 📊 Testing Checklist

- [ ] Sign up with a test account
- [ ] Timer starts automatically
- [ ] Complete Level 1.1 (all 3 fragments + flag submission)
- [ ] Complete Level 1.2 (bypass maxlength)
- [ ] Complete Level 1.3 (bypass JS guard)
- [ ] Complete Level 2.1 (find admin profile)
- [ ] Complete Level 2.2 (forge admin token)
- [ ] Check admin dashboard
- [ ] Verify leaderboard updates
- [ ] Test timer persistence (reload page, check time continues)
- [ ] Sign up as admin@gmail.com and verify admin access

## 🎯 Difficulty Progression

### Current State:
- **Level 1.1:** ✅ Subtle (no hints, requires view-source knowledge)
- **Level 1.2:** ✅ Moderate (no explicit instructions, requires DevTools knowledge)
- **Level 1.3:** ⚠️ Too Easy (explicit instructions still present)
- **Level 2.1:** ⚠️ Too Easy (only 2 IDs, admin=1 is obvious)
- **Level 2.2:** ⚠️ Too Easy (mentions base64, shows structure)

### Goal:
Progressive difficulty from beginner to intermediate-advanced.

## 💡 Tips for Continued Development

1. **Adding More Levels:**
   - Create new level pages in `app/levels/`
   - Add API routes in `app/api/levels/`
   - Update `CORRECT_FLAGS` and `NEXT_LEVELS` in `/api/submit-flag/route.ts`
   - Update enum in Submission model

2. **Customizing Flags:**
   - Edit `CORRECT_FLAGS` in `/api/submit-flag/route.ts`
   - Update level API responses accordingly

3. **Theming:**
   - Colors defined in `app/styles/cyber-global.css`
   - Global styles in `app/globals.css`
   - Tailwind config uses HSL color system

## 📚 Additional Resources

- [Next.js Documentation](https://nextjs.org/docs)
- [NextAuth.js Documentation](https://next-auth.js.org)
- [MongoDB Atlas Documentation](https://docs.atlas.mongodb.com)
- [Framer Motion Documentation](https://www.framer.com/motion/)

---

**Need Help?** Review the existing code in Levels 1.1 and 1.2 as templates for updating the remaining levels.
