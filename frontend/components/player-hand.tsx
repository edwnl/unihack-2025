// frontend/components/player-hand.tsx
"use client";

import { PlayerType } from "@/lib/types";
import { Card } from "@/components/ui/card";
import PlayingCard from "./playing-card";

interface PlayerHandProps {
  player: PlayerType;
  isCurrentPlayer?: boolean;
  isPlayer?: boolean;
  showCards?: boolean;
  position?: string;
  isWinner?: boolean;
}

export default function PlayerHand({
  player,
  isCurrentPlayer = false,
  position = "",
  showCards = false,
  isWinner = false,
  isPlayer = false,
}: PlayerHandProps) {
  // Helper function to cap name at 16 characters
  const getDisplayName = () => {
    const name = isPlayer ? "YOU" : player.name;
    return name.length > 16 ? name.slice(0, 16) + "..." : name;
  };

  // Function to display the player's status/last action
  const getPlayerStatus = () => {
    if (isWinner) {
      return "Winner!"
    }

    // Check if player is all-in (chips = 0)
    if (player.chips === 0 && player.active && !player.folded) {
      return "All-In";
    }

    if (player.folded) {
      return "Folded";
    }

    if (isCurrentPlayer) {
      return "Current Turn";
    }

    // Show last action if available
    if (player.lastAction) {
      switch (player.lastAction) {
        case "CHECK":
          return "Checked";
        case "BET":
          return `Bet ${player.lastActionAmount}`;
        case "CALL":
          return `Called ${player.lastActionAmount}`;
        case "RAISE":
          return `Raised ${player.lastActionAmount}`;
        case "FOLD":
          return "Folded";
        case "SMALL_BLIND":
          return `SB ${player.lastActionAmount}`;
        case "BIG_BLIND":
          return `BB ${player.lastActionAmount}`;
        default:
          return player.lastAction;
      }
    }

    return "";
  };

  const playerStatus = getPlayerStatus();

  return (
    <Card
      className={`p-2 min-h-52 ${isCurrentPlayer ? "border-2 border-primary" : ""} 
                   ${isWinner ? "border-2 border-green-500" : ""}
                   ${player.active ? "" : "opacity-70"} 
                   ${isPlayer ? "bg-muted/30" : ""}`}
    >
      <div className="flex justify-between items-center">
        <p
          title={isPlayer ? "YOU" : player.name}
          className="font-medium truncate max-w-[80px]"
        >
          {getDisplayName()}
        </p>
        {position && (
          <span className="text-xs bg-primary/10 px-2 py-1 rounded">
            {position}
          </span>
        )}
      </div>
      <p className="text-sm">{player.chips} chips</p>

      <div className="flex flex-col">
        {/* Display hand ranking if available and showCards is true */}
        <p className="text-xs text-center mt-1 font-medium bg-secondary/30 rounded py-1 px-2 text-wrap min-h-[2.5rem] flex items-center justify-center">
          {player.folded
            ? "🏳️"
            : player.handRanking && (showCards || isPlayer)
              ? player.handRanking
              : "Unknown"}
        </p>

        {/* Player's cards if available */}
        <div className="mt-2 flex justify-center gap-1">
          {player.hand && player.hand.cards && player.hand.cards.length > 0 ? (
            // If player has cards, map and display them
            player.hand.cards.map((card, index) => (
              <PlayingCard
                key={index}
                card={card}
                faceDown={!showCards && !isPlayer}
              />
            ))
          ) : (
            // If player doesn't have cards yet, show 2 hidden placeholders
            <>
              <PlayingCard hidden />
              <PlayingCard hidden />
            </>
          )}

          {/* If player has only 1 card, add a second placeholder */}
          {player.hand &&
            player.hand.cards &&
            player.hand.cards.length === 1 && <PlayingCard hidden />}
        </div>

        {/* Status indicators */}
        <div className="flex justify-center gap-1 mt-1">
          {playerStatus && (
              <span
                  className={`text-xs px-2 py-1 rounded ${
                      playerStatus === "Current Turn"
                          ? "bg-primary/20"
                          : playerStatus === "Folded"
                              ? "text-muted-foreground"
                              : playerStatus === "All-In"
                                  ? "bg-yellow-500/30"
                                  : playerStatus === "Winner!"
                                      ? "bg-green-500/30 font-bold"
                                      : "bg-secondary/30"
                  }`}
              >
              {playerStatus}
            </span>
          )}
        </div>
      </div>
    </Card>
  );
}
