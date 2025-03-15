// frontend/components/community-cards.tsx
"use client";

import PlayingCard from "@/components/playing-card";
import { CardType, GameRoomType } from "@/lib/types";

interface CommunityCardsProps {
  gameRoom: GameRoomType;
}

export default function CommunityCards({ gameRoom }: CommunityCardsProps) {
  // Fill with placeholders if less than 5 cards
  const displayCards = [...(gameRoom.communityCards || [])];
  while (displayCards.length < 5) {
    displayCards.push(null as unknown as CardType);
  }

  if (!gameRoom) {
    return null;
  }

  return (
    <div className="border border-dashed rounded-md p-4 my-4">
      <div className="flex items-center justify-between mb-4">
        <div>
          <span className="text-sm font-normal bg-secondary px-3 py-1 rounded">
            {gameRoom.waitingForCards ? "DEALING" : gameRoom.gameState}
          </span>
        </div>
        <p className="text-center">Community Cards</p>

        <div className="flex space-x-2">
          <span className="text-sm font-normal bg-secondary px-3 py-1 rounded">
            Pot: {gameRoom.pot}
          </span>
        </div>
      </div>

      <div className="flex justify-center gap-2 flex-wrap">
        {displayCards.map((card, index) => (
          <PlayingCard key={index} card={card} hidden={!card} />
        ))}
      </div>
    </div>
  );
}
