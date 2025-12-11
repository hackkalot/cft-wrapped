import { NextResponse } from "next/server";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const participants = await sql`SELECT id, name, email, is_admin, photo_url IS NOT NULL as has_photo FROM participants`;
    const sessions = await sql`SELECT * FROM game_sessions`;
    const guesses = await sql`SELECT * FROM guesses`;

    return NextResponse.json({
      counts: {
        participants: participants.rows.length,
        sessions: sessions.rows.length,
        guesses: guesses.rows.length,
      },
      participants: participants.rows,
      sessions: sessions.rows,
      guesses: guesses.rows,
    });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
