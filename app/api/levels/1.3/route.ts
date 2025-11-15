import { NextResponse } from "next/server";

const EXPLOIT = "dns-rebinding-test.internal";
const FLAG = "flag{javascript_is_not_security}";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const domain = String(body?.domain || "").trim();

    if (!domain) {
      return NextResponse.json({
        result: "Error: Domain is required."
      });
    }

    // Vulnerable server logic (unchanged from 1.2)
    if (domain === EXPLOIT) {
      return NextResponse.json({
        result: `
Querying '${domain}'...
[CRITICAL FAILURE]
JavaScript Guard was bypassed.
TXT: "${FLAG}"
`
      });
    }

    // Default safe output
    return NextResponse.json({
      result: `
Querying '${domain}'...
[SUCCESS]
Type: A
IP: 192.168.1.100
DNSSEC: VALID
`
    });

  } catch (error: any) {
    return NextResponse.json({
      result: `Server Error: ${error?.message ?? "Unknown error."}`
    });
  }
}
