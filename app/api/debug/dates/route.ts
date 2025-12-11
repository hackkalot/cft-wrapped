import { NextResponse } from "next/server";

export async function GET() {
  const now = new Date();
  const startEnv = process.env.GAME_START_DATE;
  const endEnv = process.env.GAME_END_DATE;
  const start = new Date(startEnv || "2025-12-10T00:00:00Z");
  const end = new Date(endEnv || "2025-12-20T21:00:00Z");

  return NextResponse.json({
    serverTime: now.toISOString(),
    env: {
      GAME_START_DATE: startEnv || "(not set - using fallback)",
      GAME_END_DATE: endEnv || "(not set - using fallback)",
    },
    parsed: {
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
