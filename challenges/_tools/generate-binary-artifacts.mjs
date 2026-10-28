// Generates the "Field Operations" challenge packs — real binary evidence that REQUIRES Kali tools.
// Run: node challenges/_tools/generate-binary-artifacts.mjs
//
// No Docker or live targets. Players download these files and analyse them locally:
//   wire-trap      capture.pcap   -> Wireshark (Follow TCP Stream)
//   binary-ghost   beacon          -> file / strings / objdump / Ghidra / GDB
//   hash-heist     hashes.txt      -> hashcat / John the Ripper
//   buried-signal  evidence.png    -> binwalk / foremost / unzip / exiftool
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sha = (s) => crypto.createHash('sha256').update(s).digest('hex');
const md5 = (s) => crypto.createHash('md5').update(s).digest('hex');
const write = (rel, content) => {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, content);
};
const json = (o) => JSON.stringify(o, null, 2) + '\n';

// ---- CRC-32 (PNG chunks + ZIP) ----
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function adler32(buf) {
  let a = 1, b = 0;
  for (let i = 0; i < buf.length; i++) { a = (a + buf[i]) % 65521; b = (b + a) % 65521; }
  return ((b << 16) | a) >>> 0;
}
// 16-bit one's-complement checksum (IP / TCP)
function inetChecksum(buf) {
  let sum = 0;
  for (let i = 0; i < buf.length; i += 2) {
    sum += (buf[i] << 8) + (i + 1 < buf.length ? buf[i + 1] : 0);
  }
  while (sum >> 16) sum = (sum & 0xffff) + (sum >> 16);
  return (~sum) & 0xffff;
}

const FLAGS = {
  wireTrap:     'RANGE{http_stream_reassembled_b4d1}',
  binaryGhost:  'RANGE{elf_xor_decrypt_0x5a_done}',
  hashHeist:    'RANGE{cracked_nebula_admin_nightshade77}',
  buriedSignal: 'RANGE{zip_appended_after_iend_7c0a}',
};

// ==================== wire-trap: real PCAP (Wireshark) ====================
{
  const flag = FLAGS.wireTrap;
  const b64body = Buffer.from(flag).toString('base64'); // split across two TCP segments

  const packets = []; // { tsSec, tsUsec, data(Buffer) }
  let tsSec = 1760518800, tsUsec = 0;
  const bump = (ms) => { tsUsec += ms * 1000; while (tsUsec >= 1_000_000) { tsUsec -= 1_000_000; tsSec++; } };

  const CLIENT_MAC = Buffer.from([0xaa, 0xbb, 0xcc, 0x00, 0x00, 0x01]);
  const SERVER_MAC = Buffer.from([0xaa, 0xbb, 0xcc, 0x00, 0x00, 0x02]);
  const ipToBytes = (ip) => Buffer.from(ip.split('.').map(Number));
  const CLIENT_IP = ipToBytes('192.168.1.201');
  const SERVER_IP = ipToBytes('203.0.113.42');

  let ipId = 0x1000;
  function ethIpTcp(fromClient, srcPort, dstPort, seq, ack, flags, payload = Buffer.alloc(0)) {
    const srcMac = fromClient ? CLIENT_MAC : SERVER_MAC;
    const dstMac = fromClient ? SERVER_MAC : CLIENT_MAC;
    const srcIp = fromClient ? CLIENT_IP : SERVER_IP;
    const dstIp = fromClient ? SERVER_IP : CLIENT_IP;

    // TCP header (20 bytes)
    const tcp = Buffer.alloc(20 + payload.length);
    tcp.writeUInt16BE(srcPort, 0);
    tcp.writeUInt16BE(dstPort, 2);
    tcp.writeUInt32BE(seq >>> 0, 4);
    tcp.writeUInt32BE(ack >>> 0, 8);
    tcp.writeUInt8(0x50, 12);          // data offset = 5 words (20 bytes)
    tcp.writeUInt8(flags, 13);
    tcp.writeUInt16BE(0xffff, 14);     // window
    tcp.writeUInt16BE(0, 16);          // checksum (fill below)
    tcp.writeUInt16BE(0, 18);          // urgent
    payload.copy(tcp, 20);

    // TCP pseudo-header for checksum
    const pseudo = Buffer.alloc(12 + tcp.length);
    srcIp.copy(pseudo, 0);
    dstIp.copy(pseudo, 4);
    pseudo.writeUInt8(0, 8);
    pseudo.writeUInt8(6, 9);           // protocol TCP
    pseudo.writeUInt16BE(tcp.length, 10);
    tcp.copy(pseudo, 12);
    tcp.writeUInt16BE(inetChecksum(pseudo), 16);

    // IPv4 header (20 bytes)
    const ip = Buffer.alloc(20);
    ip.writeUInt8(0x45, 0);
    ip.writeUInt8(0x00, 1);
    ip.writeUInt16BE(20 + tcp.length, 2);
    ip.writeUInt16BE(ipId++, 4);
    ip.writeUInt16BE(0x4000, 6);       // don't fragment
    ip.writeUInt8(64, 8);              // TTL
    ip.writeUInt8(6, 9);               // TCP
    ip.writeUInt16BE(0, 10);           // checksum
    srcIp.copy(ip, 12);
    dstIp.copy(ip, 16);
    ip.writeUInt16BE(inetChecksum(ip), 10);

    // Ethernet (14 bytes)
    const eth = Buffer.alloc(14);
    dstMac.copy(eth, 0);
    srcMac.copy(eth, 6);
    eth.writeUInt16BE(0x0800, 12);

    return Buffer.concat([eth, ip, tcp]);
  }

  const SP = 51000, DP = 80;
  let cseq = 1000, sseq = 5000;
  const SYN = 0x02, ACK = 0x10, PSH = 0x08, FIN = 0x01;
  const add = (buf) => { packets.push({ tsSec, tsUsec, data: buf }); };

  // Handshake
  add(ethIpTcp(true, SP, DP, cseq, 0, SYN)); bump(1); cseq += 1;
  add(ethIpTcp(false, DP, SP, sseq, cseq, SYN | ACK)); bump(1); sseq += 1;
  add(ethIpTcp(true, SP, DP, cseq, sseq, ACK)); bump(2);

  // Client request
  const req = Buffer.from('GET /export?format=raw HTTP/1.1\r\nHost: data.internal.nebula.test\r\nUser-Agent: curl/8.4.0\r\nAccept: */*\r\n\r\n');
  add(ethIpTcp(true, SP, DP, cseq, sseq, PSH | ACK, req)); bump(3); cseq += req.length;

  // Server responds: headers + body split across two segments
  const half = Math.ceil(b64body.length / 2);
  const respA = Buffer.from(`HTTP/1.1 200 OK\r\nServer: nebula-fileproxy/1.4\r\nContent-Type: application/octet-stream\r\nContent-Length: ${b64body.length}\r\nConnection: close\r\n\r\n${b64body.slice(0, half)}`);
  const respB = Buffer.from(b64body.slice(half));
  add(ethIpTcp(false, DP, SP, sseq, cseq, PSH | ACK, respA)); bump(2); sseq += respA.length;
  add(ethIpTcp(false, DP, SP, sseq, cseq, PSH | ACK, respB)); bump(1); sseq += respB.length;

  // Client ACKs, teardown
  add(ethIpTcp(true, SP, DP, cseq, sseq, ACK)); bump(2);
  add(ethIpTcp(false, DP, SP, sseq, cseq, FIN | ACK)); bump(1); sseq += 1;
  add(ethIpTcp(true, SP, DP, cseq, sseq, FIN | ACK)); bump(1); cseq += 1;
  add(ethIpTcp(false, DP, SP, sseq, cseq, ACK));

  // Assemble pcap (classic libpcap, little-endian global header)
  const gh = Buffer.alloc(24);
  gh.writeUInt32LE(0xa1b2c3d4, 0);   // magic
  gh.writeUInt16LE(2, 4);            // version major
  gh.writeUInt16LE(4, 6);            // version minor
  gh.writeInt32LE(0, 8);             // thiszone
  gh.writeUInt32LE(0, 12);           // sigfigs
  gh.writeUInt32LE(65535, 16);       // snaplen
  gh.writeUInt32LE(1, 20);           // LINKTYPE_ETHERNET
  const chunks = [gh];
  for (const p of packets) {
    const rec = Buffer.alloc(16);
    rec.writeUInt32LE(p.tsSec, 0);
    rec.writeUInt32LE(p.tsUsec, 4);
    rec.writeUInt32LE(p.data.length, 8);
    rec.writeUInt32LE(p.data.length, 12);
    chunks.push(rec, p.data);
  }
  write('wire-trap/files/capture.pcap', Buffer.concat(chunks));

  write('wire-trap/challenge.json', json({
    id: 'wire-trap',
    title: 'Wire Trap',
    category: 'network',
    difficulty: 'intermediate',
    points: 300,
    mission: 'Field Operations',
    tags: ['pcap', 'wireshark', 'tcp-reassembly', 'http'],
    summary: 'A packet capture holds a file transfer split across TCP segments. Reassemble it.',
    briefing: `NebulaCorp's SOC captured traffic from a host suspected of exfiltrating data over plain HTTP. You have a raw packet capture (capture.pcap).\n\nThe interesting exchange is a single TCP conversation on port 80. The server's response body was transmitted across more than one TCP segment, so you cannot just read a single packet — you must reassemble the TCP stream to recover the full payload.\n\nOpen the capture in Wireshark, find the HTTP conversation, and use "Follow > TCP Stream" to reassemble it. The response body is Base64-encoded. Decode it to recover the flag.\n\n(This is a real libpcap file. Tools: Wireshark, tshark, tcpflow, or scapy.)`,
    objectives: [
      'Open capture.pcap in Wireshark',
      'Locate the TCP conversation on port 80',
      'Follow the TCP stream to reassemble the response body',
      'Base64-decode the reassembled body',
      'Submit the recovered flag'
    ],
    tools: ['Wireshark', 'tshark', 'tcpflow', 'scapy', 'base64'],
    hints: [
      { title: 'Follow the stream', text: 'In Wireshark: right-click any packet in the port-80 conversation > Follow > TCP Stream. Or on the CLI: tshark -r capture.pcap -q -z follow,tcp,raw,0', cost: 30 },
      { title: 'Decode the body', text: 'The HTTP response body (after the blank line) is Base64. Concatenate it (ignore line breaks) and run: echo "<b64>" | base64 -d', cost: 50 }
    ],
    requires: ['dead-drop'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'capture.pcap', description: 'Raw libpcap capture (Ethernet/IPv4/TCP). Open in Wireshark.' }],
  }));
  console.log('  wire-trap  (capture.pcap,', Buffer.concat(chunks).length, 'bytes)');
}

// ==================== binary-ghost: real ELF (Ghidra/objdump/GDB) ====================
{
  const flag = FLAGS.binaryGhost;
  const XOR_KEY = 0x5a;

  // .rodata = null-terminated strings, then the XOR-encrypted flag payload
  const strings = [
    'beacon v3.0-nebula',
    'Usage: beacon [--interval N] [--key FILE]',
    'Connecting to 203.0.113.42:443',
    'XOR key: 0x5a',
    '/var/log/.beacon.pid',
    'transmission complete',
  ];
  const strBlobs = strings.map((s) => Buffer.from(s + '\0', 'ascii'));
  const encPayload = Buffer.from([...Buffer.from(flag)].map((b) => b ^ XOR_KEY));
  const payloadOffsetInRodata = strBlobs.reduce((n, b) => n + b.length, 0);
  const rodata = Buffer.concat([...strBlobs, encPayload]);

  const TEXT_VADDR = 0x1000;
  const RODATA_VADDR = 0x2000;
  const payloadVaddr = RODATA_VADDR + payloadOffsetInRodata;

  // .text: a real x86-64 single-byte-XOR decrypt loop
  // push rbp; mov rbp,rsp; lea rsi,[rip+disp]; mov ecx,LEN; mov al,0x5a; .loop: xor [rsi],al; inc rsi; dec ecx; jnz .loop; pop rbp; ret
  const leaInstrEnd = TEXT_VADDR + 11;            // address right after the 7-byte lea
  const disp = payloadVaddr - leaInstrEnd;
  const text = Buffer.alloc(29);
  let o = 0;
  const put = (...b) => { for (const x of b) text.writeUInt8(x & 0xff, o++); };
  put(0x55);                                      // push rbp
  put(0x48, 0x89, 0xe5);                          // mov rbp,rsp
  put(0x48, 0x8d, 0x35);                          // lea rsi,[rip+disp]
  text.writeInt32LE(disp, o); o += 4;
  put(0xb9); text.writeUInt32LE(Buffer.from(flag).length, o); o += 4; // mov ecx,LEN
  put(0xb0, XOR_KEY);                             // mov al,0x5a
  put(0x30, 0x06);                                // xor byte [rsi],al   <- loop start (text+18)
  put(0x48, 0xff, 0xc6);                          // inc rsi
  put(0xff, 0xc9);                                // dec ecx
  put(0x75, 0xf7);                                // jnz .loop  (rel8 -9 -> back to text+18)
  put(0x5d);                                      // pop rbp
  put(0xc3);                                      // ret

  // .shstrtab
  const shstr = Buffer.from('\0.text\0.rodata\0.shstrtab\0', 'ascii');
  const nameOff = (name) => shstr.indexOf(Buffer.from(name + '\0', 'ascii'));

  // File layout: [ELF hdr 64][.text][.rodata][.shstrtab][section headers]
  const EH = 64, SHENT = 64, SHNUM = 4;
  const textOff = EH;
  const rodataOff = textOff + text.length;
  const shstrOff = rodataOff + rodata.length;
  const shoff = shstrOff + shstr.length;

  const elf = Buffer.alloc(shoff + SHNUM * SHENT);
  // ELF header
  elf.set([0x7f, 0x45, 0x4c, 0x46, 2, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0], 0); // e_ident
  elf.writeUInt16LE(2, 16);          // e_type = ET_EXEC
  elf.writeUInt16LE(0x3e, 18);       // e_machine = x86-64
  elf.writeUInt32LE(1, 20);          // e_version
  elf.writeBigUInt64LE(BigInt(TEXT_VADDR), 24); // e_entry
  elf.writeBigUInt64LE(0n, 32);      // e_phoff (none)
  elf.writeBigUInt64LE(BigInt(shoff), 40); // e_shoff
  elf.writeUInt32LE(0, 48);          // e_flags
  elf.writeUInt16LE(EH, 52);         // e_ehsize
  elf.writeUInt16LE(0, 54);          // e_phentsize
  elf.writeUInt16LE(0, 56);          // e_phnum
  elf.writeUInt16LE(SHENT, 58);      // e_shentsize
  elf.writeUInt16LE(SHNUM, 60);      // e_shnum
  elf.writeUInt16LE(3, 62);          // e_shstrndx (.shstrtab index)

  text.copy(elf, textOff);
  rodata.copy(elf, rodataOff);
  shstr.copy(elf, shstrOff);

  function writeShdr(idx, { name, type, flags, addr, offset, size, align, entsize = 0 }) {
    const base = shoff + idx * SHENT;
    elf.writeUInt32LE(name, base + 0);
    elf.writeUInt32LE(type, base + 4);
    elf.writeBigUInt64LE(BigInt(flags), base + 8);
    elf.writeBigUInt64LE(BigInt(addr), base + 16);
    elf.writeBigUInt64LE(BigInt(offset), base + 24);
    elf.writeBigUInt64LE(BigInt(size), base + 32);
    elf.writeUInt32LE(0, base + 40);   // sh_link
    elf.writeUInt32LE(0, base + 44);   // sh_info
    elf.writeBigUInt64LE(BigInt(align), base + 48);
    elf.writeBigUInt64LE(BigInt(entsize), base + 56);
  }
  writeShdr(0, { name: 0, type: 0, flags: 0, addr: 0, offset: 0, size: 0, align: 0 });
  writeShdr(1, { name: nameOff('.text'), type: 1, flags: 0x6, addr: TEXT_VADDR, offset: textOff, size: text.length, align: 16 });     // ALLOC|EXECINSTR
  writeShdr(2, { name: nameOff('.rodata'), type: 1, flags: 0x2, addr: RODATA_VADDR, offset: rodataOff, size: rodata.length, align: 1 }); // ALLOC
  writeShdr(3, { name: nameOff('.shstrtab'), type: 3, flags: 0, addr: 0, offset: shstrOff, size: shstr.length, align: 1 });

  // self-check: re-read section headers and XOR-decode the payload
  {
    if (elf.toString('ascii', 1, 4) !== 'ELF') throw new Error('ELF magic bad');
    const ro = elf.subarray(rodataOff, rodataOff + rodata.length);
    const payload = ro.subarray(payloadOffsetInRodata);
    const decoded = Buffer.from([...payload].map((b) => b ^ XOR_KEY)).toString();
    if (decoded !== flag) throw new Error('ELF payload self-check failed: ' + decoded);
  }

  write('binary-ghost/files/beacon', elf);

  write('binary-ghost/challenge.json', json({
    id: 'binary-ghost',
    title: 'Binary Ghost',
    category: 'reversing',
    difficulty: 'advanced',
    points: 400,
    mission: 'Field Operations',
    tags: ['reversing', 'elf', 'xor', 'ghidra', 'gdb'],
    summary: 'A real ELF binary hides an XOR-encrypted payload. Reverse it to recover the flag.',
    briefing: `Malware analysis recovered a Linux binary ("beacon") from a compromised host. It is a real 64-bit ELF executable. Inside, a decrypt routine un-scrambles an embedded payload using a single-byte XOR before the beacon transmits it.\n\nAnalyse the binary with your own tools:\n- "file beacon" confirms the format\n- "strings beacon" reveals the XOR key and other artifacts\n- "objdump -d beacon" (or Ghidra / radare2 / GDB) shows the decrypt loop in the .text section\n- The encrypted payload sits in the .rodata section\n\nExtract the encrypted bytes from .rodata and XOR each one with the key you found. The result is the flag.\n\n(Note: the binary is not meant to be executed — analyse it statically.)`,
    objectives: [
      'Identify the file type with "file"',
      'Recover the XOR key from strings / disassembly',
      'Locate the encrypted payload in the .rodata section',
      'XOR-decode it to recover the flag',
      'Submit the flag'
    ],
    tools: ['file', 'strings', 'objdump', 'Ghidra', 'radare2', 'GDB', 'python3'],
    hints: [
      { title: 'Find the key', text: 'Run: strings beacon | grep -i xor — the key is printed as "XOR key: 0x5a". Confirm it in the disassembly (mov al,0x5a).', cost: 40 },
      { title: 'Extract .rodata', text: 'Dump the read-only data: objdump -s -j .rodata beacon. The printable strings come first; the encrypted flag bytes follow them. XOR each byte with 0x5a.', cost: 70 }
    ],
    requires: ['rsa-paper'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'beacon', description: 'Recovered 64-bit ELF binary. Analyse statically — do not run it.' }],
  }));
  console.log('  binary-ghost  (beacon,', elf.length, 'bytes)');
}

// ==================== hash-heist: MD5 dump (hashcat / John) ====================
{
  const flag = FLAGS.hashHeist;
  // account -> password. The admin password is what the flag is built from.
  const accounts = [
    ['nebula_admin', 'nightshade77'],  // target -> flag
    ['jsmith', 'summer2025'],
    ['agarcia', 'dragonfly'],
    ['mchen', 'letmein123'],
    ['kpatel', 'P@ssw0rd-9xQ!zR'],     // strong, NOT in the wordlist (won't crack)
    ['svc_backup', 'qwerty2024'],
  ];
  const hashes = accounts.map(([u, p]) => `${u}:${md5(p)}`).join('\n') + '\n';
  write('hash-heist/files/hashes.txt', hashes);

  // wordlist: the crackable passwords + ~200 decoys (not the strong one)
  const inList = accounts.filter(([u]) => u !== 'kpatel').map(([, p]) => p);
  const decoys = [
    'password', 'password1', '123456', '12345678', 'qwerty', 'abc123', 'football', 'monkey',
    'letmein', 'dragon', 'baseball', 'iloveyou', 'trustno1', 'sunshine', 'master', 'shadow',
    'superman', 'michael', 'jennifer', 'hunter', 'buster', 'soccer', 'harley', 'batman',
    'andrew', 'tigger', 'charlie', 'robert', 'thomas', 'hockey', 'ranger', 'daniel',
    'hannah', 'maggie', 'jordan', 'michelle', 'loveme', 'jessica', 'pepper', 'zxcvbn',
    'summer2024', 'summer2026', 'winter2025', 'autumn2025', 'spring2025', 'nightshade', 'nightshade7',
    'nightfall', 'moonlight', 'starlight', 'dragonfly1', 'dragonfire', 'firefly', 'butterfly',
    'companyname', 'nebulacorp', 'nebula123', 'welcome1', 'welcome123', 'admin123', 'root123',
    'changeme', 'default', 'guest', 'test123', 'demo1234', 'qwerty123', 'qwerty2025', 'qwertyuiop',
    'letmein1', 'letmein12', 'letmein1234', 'passw0rd', 'pa$$w0rd', 'p@ssword', 'secret123',
  ];
  while (decoys.length < 200) decoys.push('pw' + decoys.length + Math.floor(Math.random() * 1000));
  const wordlist = [...decoys];
  // sprinkle the real passwords into the list at varied positions
  for (const p of inList) wordlist.splice(Math.floor(Math.random() * wordlist.length), 0, p);
  write('hash-heist/files/wordlist.txt', wordlist.join('\n') + '\n');

  write('hash-heist/challenge.json', json({
    id: 'hash-heist',
    title: 'Hash Heist',
    category: 'crypto',
    difficulty: 'intermediate',
    points: 300,
    mission: 'Field Operations',
    tags: ['hashcat', 'john', 'password-cracking', 'md5'],
    summary: 'A dump of unsalted MD5 password hashes. Crack the admin account.',
    briefing: `A database breach exposed NebulaCorp's internal account table, which stored passwords as unsalted MD5 hashes — a serious weakness. Incident response recovered the dump (hashes.txt) in "username:md5" format, plus a wordlist of candidate passwords (wordlist.txt).\n\nYour task: crack the password for the "nebula_admin" account.\n\nNot every account's password is in the wordlist (some chose strong passwords), but the admin's is. Use a real cracking tool:\n\n  hashcat -m 0 -a 0 --username hashes.txt wordlist.txt\n  john --format=raw-md5 --wordlist=wordlist.txt hashes.txt\n\nOnce you recover nebula_admin's plaintext password, submit:\n  RANGE{cracked_nebula_admin_<password>}\n\nFor example, if the password were "hunter2": RANGE{cracked_nebula_admin_hunter2}`,
    objectives: [
      'Identify the hash algorithm (unsalted MD5)',
      'Run hashcat or John against the wordlist',
      'Recover the plaintext for nebula_admin',
      'Format and submit the flag'
    ],
    tools: ['hashcat', 'John the Ripper', 'hashid', 'python3'],
    hints: [
      { title: 'Which account', text: 'Only nebula_admin matters. Isolate its hash: grep nebula_admin hashes.txt. It is a 32-hex-character MD5.', cost: 30 },
      { title: 'Cracking command', text: 'hashcat mode 0 is raw MD5. With "username:hash" lines, pass --username. Example: hashcat -m 0 -a 0 --username hashes.txt wordlist.txt --show', cost: 55 }
    ],
    requires: ['layered-encoding'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [
      { file: 'hashes.txt', description: 'Breached account table (username:md5).' },
      { file: 'wordlist.txt', description: 'Candidate password wordlist (~200 entries).' }
    ],
  }));
  console.log('  hash-heist  (admin md5:', md5('nightshade77'), ')');
}

// ==================== buried-signal: PNG with appended ZIP (binwalk/foremost/unzip) ====================
{
  const flag = FLAGS.buriedSignal;

  // --- valid 1x1 grayscale PNG ---
  function pngChunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const typeBuf = Buffer.from(type, 'ascii');
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([typeBuf, data])), 0);
    return Buffer.concat([len, typeBuf, data, crc]);
  }
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(1, 0);  // width
  ihdr.writeUInt32BE(1, 4);  // height
  ihdr.writeUInt8(8, 8);     // bit depth
  ihdr.writeUInt8(0, 9);     // color type grayscale
  ihdr.writeUInt8(0, 10);    // compression
  ihdr.writeUInt8(0, 11);    // filter
  ihdr.writeUInt8(0, 12);    // interlace
  const raw = Buffer.from([0x00, 0x80]); // filter byte + 1 gray pixel
  // zlib: header + one stored deflate block + adler32
  const storedBlock = Buffer.concat([
    Buffer.from([0x01]),                            // BFINAL=1, BTYPE=00 (stored)
    (() => { const b = Buffer.alloc(4); b.writeUInt16LE(raw.length, 0); b.writeUInt16LE(~raw.length & 0xffff, 2); return b; })(),
    raw,
  ]);
  const adler = Buffer.alloc(4); adler.writeUInt32BE(adler32(raw), 0);
  const idatData = Buffer.concat([Buffer.from([0x78, 0x01]), storedBlock, adler]);
  const png = Buffer.concat([sig, pngChunk('IHDR', ihdr), pngChunk('IDAT', idatData), pngChunk('IEND', Buffer.alloc(0))]);

  // --- stored ZIP containing flag.txt, appended after IEND ---
  const name = Buffer.from('flag.txt', 'ascii');
  const fileData = Buffer.from(flag + '\n', 'ascii');
  const fileCrc = crc32(fileData);

  const localHdr = Buffer.alloc(30);
  localHdr.writeUInt32LE(0x04034b50, 0);
  localHdr.writeUInt16LE(20, 4);     // version needed
  localHdr.writeUInt16LE(0, 6);      // flags
  localHdr.writeUInt16LE(0, 8);      // method = stored
  localHdr.writeUInt16LE(0, 10);     // mod time
  localHdr.writeUInt16LE(0, 12);     // mod date
  localHdr.writeUInt32LE(fileCrc, 14);
  localHdr.writeUInt32LE(fileData.length, 18);
  localHdr.writeUInt32LE(fileData.length, 22);
  localHdr.writeUInt16LE(name.length, 26);
  localHdr.writeUInt16LE(0, 28);
  const localEntry = Buffer.concat([localHdr, name, fileData]);

  const centralHdr = Buffer.alloc(46);
  centralHdr.writeUInt32LE(0x02014b50, 0);
  centralHdr.writeUInt16LE(20, 4);   // version made by
  centralHdr.writeUInt16LE(20, 6);   // version needed
  centralHdr.writeUInt16LE(0, 8);    // flags
  centralHdr.writeUInt16LE(0, 10);   // method
  centralHdr.writeUInt16LE(0, 12);   // time
  centralHdr.writeUInt16LE(0, 14);   // date
  centralHdr.writeUInt32LE(fileCrc, 16);
  centralHdr.writeUInt32LE(fileData.length, 20);
  centralHdr.writeUInt32LE(fileData.length, 24);
  centralHdr.writeUInt16LE(name.length, 28);
  centralHdr.writeUInt16LE(0, 30);   // extra len
  centralHdr.writeUInt16LE(0, 32);   // comment len
  centralHdr.writeUInt16LE(0, 34);   // disk number
  centralHdr.writeUInt16LE(0, 36);   // internal attrs
  centralHdr.writeUInt32LE(0, 38);   // external attrs
  centralHdr.writeUInt32LE(0, 42);   // local header offset (relative to ZIP start)
  const centralEntry = Buffer.concat([centralHdr, name]);

  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);          // disk number
  eocd.writeUInt16LE(0, 6);          // disk with CD
  eocd.writeUInt16LE(1, 8);          // CD entries this disk
  eocd.writeUInt16LE(1, 10);         // total CD entries
  eocd.writeUInt32LE(centralEntry.length, 12);  // CD size
  eocd.writeUInt32LE(localEntry.length, 16);    // CD offset (relative to ZIP start)
  eocd.writeUInt16LE(0, 20);         // comment len
  const zip = Buffer.concat([localEntry, centralEntry, eocd]);

  const evidence = Buffer.concat([png, zip]);
  write('buried-signal/files/evidence.png', evidence);

  // self-check: find PK\x03\x04, parse the stored entry, confirm the flag
  {
    const idx = evidence.indexOf(Buffer.from([0x50, 0x4b, 0x03, 0x04]));
    if (idx < 0) throw new Error('ZIP local header not found');
    const nameLen = evidence.readUInt16LE(idx + 26);
    const dataStart = idx + 30 + nameLen;
    const size = evidence.readUInt32LE(idx + 22);
    const got = evidence.toString('ascii', dataStart, dataStart + size).trim();
    if (got !== flag) throw new Error('ZIP payload self-check failed: ' + got);
  }

  write('buried-signal/challenge.json', json({
    id: 'buried-signal',
    title: 'Buried Signal',
    category: 'forensics',
    difficulty: 'intermediate',
    points: 250,
    mission: 'Field Operations',
    tags: ['steganography', 'binwalk', 'foremost', 'file-carving'],
    summary: 'An innocent-looking PNG has another file hidden inside it. Carve it out.',
    briefing: `An analyst pulled an image (evidence.png) off a suspect's USB drive. It renders as a tiny, unremarkable picture — but the file on disk is much larger than a 1x1 image should be. Something is appended after the end of the PNG data.\n\nUse file-carving tools to find and extract the hidden content:\n\n  file evidence.png          # identify\n  binwalk evidence.png       # shows embedded file signatures\n  binwalk -e evidence.png    # auto-extract\n  foremost evidence.png      # alternative carver\n  unzip evidence.png         # the appended data is a ZIP archive\n\nExtract the hidden archive, read the file inside it, and submit the flag.`,
    objectives: [
      'Notice the PNG is larger than its image dimensions justify',
      'Run binwalk to find the appended file signature',
      'Carve/extract the embedded ZIP archive',
      'Read the file inside and submit the flag'
    ],
    tools: ['binwalk', 'foremost', 'unzip', 'exiftool', 'xxd', 'file'],
    hints: [
      { title: 'Look past IEND', text: 'A PNG ends at its IEND chunk. Anything after that is extra. binwalk evidence.png will show a "Zip archive data" entry after the PNG image.', cost: 25 },
      { title: 'Extract it', text: 'The appended data is a valid ZIP. You can run unzip directly on the PNG: unzip evidence.png (ignore the "extra bytes" warning). It contains flag.txt.', cost: 45 }
    ],
    requires: ['ledger-audit'],
    flag: { type: 'static', sha256: sha(flag) },
    artifacts: [{ file: 'evidence.png', description: 'PNG image carved from a USB drive — larger than it looks.' }],
  }));
  console.log('  buried-signal  (evidence.png,', evidence.length, 'bytes)');
}

console.log('\nField Operations packs written (real binary evidence, Kali tools required):');
console.log('  wire-trap      -> Wireshark (Follow TCP Stream)');
console.log('  binary-ghost   -> file / strings / objdump / Ghidra / GDB');
console.log('  hash-heist     -> hashcat / John the Ripper');
console.log('  buried-signal  -> binwalk / foremost / unzip');
console.log('\nFlag solutions (organizers only):');
for (const [k, v] of Object.entries(FLAGS)) console.log(`  ${k}: ${v}`);
