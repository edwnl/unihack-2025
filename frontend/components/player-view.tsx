// frontend/components/player-view.tsx
"use client";

import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerHand from "@/components/player-hand";
import CommunityCards from "@/components/community-cards";
import PlayerActions from "@/components/player-actions";
import AIAdvisor from "@/components/ai-advisor";
import { getPokerPosition } from "@/lib/utils";

interface PlayerViewProps {
  gameId: string;
}

export default function PlayerView({ gameId }: PlayerViewProps) {
  const { gameRoom, userRole } = useGameContext();

  if (!gameRoom) return <p>Loading player view...</p>;
  if (!userRole?.playerId) return <p>Error: Player ID not found</p>;

  // Find current player by ID
  const currentPlayer = gameRoom.players.find(
    (p) => p.id === userRole.playerId,
  );

  if (!currentPlayer) {
    return <p>Error: Could not find your player information</p>;
  }

  // Check if it's current player's turn
  const isPlayerTurn =
    !gameRoom.waitingForCards &&
    gameRoom.currentPlayerIndex >= 0 &&
    gameRoom.players.length > gameRoom.currentPlayerIndex &&
    gameRoom.players[gameRoom.currentPlayerIndex].id === currentPlayer.id;

  // Get states needed for betting
  const currentBet = gameRoom.currentBet || 0;
  const playerBet = gameRoom.bets ? gameRoom.bets[currentPlayer.id] || 0 : 0;
  const pot = gameRoom.pot || 0;

  // Get game state information
  const isGameActive = ["PREFLOP", "FLOP", "TURN", "RIVER"].includes(
    gameRoom.gameState,
  );

  return (
    <div className="w-full max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Game Room: {gameId}</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {/* Other players */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto whitespace-nowrap">
              {gameRoom.players.map((player, index) => {
                const position = getPokerPosition(
                  index,
                  gameRoom.players.length,
                  gameRoom.smallBlindPosition,
                );

                // Check if this player is a winner
                const isWinner =
                  gameRoom.winnerIds && gameRoom.winnerIds.includes(player.id);

                return (
                  <PlayerHand
                    key={player.id}
                    player={player}
                    isCurrentPlayer={
                      gameRoom.currentPlayerIndex === index &&
                      !gameRoom.waitingForCards &&
                      gameRoom.gameState != "SHOWDOWN"
                    }
                    position={position}
                    showCards={
                      gameRoom.gameState === "SHOWDOWN" && !player.folded
                    }
                    isWinner={isWinner}
                    isPlayer={userRole.playerId === player.id}
                  />
                );
              })}
            </div>

            {/* Community cards */}
            <CommunityCards gameRoom={gameRoom} />

            {/* Player actions - Always rendered but disabled when not player's turn */}
            {currentPlayer.online && isGameActive && (
              <PlayerActions
                gameId={gameId}
                player={currentPlayer}
                currentBet={currentBet}
                playerCurrentBet={playerBet}
                pot={pot}
                isPlayerTurn={isPlayerTurn}
              />
            )}

            {/* AI Advisor component */}
            {currentPlayer.online && isGameActive && (
              <AIAdvisor
                gameRoom={gameRoom}
                player={currentPlayer}
                isPlayerTurn={isPlayerTurn}
              />
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
