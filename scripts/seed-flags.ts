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
    level: '1.1',
    flag: 'flag{legacy_systems_tell_secrets}',
    description: 'View source / HTML comments to find hidden DNS records',
    category: 'Information Disclosure',
    difficulty: 'beginner' as const,
    points: 100,
    isActive: true,
  },
  {
    level: '1.2',
    flag: 'flag{trust_the_server_not_the_client}',
    description: 'Bypass client-side validation by sending direct API requests',
    category: 'Client-Side Security',
    difficulty: 'beginner' as const,
    points: 150,
    isActive: true,
  },
  {
    level: '1.3',
    flag: 'flag{javascript_security_is_an_illusion}',
    description: 'Bypass JavaScript security checks using browser tools',
    category: 'Client-Side Security',
    difficulty: 'beginner' as const,
    points: 150,
    isActive: true,
  },
  {
    level: '1.4',
    flag: 'flag{hidden_endpoints_reveal_truth}',
    description: 'Discover hidden API endpoints through reconnaissance',
    category: 'API Security',
    difficulty: 'intermediate' as const,
    points: 200,
    isActive: true,
  },

  // ========================================
  // CHAPTER 2: SERVER-SIDE VULNERABILITIES
  // ========================================
  {
    level: '2.1',
    flag: 'GHOST-ACCESS-GRANTED',
    description: 'Exploit IDOR vulnerability to access unauthorized profiles',
    category: 'IDOR',
    difficulty: 'intermediate' as const,
    points: 250,
    isActive: true,
  },
  {
    level: '2.2',
    flag: 'ADMIN-IDENTITY-FORGED',
    description: 'Forge JWT tokens to gain admin privileges',
    category: 'Authentication',
    difficulty: 'intermediate' as const,
    points: 250,
    isActive: true,
  },

  // ========================================
  // CHAPTER 3: ADVANCED CHALLENGES
  // ========================================
  {
    level: '3.1',
    flag: 'FLAG{INTERFACE_NOT_BROKEN_YOU_ARE}',
    description: 'Complete multi-phase interactive puzzle with server validation',
    category: 'Interactive Puzzle',
    difficulty: 'advanced' as const,
    points: 350,
    isActive: true,
  },
  {
    level: '3.2',
    flag: 'FLAG{NO_SQL_YES_INJECTION}',
    description: 'Exploit NoSQL injection to extract sensitive employee data',
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
  } catch (error: any) {
    console.error('\n❌ Error seeding flags:', error.message);
    console.error(error);
    process.exit(1);
  }
}

seedFlags();
