"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import ArtistCard from "@/components/ArtistCard";
import ParticipantGrid from "@/components/ParticipantGrid";

interface Card {
  id: string;
  index: number;
  artists: [string, string, string];
}

interface Participant {
  id: string;
  name: string;
  photoUrl: string;
}

interface GameData {
  sessionId: string;
  isCompleted: boolean;
  cards: Card[];
  guesses: Record<string, string>;
  participants: Participant[];
  totalCards: number;
}

export default function GamePage() {
  const [gameData, setGameData] = useState<GameData | null>(null);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [guesses, setGuesses] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [showCompletion, setShowCompletion] = useState(false);
  const [gameMessage, setGameMessage] = useState("");
  const router = useRouter();

  useEffect(() => {
    loadGame();
  }, []);

  const loadGame = async () => {
    try {
      const res = await fetch("/api/game/session");
      const data = await res.json();

      if (res.status === 401) {
        router.push("/");
        return;
      }

      if (res.status === 403) {
        setGameMessage(data.error || "Jogo não disponível");
        setLoading(false);
        return;
      }

      if (!res.ok) {
        setError(data.error || "Erro ao carregar jogo");
        setLoading(false);
        return;
      }

      if (data.isCompleted) {
        setShowCompletion(true);
      }

      setGameData(data);
      setGuesses(data.guesses || {});
    } catch {
      setError("Erro de ligação");
    } finally {
      setLoading(false);
    }
  };

  const handleSelect = useCallback(
    async (participantId: string) => {
      if (!gameData) return;

      const currentCard = gameData.cards[currentIndex];
      const currentGuess = guesses[currentCard.id];

      // If selecting the same person, deselect
      if (currentGuess === participantId) {
        // Remove guess
        const newGuesses = { ...guesses };
        delete newGuesses[currentCard.id];
        setGuesses(newGuesses);

        await fetch("/api/game/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardParticipantId: currentCard.id,
            guessedParticipantId: null,
            cardIndex: currentIndex,
          }),
        });
        return;
      }

      // Check if this person is already assigned to another card
      const existingCardId = Object.entries(guesses).find(
        ([cardId, guessId]) =>
          guessId === participantId && cardId !== currentCard.id
      )?.[0];

      if (existingCardId) {
        // Remove from previous card
        const newGuesses = { ...guesses };
        delete newGuesses[existingCardId];
        newGuesses[currentCard.id] = participantId;
        setGuesses(newGuesses);

        // Remove old guess
        await fetch("/api/game/guess", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            cardParticipantId: existingCardId,
            guessedParticipantId: null,
            cardIndex: gameData.cards.findIndex((c) => c.id === existingCardId),
          }),
        });
      } else {
        setGuesses((prev) => ({ ...prev, [currentCard.id]: participantId }));
      }

      // Save new guess
      await fetch("/api/game/guess", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cardParticipantId: currentCard.id,
          guessedParticipantId: participantId,
          cardIndex: currentIndex,
        }),
      });
    },
    [gameData, currentIndex, guesses]
  );

  const handleNavigate = (direction: "prev" | "next") => {
    if (direction === "prev" && currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
    } else if (
      direction === "next" &&
      gameData &&
      currentIndex < gameData.cards.length - 1
    ) {
      setCurrentIndex(currentIndex + 1);
    }
  };

  const handleSubmit = async () => {
    if (!gameData) return;

    const missingCount = gameData.cards.length - Object.keys(guesses).length;
    if (missingCount > 0) {
      setError(`Ainda tens ${missingCount} cards por preencher`);
      return;
    }

    setSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/game/submit", {
        method: "POST",
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Erro ao submeter");
        return;
      }

      setShowCompletion(true);
    } catch {
      setError("Erro de ligação");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-fidelidade-red"></div>
      </div>
    );
  }

  if (gameMessage) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <h1 className="text-2xl font-bold text-fidelidade-red mb-4">
            Wrapped Guesser
          </h1>
          <p className="text-fidelidade-lightgray mb-6">{gameMessage}</p>
          <button
            onClick={handleLogout}
            className="px-4 py-2 text-sm text-fidelidade-lightgray hover:text-white transition-colors"
          >
            Sair
          </button>
        </motion.div>
      </div>
    );
  }

  if (showCompletion) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center max-w-md"
        >
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-fidelidade-red/20 flex items-center justify-center">
            <svg
              className="w-10 h-10 text-fidelidade-red"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-fidelidade-red mb-4">
            Obrigado por jogares!
          </h1>
          <p className="text-fidelidade-lightgray mb-2">
            As tuas respostas foram guardadas.
          </p>
          <p className="text-fidelidade-lightgray mb-8">
            Os resultados serão revelados na reunião de equipa!
          </p>
          <button
            onClick={handleLogout}
            className="px-6 py-3 bg-fidelidade-gray text-white rounded-full hover:bg-gray-700 transition-colors"
          >
            Sair
          </button>
        </motion.div>
      </div>
    );
  }

  if (!gameData || gameData.cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-fidelidade-lightgray">
          Ainda não há participantes suficientes registados.
        </p>
        <button
          onClick={handleLogout}
          className="mt-4 px-4 py-2 text-sm text-fidelidade-lightgray hover:text-white transition-colors"
        >
          Sair
        </button>
      </div>
    );
  }

  const currentCard = gameData.cards[currentIndex];
  const selectedId = guesses[currentCard.id] || null;
  const selectedPerson = selectedId
    ? gameData.participants.find((p) => p.id === selectedId)
    : null;

  // Build set of assigned participant IDs (excluding current card's selection)
  const assignedIds = new Set(
    Object.entries(guesses)
      .filter(([cardId]) => cardId !== currentCard.id)
      .map(([, participantId]) => participantId)
  );

  const completedCount = Object.keys(guesses).length;
  const allComplete = completedCount === gameData.cards.length;

  return (
    <main className="min-h-screen p-4 pb-24">
      <div className="max-w-lg mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-xl font-bold text-fidelidade-red">
              Wrapped Guesser
            </h1>
            <p className="text-xs text-fidelidade-lightgray">
              {completedCount}/{gameData.totalCards} completos
            </p>
          </div>
          <button
            onClick={handleLogout}
            className="px-3 py-1 text-sm text-fidelidade-lightgray hover:text-white transition-colors"
          >
            Sair
          </button>
        </div>

        {/* Card */}
        <AnimatePresence mode="wait">
          <ArtistCard
            key={currentIndex}
            artists={currentCard.artists as [string, string, string]}
            currentIndex={currentIndex}
            totalCards={gameData.cards.length}
            selectedPerson={selectedPerson || null}
            onNavigate={handleNavigate}
          />
        </AnimatePresence>

        {/* Grid */}
        <div className="mt-4">
          <ParticipantGrid
            participants={gameData.participants}
            assignedIds={assignedIds}
            selectedId={selectedId}
            currentCardId={currentCard.id}
            onSelect={handleSelect}
          />
        </div>

        {/* Error */}
        {error && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-red-400 text-sm text-center mt-4"
          >
            {error}
          </motion.p>
        )}

        {/* Submit Button */}
        <div className="fixed bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-fidelidade-dark to-transparent">
          <div className="max-w-lg mx-auto">
            <button
              onClick={handleSubmit}
              disabled={!allComplete || submitting}
              className={`w-full py-4 px-6 rounded-full font-semibold transition-all ${
                allComplete
                  ? "bg-fidelidade-red text-white hover:bg-fidelidade-darkred"
                  : "bg-gray-700 text-gray-400 cursor-not-allowed"
              }`}
            >
              {submitting ? (
                <span className="flex items-center justify-center">
                  <svg
                    className="animate-spin -ml-1 mr-3 h-5 w-5"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  A submeter...
                </span>
              ) : allComplete ? (
                "Submeter Respostas"
              ) : (
                `Faltam ${gameData.totalCards - completedCount} cards`
              )}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
