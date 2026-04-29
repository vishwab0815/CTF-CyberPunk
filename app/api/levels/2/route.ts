import { NextRequest, NextResponse } from "next/server";

const EXPLOIT_DOMAIN = "secure-testing-environment-27.internal"; // 27 chars
const FLAG = "flag{trust_the_server_not_the_client}";

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();

    if (!domain) {
      return NextResponse.json({
        result: "Error: Domain field is required.",
      });
    }

    if (domain === EXPLOIT_DOMAIN) {
      return NextResponse.json({
        result: `
Querying '${domain}'...
[CRITICAL FAILURE]
!! STACK BUFFER OVERFLOW DETECTED !!
...Parsing engine failure...
...Dumping associated DNS records...

DNSSEC: VALIDATION FAILED!
TXT: "${FLAG}"
`,
      });
    }

    return NextResponse.json({
      result: `
Querying '${domain}'...
[SUCCESS]
Type:   A
IP:     192.168.1.100
DNSSEC: VALID
Note: This domain is secure.
`,
    });
  } catch {
    return NextResponse.json({
      result: "Error processing request.",
    });
  }
}
