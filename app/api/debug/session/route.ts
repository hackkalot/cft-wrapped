import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { sql } from "@vercel/postgres";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Get participant info
    const participant = await sql`
      SELECT id, name, email, is_admin, photo_url IS NOT NULL as has_photo
      FROM participants
      WHERE id = ${session.participantId}
    `;

    // Get game session info
    const gameSession = await sql`
      SELECT id, player_id, card_order, is_completed, completed_at
      FROM game_sessions
      WHERE player_id = ${session.participantId}
    `;

    // Get guesses count
    const guessesCount = gameSession.rows[0] ? await sql`
      SELECT COUNT(*) as count
      FROM guesses
      WHERE session_id = ${gameSession.rows[0].id}
    ` : null;

    // Get total participants with photos
    const totalParticipants = await sql`
      SELECT COUNT(*) as count FROM participants WHERE photo_url IS NOT NULL
    `;

    return NextResponse.json({
      sessionPayload: {
        participantId: session.participantId,
        email: session.email,
        isAdmin: session.isAdmin,
      },
      participant: participant.rows[0] || null,
      gameSession: gameSession.rows[0] ? {
        id: gameSession.rows[0].id,
        is_completed: gameSession.rows[0].is_completed,
        card_order_length: Array.isArray(gameSession.rows[0].card_order)
          ? gameSession.rows[0].card_order.length
          : 'not an array',
        card_order_sample: Array.isArray(gameSession.rows[0].card_order)
          ? gameSession.rows[0].card_order.slice(0, 3)
          : gameSession.rows[0].card_order,
      } : null,
      guessesCount: guessesCount?.rows[0]?.count || 0,
      totalParticipantsWithPhoto: totalParticipants.rows[0]?.count || 0,
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar debug info", details: String(error) },
      { status: 500 }
    );
  }
}
