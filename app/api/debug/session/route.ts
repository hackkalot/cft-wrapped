import { NextResponse } from "next/server";
import { getSession, isGameOpen } from "@/lib/auth";
import { sql } from "@vercel/postgres";
import {
  getRegistrationStatus,
  getParticipantsWithPhotos,
  getParticipantById,
  getGuessesForSession,
  isRevealEnabled,
  getCorrectAnswersForSession,
} from "@/lib/db";

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

    // Check game open status
    const gameOpenStatus = isGameOpen();

    // Check registration status
    const registrationStatus = await getRegistrationStatus();

    // Test the actual game session flow to find the error
    let gameSessionTest: { step: string; error?: string; data?: unknown } = { step: "not started" };
    try {
      gameSessionTest.step = "getParticipantsWithPhotos";
      const allParticipants = await getParticipantsWithPhotos();
      gameSessionTest.data = { participantsCount: allParticipants.length };

      gameSessionTest.step = "getCardOrder";
      const cardOrder = gameSession.rows[0]?.card_order as string[] | undefined;
      if (!cardOrder) {
        gameSessionTest.error = "No card_order found";
      } else {
        gameSessionTest.step = "buildCards";
        // Test building cards - this might be failing
        const testCard = cardOrder[0];
        if (testCard) {
          const testParticipant = await getParticipantById(testCard);
          gameSessionTest.data = {
            ...gameSessionTest.data as object,
            firstCardId: testCard,
            firstCardParticipant: testParticipant ? { id: testParticipant.id, name: testParticipant.name } : null,
          };
        }

        gameSessionTest.step = "getGuesses";
        const guesses = await getGuessesForSession(gameSession.rows[0].id);
        gameSessionTest.data = {
          ...gameSessionTest.data as object,
          guessesCount: guesses.length,
        };

        gameSessionTest.step = "isRevealEnabled";
        const revealEnabled = await isRevealEnabled();
        gameSessionTest.data = {
          ...gameSessionTest.data as object,
          revealEnabled,
          isAdmin: session.isAdmin,
        };

        if ((revealEnabled || session.isAdmin) && gameSession.rows[0].is_completed) {
          gameSessionTest.step = "getCorrectAnswers";
          const correctAnswers = await getCorrectAnswersForSession(gameSession.rows[0].id);
          gameSessionTest.data = {
            ...gameSessionTest.data as object,
            correctAnswersCount: Object.keys(correctAnswers).length,
          };
        }

        gameSessionTest.step = "completed";
      }
    } catch (e) {
      gameSessionTest.error = String(e);
    }

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
      gameOpenStatus,
      registrationStatus,
      gameSessionTest,
    });
  } catch (error) {
    console.error("Debug session error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar debug info", details: String(error) },
      { status: 500 }
    );
  }
}
