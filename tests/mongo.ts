import { MongoMemoryServer } from 'mongodb-memory-server';

// The sandboxed binary is slow to start; give it room.
process.env.MONGOMS_STARTUP_TIMEOUT ||= '60000';

declare global {
  var __testMongoSrv: Promise<MongoMemoryServer> | undefined;
}

/** Boots one in-memory MongoDB for the whole test run and returns its URI. */
export async function testMongoUri(): Promise<string> {
  globalThis.__testMongoSrv ??= MongoMemoryServer.create();
  return (await globalThis.__testMongoSrv).getUri();
}
