/**
 * Prints the sha256 for a static flag, ready to paste into challenge.json.
 *   pnpm tsx scripts/hash-flag.ts 'RANGE{your_flag_here}'
 */
import { sha256Hex } from '../lib/server/crypto';

const flag = process.argv[2];
if (!flag) {
  console.error("usage: pnpm tsx scripts/hash-flag.ts '<flag>'");
  process.exit(1);
}
console.log(JSON.stringify({ type: 'static', sha256: sha256Hex(flag.trim()) }, null, 2));
