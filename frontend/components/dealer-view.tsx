// frontend/components/dealer-view.tsx
"use client";

import { useState } from "react";
import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendGameAction } from "@/lib/websocket-service";
import CommunityCards from "@/components/community-cards";
import PlayerHand from "@/components/player-hand";
import GameActions from "@/components/game-actions";
import { getPokerPosition } from "@/lib/utils";
import { Input } from "./ui/input";

interface DealerViewProps {
  gameId: string;
}

export default function DealerView({ gameId }: DealerViewProps) {
  const { gameRoom } = useGameContext();
  const [error, setError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [raiseInput, setRaiseInput] = useState<number>(0);
  const [cardsSeen, setCardsSeen] = useState(new Set<string>());

  // Early return if gameRoom is not yet loaded
  if (!gameRoom) return <p>Loading dealer view...</p>;

  // Detect if the game is finished (SHOWDOWN or ENDED)
  const isGameOver =
    gameRoom.gameState === "SHOWDOWN" || gameRoom.gameState === "ENDED";

  // Determine current player from gameRoom using currentPlayerIndex
  const currentPlayer = gameRoom.players[gameRoom.currentPlayerIndex];
  // Recalculate call amount from current player's bet (from gameRoom.bets)
  const getCallAmount = () => {
    if (!currentPlayer) return 0;
    const currentPlayerBet =
      (gameRoom.bets && gameRoom.bets[currentPlayer.id]) || 0;
    if (!gameRoom.currentBet) return 0;
    return gameRoom.currentBet - currentPlayerBet;
  };

  const handleScanCard = () => {
    const suits = ["HEARTS", "DIAMONDS", "CLUBS", "SPADES"];
    const ranks = [
      "TWO",
      "THREE",
      "FOUR",
      "FIVE",
      "SIX",
      "SEVEN",
      "EIGHT",
      "NINE",
      "TEN",
      "JACK",
      "QUEEN",
      "KING",
      "ACE",
    ];
    const randomSuit = suits[Math.floor(Math.random() * suits.length)];
    const randomRank = ranks[Math.floor(Math.random() * ranks.length)];

    // Avoid scanning the same card twice
    if (cardsSeen.has(`${randomSuit}-${randomRank}`)) {
      return handleScanCard();
    } else {
      setCardsSeen(new Set(cardsSeen.add(`${randomSuit}-${randomRank}`)));
    }

    sendGameAction(gameId, {
      type: "SCAN_CARD",
      card: {
        suit: randomSuit,
        rank: randomRank,
      },
    });
  };

  const handleStartNewHand = async () => {
    setCardsSeen(new Set<string>());
    try {
      const response = await fetch(
        `${process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080"}/api/game/${gameId}/new-hand`,
        {
          method: "POST",
        },
      );
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to start new hand");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };
  
  return (
    <div className="w-full max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex flex-col items-center">
            <div className="w-full flex justify-between items-center">
              <span>Game Room: {gameId}</span>
              <div className="flex space-x-2 items-center">
                <span className="text-sm font-normal bg-secondary px-3 py-1 rounded">
                  {gameRoom.gameState}
                </span>
                <span className="text-sm font-normal bg-secondary px-3 py-1 rounded">
                  Pot: {gameRoom.pot}
                </span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">
                Players ({gameRoom.players.length}/5):
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto whitespace-nowrap">
                {gameRoom.players.map((player, index) => {
                  const position = getPokerPosition(
                    index,
                    gameRoom.players.length,
                    gameRoom.smallBlindPosition,
                  );
                  const isWinner =
                    gameRoom.winnerIds &&
                    gameRoom.winnerIds.includes(player.id);
                  return (
                    <PlayerHand
                      key={player.id}
                      player={player}
                      isCurrentPlayer={
                        gameRoom.currentPlayerIndex === index &&
                        gameRoom.gameState !== "SHOWDOWN" &&
                        gameRoom.gameState !== "ENDED"
                      }
                      position={position}
                      isWinner={isWinner}
                      showCards={true}
                    />
                  );
                })}
              </div>
            </div>

            <CommunityCards gameRoom={gameRoom} />

            {/* Scan Card Button */}
            {/* Hide or disable this if game is over */}
            <Button
              onClick={handleScanCard}
              className="w-full"
              disabled={isGameOver}
            >
              Scan Random Card
            </Button>

            {(gameRoom.gameState === "SHOWDOWN" ||
              gameRoom.gameState === "ENDED") && (
              <Button onClick={handleStartNewHand} className="w-full">
                Start New Hand
              </Button>
            )}

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            {errorMsg && (
              <p className="mt-2 text-sm text-center text-red-500">
                {errorMsg}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <GameActions actions={gameRoom.actions || []} />
    </div>
  );
}
