/**
 * Seed script for Level 6 - The Broken Interface
 *
 * Run with: pnpm tsx scripts/seed-level-3-1.ts
 * Or: node --import tsx scripts/seed-level-3-1.ts
 *
 * This script populates the database with canonical phase data:
 * - Phase 1: Multi-click sequence
 * - Phase 2: Arrow key sequence (Konami Code variant)
 * - Phase 3: Red error selection
 */

import mongoose from 'mongoose';
import { createHash } from 'node:crypto';
import Level3_1_Step from '../lib/models/Level3_1_Steps';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('💡 Make sure you have MONGODB_URI set in your .env.local file');
  process.exit(1);
}

const seedData = [
  {
    phase: 1,
    canonicalKey: 'RAPID-ACCESS-OVERRIDE',
    acceptedAliases: ['rapid-access-override', 'RAPID_ACCESS_OVERRIDE', 'rapidaccessoverride'],
    fragment: 'INTER',
    hintText: 'Rapid clicking required - speed is critical',
  },
  {
    phase: 2,
    canonicalKey: 'EXTENDED-KONAMI-CIPHER',
    acceptedAliases: ['extended-konami-cipher', 'EXTENDED_KONAMI_CIPHER', 'extendedkonamicipher'],
    fragment: 'FACE_',
    hintText: 'Extended arrow sequence - more complex than before',
  },
  {
    phase: 3,
    canonicalKey: 'CRITICAL-ERROR-TRIAGE',
    acceptedAliases: ['critical-error-triage', 'CRITICAL_ERROR_TRIAGE', 'criticalerrortriage'],
    fragment: 'NOT_BR',
    hintText: 'Identify and select ALL critical errors in exact order',
  },
  {
    phase: 4,
    canonicalKey: 'CIPHER-MATRIX-DECODE',
    acceptedAliases: ['cipher-matrix-decode', 'CIPHER_MATRIX_DECODE', 'ciphermatrixdecode'],
    fragment: 'OKEN_Y',
    hintText: 'Decode the cipher: ROT13 or Caesar shift may help',
  },
  {
    phase: 5,
    canonicalKey: 'FINAL-AUTHENTICATION',
    acceptedAliases: ['final-authentication', 'FINAL_AUTHENTICATION', 'finalauthentication'],
    fragment: 'OU_ARE',
    hintText: 'Combine all knowledge gained from previous phases',
  },
];

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing Level 6 data
    console.log('🗑️  Clearing existing Level 6 steps...');
    await Level3_1_Step.deleteMany({});
    console.log('✅ Cleared existing data');

    // Insert seed data
    console.log('📝 Inserting seed data...');
    await Level3_1_Step.insertMany(seedData);
    console.log('✅ Seed data inserted successfully');

    // Verify data
    const count = await Level3_1_Step.countDocuments();
    console.log(`\n📊 Total steps in database: ${count}`);

    // Display inserted data
    const steps = await Level3_1_Step.find().sort({ phase: 1 });
    console.log('\n📋 Inserted Steps:');
    steps.forEach((step) => {
      console.log(`\n  Phase ${step.phase}:`);
      console.log(`    Canonical Key: ${step.canonicalKey}`);
      console.log(`    Fragment: ${step.fragment}`);
      console.log(`    Hint: ${step.hintText}`);
    });

    // Calculate final flag
    const fragments = steps.map((s) => s.fragment).join('');
    console.log(`\n🏁 Final Fragment Concatenation: ${fragments}`);

    // Compute SHA1 hash (for verification)
    const finalHash = createHash('sha1').update(fragments).digest('hex');
    console.log(`🔐 SHA1 Hash: ${finalHash}`);
    console.log(`🚩 Final Flag: FLAG{INTERFACE_NOT_BROKEN_YOU_ARE}`);

    console.log('\n✅ Seeding completed successfully!');
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

seed();
