// frontend/components/player-view.tsx
"use client";

import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerHand from "@/components/player-hand";
import CommunityCards from "@/components/community-cards";
import PlayerActions from "@/components/player-actions";
import AIAdvisor from "@/components/ai-advisor";
import { getPokerPosition } from "@/lib/utils";
import { useAzureSpeechSynthesis } from "@/hooks/useAzureSpeechSynthesis";
import { useEffect, useState } from "react";

interface PlayerViewProps {
  gameId: string;
}

export default function PlayerView({ gameId }: PlayerViewProps) {
  console.log("Rendering PlayerView");
  const { gameRoom, userRole } = useGameContext();
  const { speak, stopSpeaking } = useAzureSpeechSynthesis();
  
  // Track previous community cards to detect new ones
  const [prevCommunityCards, setPrevCommunityCards] = useState<number>(0);
  // Track previous actions to detect new ones
  const [lastActionIndex, setLastActionIndex] = useState<number>(0);
  // Track previous game state to detect changes
  const [prevGameState, setPrevGameState] = useState<string | undefined>(undefined);

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

  // Check if screen reader is enabled
  const screenReaderEnabled = userRole.screenReader === true;

  // Effect to announce player's hand when dealt
  useEffect(() => {
    if (!screenReaderEnabled || !currentPlayer?.hand?.cards || !gameRoom) return;
    
    // Announce the player's hand when they receive cards
    if (
      currentPlayer.hand.cards.length > 0 && 
      gameRoom.gameState === "PREFLOP" && 
      gameRoom.waitingForCards === false
    ) {
      const card1 = currentPlayer.hand.cards[0];
      const card2 = currentPlayer.hand.cards.length > 1 ? currentPlayer.hand.cards[1] : null;
      
      let announcement = "Your hand is: ";
      announcement += formatCardForSpeech(card1);
      
      if (card2) {
        announcement += " and " + formatCardForSpeech(card2);
      }
      
      speak(announcement);
    }
  }, [currentPlayer?.hand?.cards, gameRoom?.gameState, gameRoom?.waitingForCards, screenReaderEnabled]);

  // Effect to announce community cards when dealt
  useEffect(() => {
    if (!screenReaderEnabled || !gameRoom?.communityCards) return;
    
    const currentCount = gameRoom.communityCards.length;
    
    // Only announce if new cards have been added
    if (currentCount > prevCommunityCards) {
      let announcement = "";
      
      if (prevCommunityCards === 0 && currentCount === 3) {
        // Flop
        announcement = "Flop is: ";
        announcement += gameRoom.communityCards.map(formatCardForSpeech).join(", ");
      } else if (prevCommunityCards === 3 && currentCount === 4) {
        // Turn
        announcement = "Turn is: " + formatCardForSpeech(gameRoom.communityCards[3]);
      } else if (prevCommunityCards === 4 && currentCount === 5) {
        // River
        announcement = "River is: " + formatCardForSpeech(gameRoom.communityCards[4]);
      }
      
      if (announcement) {
        speak(announcement);
      }
      
      setPrevCommunityCards(currentCount);
    }
  }, [gameRoom?.communityCards?.length, prevCommunityCards, screenReaderEnabled]);

  // Effect to announce player actions
  useEffect(() => {
    if (!screenReaderEnabled || !gameRoom?.actions) return;
    
    const actionsLength = gameRoom.actions.length;
    
    // Announce new actions
    if (actionsLength > lastActionIndex) {
      // Get the most recent action
      const latestAction = gameRoom.actions[actionsLength - 1];
      
      // Don't announce LOG or SCAN_CARD actions
      if (
        latestAction && 
        latestAction.type !== "LOG" && 
        latestAction.type !== "SCAN_CARD" &&
        latestAction.playerId !== userRole.playerId // Don't announce your own actions
      ) {
        // Find the player position
        const playerIndex = gameRoom.players.findIndex(
          p => p.id === latestAction.playerId
        );
        
        if (playerIndex >= 0) {
          const position = getPokerPosition(
            playerIndex,
            gameRoom.players.length,
            gameRoom.smallBlindPosition
          );
          
          // Format the action
          let actionText = "";
          
          switch (latestAction.type) {
            case "FOLD":
              actionText = "folds";
              break;
            case "CHECK":
              actionText = "checks";
              break;
            case "CALL":
              actionText = `calls ${latestAction.amount || ""}`;
              break;
            case "BET":
              actionText = `bets ${latestAction.amount || ""}`;
              break;
            case "RAISE":
              actionText = `raises ${latestAction.amount || ""}`;
              break;
            default:
              actionText = latestAction.type;
          }
          
          speak(`${position} ${actionText}`);
        }
      }
      
      setLastActionIndex(actionsLength);
    }
  }, [gameRoom?.actions?.length, lastActionIndex, screenReaderEnabled, userRole.playerId]);

  // Effect to announce game state changes (showdown/winner)
  useEffect(() => {
    if (!screenReaderEnabled || !gameRoom) return;
    
    // Detect change to SHOWDOWN state
    if (
      gameRoom.gameState === "SHOWDOWN" && 
      prevGameState !== "SHOWDOWN"
    ) {
      // Gather active players' hands info
      const activePlayers = gameRoom.players.filter(p => !p.folded);
      
      if (activePlayers.length > 1) {
        let showdownAnnouncement = "Showdown: ";
        
        activePlayers.forEach((player, idx) => {
          const position = getPokerPosition(
            gameRoom.players.findIndex(p => p.id === player.id),
            gameRoom.players.length,
            gameRoom.smallBlindPosition
          );
          
          // Add player's hand if available
          if (player.handRanking) {
            showdownAnnouncement += `${position} has ${player.handRanking}`;
            
            if (idx < activePlayers.length - 1) {
              showdownAnnouncement += ", ";
            }
          }
        });
        
        speak(showdownAnnouncement);
      }
    }
    
    // Announce winner
    if (gameRoom.winnerIds && gameRoom.winnerIds.length > 0) {
      const winners = gameRoom.players.filter(p => 
        gameRoom.winnerIds.includes(p.id)
      );
      
      if (winners.length > 0) {
        let winnerAnnouncement = winners.length === 1 ? "Winner is " : "Winners are ";
        
        winners.forEach((winner, idx) => {
          const position = getPokerPosition(
            gameRoom.players.findIndex(p => p.id === winner.id),
            gameRoom.players.length,
            gameRoom.smallBlindPosition
          );
          
          winnerAnnouncement += position;
          
          if (winner.handRanking) {
            winnerAnnouncement += ` with ${winner.handRanking}`;
          }
          
          if (idx < winners.length - 1) {
            winnerAnnouncement += ", ";
          }
        });
        
        speak(winnerAnnouncement);
      }
    }
    
    setPrevGameState(gameRoom.gameState);
  }, [gameRoom?.gameState, gameRoom?.winnerIds, prevGameState, screenReaderEnabled]);

  // Helper function to format a card for speech
  function formatCardForSpeech(card: any): string {
    if (!card) return "unknown card";
    
    let rank = "";
    switch (card.rank) {
      case "ACE": rank = "Ace"; break;
      case "KING": rank = "King"; break;
      case "QUEEN": rank = "Queen"; break;
      case "JACK": rank = "Jack"; break;
      case "TEN": rank = "Ten"; break;
      case "NINE": rank = "Nine"; break;
      case "EIGHT": rank = "Eight"; break;
      case "SEVEN": rank = "Seven"; break;
      case "SIX": rank = "Six"; break;
      case "FIVE": rank = "Five"; break;
      case "FOUR": rank = "Four"; break;
      case "THREE": rank = "Three"; break;
      case "TWO": rank = "Two"; break;
      default: rank = card.rank;
    }
    
    let suit = "";
    switch (card.suit) {
      case "HEARTS": suit = "Hearts"; break;
      case "DIAMONDS": suit = "Diamonds"; break;
      case "CLUBS": suit = "Clubs"; break;
      case "SPADES": suit = "Spades"; break;
      default: suit = card.suit;
    }
    
    return `${rank} of ${suit}`;
  }

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