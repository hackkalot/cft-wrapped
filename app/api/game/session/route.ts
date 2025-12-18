import { NextResponse } from "next/server";
import { getSession, isGameOpen } from "@/lib/auth";
import {
  getOrCreateGameSession,
  getGuessesForSession,
  getParticipantsWithPhotos,
  getParticipantById,
  getRegistrationStatus,
  isRevealEnabled,
  getCorrectAnswersForSession,
} from "@/lib/db";

export async function GET() {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Check game status
    const gameStatus = isGameOpen();
    if (!gameStatus.open) {
      return NextResponse.json(
        { error: gameStatus.message, gameStatus },
        { status: 403 }
      );
    }

    // Check if all participants have registered with photos
    const registrationStatus = await getRegistrationStatus();
    if (!registrationStatus.allRegistered) {
      return NextResponse.json(
        {
          error: `Aguarda que todos os participantes se registem com foto. Faltam ${registrationStatus.missingPhoto} de ${registrationStatus.total} participantes.`,
          registrationStatus,
        },
        { status: 403 }
      );
    }

    // Get all participants (with photos = registered)
    const allParticipants = await getParticipantsWithPhotos();
    const allParticipantIds = allParticipants.map((p) => p.id);

    // Get or create game session
    const { session: gameSession, isNew } = await getOrCreateGameSession(
      session.participantId,
      allParticipantIds
    );

    // Get existing guesses
    const guesses = await getGuessesForSession(gameSession.id);

    // Build guesses map: cardParticipantId -> guessedParticipantId
    const guessesMap: Record<string, string> = {};
    for (const guess of guesses) {
      guessesMap[guess.card_participant_id] = guess.guessed_participant_id;
    }

    // Get card order from session (excluding current user)
    const cardOrder = gameSession.card_order as string[];

    // Build cards with artist info
    const cards = await Promise.all(
      cardOrder.map(async (participantId, index) => {
        const participant = await getParticipantById(participantId);
        return {
          id: participantId,
          index,
          artists: participant
            ? [participant.artist_1, participant.artist_2, participant.artist_3]
            : ["?", "?", "?"],
        };
      })
    );

    // Get all participants for grid (excluding current user)
    const gridParticipants = allParticipants
      .filter((p) => p.id !== session.participantId)
      .map((p) => ({
        id: p.id,
        name: p.name,
        photoUrl: p.photo_url,
      }));

    // Check if reveal is enabled (admins can always see answers)
    const revealEnabled = await isRevealEnabled();
    const canSeeAnswers = revealEnabled || session.isAdmin;

    // Get correct answers if reveal is enabled (or admin) and game is completed
    let correctAnswers: Record<string, { isCorrect: boolean; correctParticipantId: string }> = {};
    if (canSeeAnswers && gameSession.is_completed) {
      correctAnswers = await getCorrectAnswersForSession(gameSession.id);
    }

    return NextResponse.json({
      sessionId: gameSession.id,
      isCompleted: gameSession.is_completed,
      cards,
      guesses: guessesMap,
      participants: gridParticipants,
      totalCards: cardOrder.length,
      revealEnabled: canSeeAnswers,
      correctAnswers,
    });
  } catch (error) {
    console.error("Get game session error:", error);
    return NextResponse.json(
      { error: "Erro ao carregar jogo" },
      { status: 500 }
    );
  }
}
