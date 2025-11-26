# Database Setup Guide

This guide explains how to set up and seed the MongoDB database for the CTF game.

## Prerequisites

1. MongoDB instance running (local or Atlas)
2. `MONGODB_URI` configured in `.env.local`
3. Node.js and pnpm installed

## Database Collections

The CTF game uses the following MongoDB collections:

### 1. **users**
Stores user accounts and progress
- Fields: teamName, email, password, isAdmin, currentLevel, completedLevels, totalTime

### 2. **flags**
Stores all level flags for centralized management
- Fields: level, flag, description, category, difficulty, points, isActive
- Created by: `scripts/seed-flags.ts`

### 3. **employees**
Employee data for Level 3.2 (NoSQL Injection challenge)
- Fields: employeeId, name, department, clearanceLevel, email, role, status, secretData
- Created by: `scripts/seed-employees.ts`

### 4. **submissions**
Tracks all flag submission attempts
- Fields: userId, teamName, level, flag, isCorrect, attemptNumber, timeTaken, metadata

### 5. **levelprogresses**
Tracks individual level progress
- Fields: userId, level, status, startTime, completionTime, timeTaken, attempts, hintsUsed

### 6. **level3_1_progresses**
Tracks multi-phase progress for Level 3.1
- Fields: userId, completedPhases, currentPhase, attempts, fragments, rateLimiting

## Seeding the Database

### Method 1: Seed All Data (Recommended)

Run this command to seed all required data:

```bash
pnpm seed:all
```

This will:
1. Seed all 8 level flags
2. Seed 10 employee records for Level 3.2

### Method 2: Seed Individual Collections

Seed flags only:
```bash
pnpm seed:flags
```

Seed employees only:
```bash
pnpm seed:employees
```

### Manual Seeding (Alternative)

If you prefer to run scripts directly:

```bash
# Seed flags
pnpm tsx scripts/seed-flags.ts

# Seed employees
pnpm tsx scripts/seed-employees.ts
```

## Seed Script Details

### Flag Seeding (`scripts/seed-flags.ts`)

Populates 8 flags with the following structure:

| Level | Flag | Category | Difficulty | Points |
|-------|------|----------|------------|--------|
| 1.1 | flag{legacy_systems_tell_secrets} | Information Disclosure | Beginner | 100 |
| 1.2 | flag{trust_the_server_not_the_client} | Client-Side Security | Beginner | 150 |
| 1.3 | flag{javascript_security_is_an_illusion} | Client-Side Security | Beginner | 150 |
| 1.4 | flag{hidden_endpoints_reveal_truth} | API Security | Intermediate | 200 |
| 2.1 | GHOST-ACCESS-GRANTED | IDOR | Intermediate | 250 |
| 2.2 | ADMIN-IDENTITY-FORGED | Authentication | Intermediate | 250 |
| 3.1 | FLAG{INTERFACE_NOT_BROKEN_YOU_ARE} | Interactive Puzzle | Advanced | 350 |
| 3.2 | FLAG{NO_SQL_YES_INJECTION} | Injection | Advanced | 400 |

**Total Points: 1850**

### Employee Seeding (`scripts/seed-employees.ts`)

Populates 10 employee records:
- 9 decoy employees (clearance levels 1-4)
- 1 admin employee with clearance 5 containing the flag

**Target Employee:**
- Name: Ghost Administrator
- Department: Security
- Clearance Level: 5
- Secret Data: FLAG{NO_SQL_YES_INJECTION}

## Verification

After seeding, verify the data:

### Check Flags Collection
```javascript
// In MongoDB shell or Compass
db.flags.countDocuments() // Should return 8
db.flags.find().pretty()
```

### Check Employees Collection
```javascript
db.employees.countDocuments() // Should return 10
db.employees.findOne({ clearanceLevel: 5 }) // Should return Ghost Administrator
```

## Clearing Data

To reset and re-seed the database:

### Clear All Game Data (Users, Submissions, Progress)
```javascript
// WARNING: This deletes ALL user data!
db.users.deleteMany({})
db.submissions.deleteMany({})
db.levelprogresses.deleteMany({})
db.level3_1_progresses.deleteMany({})
```

### Clear and Re-seed Flags
```bash
pnpm seed:flags
```
This automatically clears existing flags before seeding.

### Clear and Re-seed Employees
```bash
pnpm seed:employees
```
This automatically clears existing employees before seeding.

## Database Migration Notes

### From Hardcoded to Database Flags

Previously, flags were hardcoded in `app/api/submit-flag/route.ts`. Now they're stored in MongoDB:

**Benefits:**
- ✅ Centralized flag management
- ✅ Easy flag rotation without code changes
- ✅ Ability to deactivate/activate flags
- ✅ Points and difficulty tracking
- ✅ Better analytics and reporting

**What Changed:**
1. Created `lib/models/Flag.ts` model
2. Created `scripts/seed-flags.ts` seed script
3. Updated `app/api/submit-flag/route.ts` to fetch flags from database
4. Removed hardcoded `CORRECT_FLAGS` constant

## Environment Variables

Required in `.env.local`:

```bash
MONGODB_URI=mongodb://localhost:27017/ctf-game
# OR for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/ctf-game

NEXTAUTH_SECRET=your-secret-key-here
NEXTAUTH_URL=http://localhost:3000
```

## Troubleshooting

### Error: "MONGODB_URI not found"
- Ensure `.env.local` exists in project root
- Verify `MONGODB_URI` is set correctly
- Restart the development server

### Error: "Duplicate key error"
- The database already contains data
- Run the seed script again (it clears existing data first)
- Or manually clear the collection in MongoDB

### Warning: "Duplicate schema index"
- This warning has been fixed in `lib/models/Employee.ts`
- Update your code to the latest version

### Seed script hangs
- Check MongoDB connection
- Verify network access if using MongoDB Atlas
- Check firewall settings

## Production Deployment

For production environments:

1. **Secure MongoDB Instance**
   - Use MongoDB Atlas or secured MongoDB instance
   - Enable authentication and encryption
   - Whitelist only your server IPs

2. **Seed Production Database**
   ```bash
   # On production server or via CI/CD
   NODE_ENV=production pnpm seed:all
   ```

3. **Backup Strategy**
   - Regular automated backups of user progress
   - Don't backup flags/employees (can be re-seeded)

4. **Flag Rotation**
   - Update flags in database via admin panel or script
   - No code deployment needed

## Admin Operations

### Update a Flag
```javascript
db.flags.updateOne(
  { level: '1.1' },
  { $set: { flag: 'flag{new_flag_value}' } }
)
```

### Deactivate a Level
```javascript
db.flags.updateOne(
  { level: '1.1' },
  { $set: { isActive: false } }
)
```

### Change Points Value
```javascript
db.flags.updateOne(
  { level: '3.2' },
  { $set: { points: 500 } }
)
```

## Schema Indexes

The following indexes are automatically created for optimal performance:

**Flags Collection:**
- `{ level: 1, isActive: 1 }` - Fast flag lookup
- `{ category: 1 }` - Category filtering

**Employees Collection:**
- `{ employeeId: 1 }` (unique) - Fast employee lookup
- `{ name: 1 }` - Name search
- `{ department: 1 }` - Department filtering
- `{ clearanceLevel: 1 }` - Clearance filtering

**Submissions Collection:**
- `{ userId: 1, level: 1 }` - User submissions
- `{ level: 1, isCorrect: 1 }` - Level statistics
- `{ createdAt: -1 }` - Recent submissions
- `{ teamName: 1 }` - Team leaderboard

## Support

For issues or questions:
- Check logs in MongoDB for connection errors
- Verify seed script output for any warnings
- Review `lib/mongodb.ts` for connection configuration
