/**
 * Seed script for Level 3.1 - The Broken Interface
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
    canonicalKey: 'ACCESS-SEQUENCE',
    acceptedAliases: ['access-sequence', 'ACCESS_SEQUENCE', 'accesssequence'],
    fragment: 'INTERFACE_',
    hintText: 'Click "Access" 5 times within 3 seconds',
  },
  {
    phase: 2,
    canonicalKey: 'KONAMI-VARIANT',
    acceptedAliases: ['konami-variant', 'KONAMI_VARIANT', 'konamivariant'],
    fragment: 'NOT_BROKEN_',
    hintText: 'Arrow key sequence: ↑↑↓↓←→←→',
  },
  {
    phase: 3,
    canonicalKey: 'ERROR-FILTER',
    acceptedAliases: ['error-filter', 'ERROR_FILTER', 'errorfilter'],
    fragment: 'YOU_ARE',
    hintText: 'Select only the red error lines in order',
  },
];

async function seed() {
  try {
    console.log('🔄 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Clear existing Level 3.1 data
    console.log('🗑️  Clearing existing Level 3.1 steps...');
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
    const crypto = require('crypto');
    const finalHash = crypto.createHash('sha1').update(fragments).digest('hex');
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
