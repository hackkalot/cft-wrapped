import { NextResponse } from "next/server";
import { getSession, isGameOpen } from "@/lib/auth";
import { getGameSession, completeGameSession, getGuessesForSession } from "@/lib/db";

export async function POST() {
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

    // Check if all cards have guesses
    const guesses = await getGuessesForSession(gameSession.id);
    const cardOrder = gameSession.card_order as string[];

    if (guesses.length < cardOrder.length) {
      return NextResponse.json(
        {
          error: `Faltam ${cardOrder.length - guesses.length} cards para completar`,
          missing: cardOrder.length - guesses.length
        },
        { status: 400 }
      );
    }

    // Complete the session
    await completeGameSession(gameSession.id);

    return NextResponse.json({
      success: true,
      message: "Jogo submetido com sucesso!"
    });
  } catch (error) {
    console.error("Submit game error:", error);
    return NextResponse.json(
      { error: "Erro ao submeter jogo" },
      { status: 500 }
    );
  }
}
