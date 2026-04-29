import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('MONGODB_URI environment variable is not defined. Exiting.');
  process.exit(1);
}

async function main() {
  try {
    // Short server selection timeout to fail fast if unreachable
    await mongoose.connect(MONGODB_URI as string, { serverSelectionTimeoutMS: 10000 });
    console.log('MongoDB keep-alive: connected');

    // Optionally run a light command to ensure activity
    if (mongoose.connection.db) {
      await mongoose.connection.db.admin().ping();
      console.log('MongoDB keep-alive: ping successful');
    } else {
      console.warn('MongoDB keep-alive: no db instance available to ping');
    }

    await mongoose.disconnect();
    console.log('MongoDB keep-alive: disconnected');
    process.exit(0);
  } catch (err: any) {
    console.error('MongoDB keep-alive error:', err?.message || err);
    try {
      await mongoose.disconnect();
    } catch {}
    process.exit(1);
  }
}

main();
