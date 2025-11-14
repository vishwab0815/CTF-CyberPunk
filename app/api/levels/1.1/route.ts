import { NextRequest, NextResponse } from "next/server";

// Normalize: lowercase + trim
const normalize = (v: string) => v.trim().toLowerCase();

export async function POST(req: NextRequest) {
  try {
    const { domain } = await req.json();

    if (!domain || typeof domain !== "string") {
      return NextResponse.json({
        flagPart: "Error: Domain field is required.",
      });
    }

    const d = normalize(domain);

    // --- Flag Fragments ---
    if (d === "flag-archive.internal") {
      return NextResponse.json({
        flagPart: "flag{dns_failures_are_just_",
        hint: "Check the older resolver for additional logs.",
      });
    }

    if (d === "legacy.internal") {
      return NextResponse.json({
        flagPart: "informative_",
        hint: "Think about a DNS record type that stores text.",
      });
    }

    if (d === "txt.internal") {
      return NextResponse.json({
        flagPart: "logs}",
        hint: "You now have all fragments. Reconstruct the flag.",
      });
    }

    // Default
    return NextResponse.json({
      flagPart: "No data found. This domain is secure.",
      hint: "Try internal domains mentioned in the system notes.",
    });

  } catch (err) {
    return NextResponse.json({
      flagPart: "Error processing request.",
      hint: "Ensure your request format is correct.",
    });
  }
}
