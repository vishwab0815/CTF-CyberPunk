import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || '';

if (!MONGODB_URI) {
  console.error('❌ MONGODB_URI not found in environment variables');
  console.error('💡 Make sure you have MONGODB_URI set in your .env.local file');
  process.exit(1);
}

async function resetDatabase() {
  try {
    console.log('🔗 Connecting to MongoDB...');
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    if (!db) {
      throw new Error('MongoDB connection database handle is unavailable');
    }

    console.log('\n🗑️  Dropping database...');
    await db.dropDatabase();
    console.log('✅ Database dropped');

    const collections = await db.listCollections().toArray();
    console.log(`📦 Remaining collections: ${collections.length}`);

    console.log('\n✅ Database reset completed successfully!');
  } catch (error) {
    console.error('❌ Database reset failed:', error);
    process.exit(1);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

resetDatabase();
