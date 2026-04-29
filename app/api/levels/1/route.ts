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
        flagPart: "flag{legacy_systems_",
        hint: "🔍 Good! You found the first piece. Try checking 'legacy.internal' next.",
      });
    }

    if (d === "legacy.internal") {
      return NextResponse.json({
        flagPart: "tell_",
        hint: "💡 Excellent! One more to go. DNS TXT records often hold text data...",
      });
    }

    if (d === "txt.internal") {
      return NextResponse.json({
        flagPart: "secrets}",
        hint: "🎉 Perfect! You have all three pieces. Combine them to form the complete flag!",
      });
    }

    // Default - helpful response
    return NextResponse.json({
      flagPart: "No records found for this domain.",
      hint: "💭 Tip: Check the page source (Right-click → View Page Source or Ctrl+U) for clues!",
    });

  } catch (err) {
    return NextResponse.json({
      flagPart: "Error processing request.",
    });
  }
}
