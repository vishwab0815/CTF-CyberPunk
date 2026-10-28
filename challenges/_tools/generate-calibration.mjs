// Regenerates the three calibration packs. Run: node challenges/_tools/generate-calibration.mjs
// Packs are neutral exercises that prove the platform lifecycle; real competition content is authored separately.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const write = (rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
const json = (o) => JSON.stringify(o, null, 2) + '\n';

// small deterministic PRNG so the generated files are stable between runs
let seed = 0x5eed1234;
const rnd = () => ((seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0) / 4294967296);
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));

// ---- 1. range-check: dynamic per-player flag in a templated text file ----------------
const noise = [];
for (let i = 0; i < 400; i++) {
  const lvl = ['INFO', 'INFO', 'INFO', 'DEBUG', 'WARN'][int(0, 4)];
  const svc = ['scheduler', 'telemetry', 'cache', 'gateway', 'indexer'][int(0, 4)];
  const day = String(int(1, 28)).padStart(2, '0');
  const hh = String(int(0, 23)).padStart(2, '0');
  const mm = String(int(0, 59)).padStart(2, '0');
  noise.push(`2026-03-${day}T${hh}:${mm}:00Z ${lvl} ${svc} tick=${int(1000, 99999)} ok`);
}
noise.splice(int(150, 300), 0, 'MAINTENANCE-TOKEN: {{FLAG}}');
write('range-check/files/range-notes.log', noise.join('\n') + '\n');
write(
  'range-check/challenge.json',
  json({
    id: 'range-check',
    title: 'Range Check',
    category: 'linux',
    difficulty: 'beginner',
    points: 50,
    mission: 'Calibration',
    tags: ['grep', 'warmup'],
    summary: 'Verify your toolchain and the submission pipeline on a noisy log file.',
    briefing:
      'Before the real operations begin, organisers want to confirm every operator can pull evidence, search it, and submit a result.\n\nThe attached maintenance log contains a single line that is not like the others. It carries your personal range token. Find it and submit it.\n\nThis operation is intentionally easy. It exists to prove your session, your downloads and your submissions work end to end.',
    objectives: ['Download range-notes.log', 'Locate the one non-routine line', 'Submit the token in full'],
    tools: ['grep', 'less', 'awk'],
    hints: [
      {
        title: 'Pattern hint',
        text: 'Routine lines all contain a service name and "tick=". The odd line does not follow that shape. Try grep -v with a pattern for routine lines.',
        cost: 10,
      },
    ],
    flag: { type: 'dynamic', tag: 'range_check' },
    artifacts: [{ file: 'range-notes.log', description: 'About 400 lines of routine service chatter plus one odd line.', template: true }],
  }),
);

// ---- 2. layered-encoding: static flag behind base64 > hex > rot13 ---------------------
const flag2 = 'RANGE{encoding_is_not_encryption_c41b}';
const rot13 = (s) => s.replace(/[a-z]/gi, (c) => String.fromCharCode(c.charCodeAt(0) + (c.toLowerCase() <= 'm' ? 13 : -13)));
const layer3 = Buffer.from(Buffer.from(rot13(flag2), 'utf8').toString('hex'), 'utf8').toString('base64');
write(
  'layered-encoding/files/transmission.txt',
  `-- relay 7 / outbound queue --\npayload-encoding: layered\nchecksum: ${sha(layer3).slice(0, 12)}\n\n${layer3.match(/.{1,60}/g).join('\n')}\n`,
);
write(
  'layered-encoding/challenge.json',
  json({
    id: 'layered-encoding',
    title: 'Layered Encoding',
    category: 'crypto',
    difficulty: 'beginner',
    points: 100,
    mission: 'Calibration',
    tags: ['encoding', 'cyberchef'],
    summary: 'A transmission was wrapped in several reversible encodings. Peel them back.',
    briefing:
      'An outbound relay queue holds a payload that someone wrapped in more than one reversible transform to make it look opaque.\n\nNone of these transforms use a key, so none of them is encryption. Identify each layer in turn, undo it, and recover the original text.\n\nThe inner message is a flag.',
    objectives: ['Identify the outermost encoding from its alphabet and padding', 'Undo each layer in order', 'Submit the recovered flag'],
    tools: ['CyberChef', 'base64', 'xxd', 'python3'],
    hints: [
      { title: 'Magic', text: 'The CyberChef "Magic" operation can suggest the first layer. Confirm each suggestion yourself instead of trusting it blindly.', cost: 15 },
      { title: 'Layer order', text: 'The text is Base64 on the outside. Inside that is a hex string. Inside that is a classical rotation cipher.', cost: 30 },
    ],
    requires: ['range-check'],
    flag: { type: 'static', sha256: sha(flag2) },
    artifacts: [{ file: 'transmission.txt', description: 'The queued payload.' }],
  }),
);

// ---- 3. ledger-audit: static flag from data analysis ----------------------------------
const vendors = ['Harbor Freight', 'Tidewater Parts', 'Northline Cargo', 'Brightwater Foods', 'Anchor Tools', 'Delta Packaging', 'Summit Fuel', 'Marlin Supply'];
const approvers = ['a.okafor', 'm.lindqvist', 'r.tanaka'];
const dupId = 'INV-48213';
const used = new Set([dupId]);
const newId = () => {
  let id;
  do id = `INV-${int(10000, 99999)}`;
  while (used.has(id));
  used.add(id);
  return id;
};
const rows = [];
for (let i = 0; i < 240; i++) {
  const day = String(int(1, 28)).padStart(2, '0');
  rows.push([newId(), `2026-02-${day}`, vendors[int(0, vendors.length - 1)], int(15000, 900000), approvers[int(0, 2)]].join(','));
}
rows.splice(70, 0, `${dupId},2026-02-09,Tidewater Parts,184250,r.tanaka`);
rows.splice(188, 0, `${dupId},2026-02-23,Tidewater Parts,1842500,r.tanaka`);
const flag3 = `RANGE{dup_inv_48213_delta_${1842500 - 184250}}`;
write('ledger-audit/files/ledger-feb.csv', ['invoice_id,date,vendor,amount_cents,approver', ...rows].join('\n') + '\n');
write(
  'ledger-audit/challenge.json',
  json({
    id: 'ledger-audit',
    title: 'Ledger Audit',
    category: 'forensics',
    difficulty: 'intermediate',
    points: 200,
    mission: 'Calibration',
    tags: ['data-analysis', 'csv'],
    summary: 'One invoice id appears twice with different amounts. Quantify the discrepancy.',
    briefing:
      'Finance exported a month of synthetic invoices and asked the security team to check for tampering.\n\nInvoice ids are meant to be unique. Exactly one id appears more than once, and the two rows disagree on the amount.\n\nReport the finding as RANGE{dup_<invoice id lowercased, with an underscore instead of the dash>_delta_<difference in cents between the two amounts>}.\n\nFor example, an id INV-00001 with amounts 100 and 250 would be written RANGE{dup_inv_00001_delta_150}.',
    objectives: ['Find the duplicated invoice id', 'Compute the absolute difference in cents', 'Format and submit the finding'],
    tools: ['csvkit', 'awk', 'sort/uniq', 'python3'],
    hints: [{ title: 'One-liner', text: 'cut -d, -f1 ledger-feb.csv | sort | uniq -d prints ids that occur more than once.', cost: 20 }],
    requires: ['layered-encoding'],
    flag: { type: 'static', sha256: sha(flag3) },
    artifacts: [{ file: 'ledger-feb.csv', description: '242 synthetic invoice rows.' }],
  }),
);

console.log('calibration packs written');
