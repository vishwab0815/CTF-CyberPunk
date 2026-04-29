import { NextResponse } from "next/server";

// Profile database with red herrings
const profiles: Record<number, any> = {
  // Regular user (default)
  1001: {
    id: 1001,
    name: "John Smith",
    role: "user",
    department: "Engineering",
  },

  // Red herrings - look important but aren't
  1: {
    id: 1,
    name: "System Account",
    role: "service",
    department: "Infrastructure",
  },

  100: {
    id: 100,
    name: "Sarah Connor",
    role: "manager",
    department: "Operations",
  },

  500: {
    id: 500,
    name: "Mike Johnson",
    role: "developer",
    department: "Engineering",
  },

  999: {
    id: 999,
    name: "Administrator",
    role: "admin",
    department: "IT",
    note: "Regular IT admin - limited access",
  },

  1000: {
    id: 1000,
    name: "Guest Account",
    role: "guest",
    department: "Public",
  },

  1337: {
    id: 1337,
    name: "Alex Martinez",
    role: "developer",
    department: "Security",
  },

  2000: {
    id: 2000,
    name: "Database Service",
    role: "service",
    department: "Infrastructure",
  },

  5000: {
    id: 5000,
    name: "Legacy System",
    role: "deprecated",
    department: "Archive",
  },

  // ACTUAL ADMIN - hidden among others
  7777: {
    id: 7777,
    name: "Root Administrator",
    role: "superadmin",
    department: "Security Operations",
    ghost_token: "GHOST-ACCESS-GRANTED",
  },

  8888: {
    id: 8888,
    name: "Backup Service",
    role: "service",
    department: "Infrastructure",
  },

  9999: {
    id: 9999,
    name: "Test Account",
    role: "test",
    department: "QA",
  },
};

export async function POST(req: Request) {
  const { id } = await req.json();

  const profile = profiles[id];

  if (profile) {
    return NextResponse.json(profile);
  }

  // 404 for non-existent profiles
  return NextResponse.json(
    { error: "Profile not found" },
    { status: 404 }
  );
}
