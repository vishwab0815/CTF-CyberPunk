import { NextResponse } from "next/server";

// Hidden endpoint that reveals the flag when discovered
export async function GET() {
  return NextResponse.json({
    status: "success",
    message: "Access granted to legacy admin panel",
    flag: "flag{hidden_endpoints_reveal_truth}",
    note: "Congratulations! You discovered the hidden API endpoint. Security through obscurity is not real security.",
  });
}

export async function POST() {
  // Also support POST requests for consistency
  return NextResponse.json({
    status: "success",
    message: "Access granted to legacy admin panel",
    flag: "flag{hidden_endpoints_reveal_truth}",
    note: "Congratulations! You discovered the hidden API endpoint. Security through obscurity is not real security.",
  });
}
