import { NextRequest, NextResponse } from "next/server";
import { getSession, isGameOpen } from "@/lib/auth";
import { saveGuess, removeGuess, getGameSession } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const session = await getSession();

    if (!session) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    // Check game status
    const gameStatus = isGameOpen();
    if (!gameStatus.open) {
      return NextResponse.json(
        { error: gameStatus.message },
        { status: 403 }
      );
    }

    const { cardParticipantId, guessedParticipantId, cardIndex } =
      await request.json();

    if (!cardParticipantId || cardIndex === undefined) {
      return NextResponse.json({ error: "Dados inválidos" }, { status: 400 });
    }

    // Get user's session
    const gameSession = await getGameSession(session.participantId);

    if (!gameSession) {
      return NextResponse.json(
        { error: "Sessão de jogo não encontrada" },
        { status: 404 }
      );
    }

    if (gameSession.is_completed) {
      return NextResponse.json(
        { error: "Jogo já foi submetido" },
        { status: 400 }
      );
    }

    // If guessedParticipantId is null, remove the guess
    if (!guessedParticipantId) {
      await removeGuess(gameSession.id, cardParticipantId);
      return NextResponse.json({ success: true, removed: true });
    }

    // Save the guess
    const guess = await saveGuess({
      sessionId: gameSession.id,
      cardParticipantId,
      guessedParticipantId,
      cardIndex,
    });

    return NextResponse.json({ success: true, guess });
  } catch (error) {
    console.error("Save guess error:", error);
    return NextResponse.json(
      { error: "Erro ao guardar resposta" },
      { status: 500 }
    );
  }
}
