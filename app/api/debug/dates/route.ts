import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  // Hardcoded dates - same as in auth.ts
  const start = new Date("2025-12-10T00:00:00Z");
  const end = new Date("2025-12-20T21:00:00Z");

  return NextResponse.json({
    deployVersion: "v2-hardcoded",
    serverTime: now.toISOString(),
    hardcodedDates: {
      start: start.toISOString(),
      end: end.toISOString(),
    },
    status: {
      beforeStart: now < start,
      afterEnd: now > end,
      isOpen: now >= start && now <= end,
    },
  });
}
