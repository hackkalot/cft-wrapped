"use client";

import { motion } from "framer-motion";
import Image from "next/image";

interface Participant {
  id: string;
  name: string;
  photoUrl: string;
}

interface ParticipantGridProps {
  participants: Participant[];
  assignedIds: Set<string>;
  selectedId: string | null;
  currentCardId: string;
  onSelect: (id: string) => void;
}

export default function ParticipantGrid({
  participants,
  assignedIds,
  selectedId,
  currentCardId,
  onSelect,
}: ParticipantGridProps) {
  // Sort: selected first, then available, then assigned
  const sortedParticipants = [...participants].sort((a, b) => {
    const aIsSelected = a.id === selectedId;
    const bIsSelected = b.id === selectedId;
    const aIsAssigned = assignedIds.has(a.id) && a.id !== selectedId;
    const bIsAssigned = assignedIds.has(b.id) && b.id !== selectedId;

    if (aIsSelected) return -1;
    if (bIsSelected) return 1;
    if (aIsAssigned && !bIsAssigned) return 1;
    if (!aIsAssigned && bIsAssigned) return -1;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="bg-fidelidade-gray rounded-2xl p-4">
      <h3 className="text-sm font-medium text-fidelidade-lightgray mb-3">
        Quem escolheu estes artistas?
      </h3>
      <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-2 max-h-[300px] overflow-y-auto pr-2">
        {sortedParticipants.map((participant) => {
          const isSelected = participant.id === selectedId;
          const isAssigned =
            assignedIds.has(participant.id) && !isSelected;

          return (
            <motion.button
              key={participant.id}
              whileHover={!isAssigned ? { scale: 1.05 } : undefined}
              whileTap={!isAssigned ? { scale: 0.95 } : undefined}
              onClick={() => !isAssigned && onSelect(participant.id)}
              disabled={isAssigned}
              className={`relative flex flex-col items-center p-2 rounded-xl transition-all ${
                isSelected
                  ? "bg-fidelidade-red/20 ring-2 ring-fidelidade-red"
                  : isAssigned
                    ? "opacity-30 cursor-not-allowed"
                    : "hover:bg-fidelidade-dark"
              }`}
            >
              <div className="relative w-12 h-12 sm:w-14 sm:h-14 rounded-full overflow-hidden bg-gray-600 mb-1">
                {participant.photoUrl && (
                  <Image
                    src={participant.photoUrl}
                    alt={participant.name}
                    fill
                    className="object-cover"
                  />
                )}
                {isAssigned && (
                  <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-white"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5 13l4 4L19 7"
                      />
                    </svg>
                  </div>
                )}
                {isSelected && (
                  <div className="absolute inset-0 bg-fidelidade-red/30 flex items-center justify-center">
                    <svg
                      className="w-6 h-6 text-fidelidade-red"
                      fill="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
                    </svg>
                  </div>
                )}
              </div>
              <span className="text-xs text-center truncate w-full">
                {participant.name.split(" ")[0]}
              </span>
            </motion.button>
          );
        })}
      </div>
      <p className="text-xs text-gray-500 mt-3 text-center">
        {participants.length - assignedIds.size} disponíveis
      </p>
    </div>
  );
}
