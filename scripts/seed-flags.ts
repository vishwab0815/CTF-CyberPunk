/**
 * Seed script for Flag collection
 *
 * Run with: pnpm tsx scripts/seed-flags.ts
 *
 * This script populates the database with all level flags for centralized management
 */

import mongoose from 'mongoose';
import Flag from '../lib/models/Flag';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('💡 Make sure you have MONGODB_URI set in your .env.local file');
  process.exit(1);
}

const flagsData = [
  // ========================================
  // CHAPTER 1: CLIENT-SIDE VULNERABILITIES
  // ========================================
  {
    level: '1',
    flag: 'flag{legacy_systems_tell_secrets}',
    description: 'Chapter I: recover archived DNS fragments from legacy developer breadcrumbs',
    category: 'Information Disclosure',
    difficulty: 'beginner' as const,
    points: 100,
    isActive: true,
  },
  {
    level: '2',
    flag: 'flag{trust_the_server_not_the_client}',
    description: 'Chapter II: bypass client-side limits and prove server-side validation is required',
    category: 'Client-Side Security',
    difficulty: 'beginner' as const,
    points: 150,
    isActive: true,
  },
  {
    level: '3',
    flag: 'flag{javascript_security_is_an_illusion}',
    description: 'Chapter III: break front-end security theatre using runtime tampering',
    category: 'Client-Side Security',
    difficulty: 'beginner' as const,
    points: 150,
    isActive: true,
  },
  {
    level: '4',
    flag: 'flag{hidden_endpoints_reveal_truth}',
    description: 'Chapter IV: discover ghost endpoints left in the deployment surface',
    category: 'API Security',
    difficulty: 'intermediate' as const,
    points: 200,
    isActive: true,
  },

  // ========================================
  // CHAPTER 2: SERVER-SIDE VULNERABILITIES
  // ========================================
  {
    level: '5',
    flag: 'GHOST-ACCESS-GRANTED',
    description: 'Chapter V: abuse IDOR to impersonate the ghost admin pathway',
    category: 'IDOR',
    difficulty: 'intermediate' as const,
    points: 250,
    isActive: true,
  },

  // ========================================
  // CHAPTER 3: ADVANCED CHALLENGES
  // ========================================
  {
    level: '6',
    flag: 'FLAG{INTERFACE_NOT_BROKEN_YOU_ARE}',
    description: 'Chapter VI: survive the five-phase gauntlet and assemble the core key',
    category: 'Interactive Puzzle',
    difficulty: 'advanced' as const,
    points: 350,
    isActive: true,
  },
  {
    level: '7',
    flag: 'FLAG{NO_SQL_YES_INJECTION}',
    description: 'Chapter VII: exploit NoSQL query flaws to awaken the silent database',
    category: 'Injection',
    difficulty: 'advanced' as const,
    points: 400,
    isActive: true,
  },
];

async function seedFlags() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    console.log('\n🗑️  Clearing existing flags...');
    await Flag.deleteMany({});
    console.log('✅ Cleared existing flags');

    console.log('\n📝 Inserting flags...');
    const insertedFlags = await Flag.insertMany(flagsData);
    console.log(`✅ Inserted ${insertedFlags.length} flags`);

    console.log('\n📊 Flag Summary:');
    console.log('━'.repeat(80));

    for (const flag of insertedFlags) {
      console.log(
        `Level ${flag.level} | ${flag.category.padEnd(25)} | ${flag.difficulty.padEnd(12)} | ${flag.points} pts`
      );
    }

    console.log('━'.repeat(80));
    console.log(`\n✨ Total Points Available: ${insertedFlags.reduce((sum, f) => sum + f.points, 0)}`);

    console.log('\n🎉 Flag seeding completed successfully!');
    process.exit(0);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('\n❌ Error seeding flags:', message);
    console.error(error);
    process.exit(1);
  }
}

seedFlags();
