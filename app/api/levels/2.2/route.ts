import { NextResponse } from "next/server";

export async function POST(req: Request) {
  const { token } = await req.json();

  try {
    // Decode and validate token
    const decoded = JSON.parse(atob(token));

    if (decoded.role === "admin") {
      return NextResponse.json({
        status: "ACCESS GRANTED",
        admin: true,
        message: "Admin identity accepted.",
        admin_key: "ADMIN-IDENTITY-FORGED",
      });
    }

    return NextResponse.json({
      status: "ACCESS DENIED",
      admin: false,
      reason: "Insufficient privileges.",
    });
  } catch (err) {
    return NextResponse.json(
      { error: "Invalid token format." },
      { status: 400 }
    );
  }
}
