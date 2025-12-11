"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface ArtistCardProps {
  artists: [string, string, string];
  currentIndex: number;
  totalCards: number;
  selectedPerson?: {
    id: string;
    name: string;
    photoUrl: string;
  } | null;
  onNavigate: (direction: "prev" | "next") => void;
}

export default function ArtistCard({
  artists,
  currentIndex,
  totalCards,
  selectedPerson,
  onNavigate,
}: ArtistCardProps) {
  return (
    <motion.div
      key={currentIndex}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.95 }}
      transition={{ duration: 0.2 }}
      className="bg-gradient-to-br from-spotify-gray to-spotify-dark rounded-2xl p-6 shadow-xl"
    >
      {/* Progress */}
      <div className="flex items-center justify-between mb-6">
        <span className="text-sm text-spotify-lightgray">
          Card {currentIndex + 1} de {totalCards}
        </span>
        <div className="h-1 flex-1 mx-4 bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-spotify-green transition-all duration-300"
            style={{ width: `${((currentIndex + 1) / totalCards) * 100}%` }}
          />
        </div>
      </div>

      {/* Artists */}
      <div className="space-y-3 mb-6">
        <h2 className="text-sm font-medium text-spotify-lightgray uppercase tracking-wide">
          Top 3 Artistas
        </h2>
        {artists.map((artist, index) => (
          <motion.div
            key={index}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-center space-x-4 bg-spotify-dark/50 rounded-xl p-4"
          >
            <span className="text-2xl font-bold text-spotify-green">
              {index + 1}
            </span>
            <span className="text-lg font-medium">{artist}</span>
          </motion.div>
        ))}
      </div>

      {/* Selected Person Preview */}
      {selectedPerson && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-spotify-green/10 border border-spotify-green/30 rounded-xl p-4 flex items-center space-x-3"
        >
          <div className="w-10 h-10 rounded-full overflow-hidden bg-gray-600 relative">
            {selectedPerson.photoUrl && (
              <Image
                src={selectedPerson.photoUrl}
                alt={selectedPerson.name}
                fill
                className="object-cover"
              />
            )}
          </div>
          <div>
            <p className="text-sm text-spotify-lightgray">Selecionado:</p>
            <p className="font-medium text-spotify-green">
              {selectedPerson.name}
            </p>
          </div>
        </motion.div>
      )}

      {!selectedPerson && (
        <div className="text-center py-4 text-spotify-lightgray text-sm">
          Seleciona alguém em baixo
        </div>
      )}

      {/* Navigation */}
      <div className="flex justify-between mt-6 pt-4 border-t border-gray-700">
        <button
          onClick={() => onNavigate("prev")}
          disabled={currentIndex === 0}
          className="px-4 py-2 text-sm font-medium rounded-full bg-spotify-dark hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Anterior
        </button>
        <button
          onClick={() => onNavigate("next")}
          disabled={currentIndex === totalCards - 1}
          className="px-4 py-2 text-sm font-medium rounded-full bg-spotify-dark hover:bg-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          Próximo
        </button>
      </div>
    </motion.div>
  );
}
