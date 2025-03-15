// frontend/components/player-view.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerHand from "@/components/player-hand";
import CommunityCards from "@/components/community-cards";
import PlayerActions from "@/components/player-actions";
import AIAdvisor from "@/components/ai-advisor";
import { getPokerPosition } from "@/lib/utils";
import { useAzureSpeechSynthesis } from "@/hooks/useAzureSpeechSynthesis";
import { useState, useRef } from "react";

interface PlayerViewProps {
  gameId: string;
}

export default function PlayerView({ gameId }: PlayerViewProps) {
  console.log("Rendering PlayerView");
  const { gameRoom, userRole } = useGameContext();
  const { speak, stopSpeaking } = useAzureSpeechSynthesis();
  
  // Track previous community cards count to detect new ones
  const [prevCommunityCardsCount, setPrevCommunityCardsCount] = useState<number>(0);
  // Track previous game state to detect changes
  const [prevGameState, setPrevGameState] = useState<string | undefined>(undefined);
  
  // Use ref to track if we've announced the hand already for the current game
  const announcedHandRef = useRef<boolean>(false);
  // Track current hand by its content (as a string) to detect when it changes
  const [currentHandString, setCurrentHandString] = useState<string>("");
  // Track announced actions by IDs
  const [announcedActionIds, setAnnouncedActionIds] = useState<Set<string>>(new Set());
  // Track if we've announced the winner already for current round
  const [announcedWinner, setAnnouncedWinner] = useState<boolean>(false);
  // Track flop announcement for current hand
  const [announcedFlop, setAnnouncedFlop] = useState<boolean>(false);

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

  // Update currentHandString when hand changes
  useEffect(() => {
    if (currentPlayer?.hand?.cards) {
      // Create a string representation of the hand to track changes
      const handStr = JSON.stringify(currentPlayer.hand.cards);
      setCurrentHandString(handStr);
    } else {
      setCurrentHandString("");
    }
  }, [currentPlayer?.hand?.cards]);

  // Effect to announce player's hand when dealt (with protection against multiple announcements)
  useEffect(() => {
    if (!screenReaderEnabled || !currentPlayer?.hand?.cards || !gameRoom) return;
    
    // Get current hand as string to detect changes
    const handStr = JSON.stringify(currentPlayer.hand.cards);
    
    // Only announce if:
    // 1. We're in preflop
    // 2. Not waiting for cards
    // 3. The player has cards
    // 4. We haven't announced this specific hand before
    if (
      currentPlayer.hand.cards.length > 0 && 
      gameRoom.gameState === "PREFLOP" && 
      gameRoom.waitingForCards === false &&
      handStr === currentHandString && // Make sure it's the current hand
      !announcedHandRef.current // We haven't announced it yet
    ) {
      const card1 = currentPlayer.hand.cards[0];
      const card2 = currentPlayer.hand.cards.length > 1 ? currentPlayer.hand.cards[1] : null;
      
      let announcement = "Your hand is: ";
      announcement += formatCardForSpeech(card1);
      
      if (card2) {
        announcement += " and " + formatCardForSpeech(card2);
      }
      
      speak(announcement);
      announcedHandRef.current = true; // Mark as announced
    }
    
    // Reset announcement flag when game state changes
    if (gameRoom.gameState !== "PREFLOP") {
      announcedHandRef.current = false;
    }
  }, [currentHandString, gameRoom?.gameState, gameRoom?.waitingForCards, screenReaderEnabled, speak, currentPlayer?.hand?.cards]);

  // Effect to announce community cards when dealt
  useEffect(() => {
    if (!screenReaderEnabled || !gameRoom) return;
    
    // Reset flop announcement flag when a new hand starts
    if (prevGameState === "ENDED" && gameRoom.gameState === "PREFLOP") {
      setAnnouncedFlop(false);
    }
    
    // Handle flop announcement
    if (
      gameRoom.gameState === "FLOP" && 
      !gameRoom.waitingForCards && 
      gameRoom.communityCards && 
      gameRoom.communityCards.length === 3 && 
      !announcedFlop
    ) {
      // Explicitly announce all three flop cards
      let announcement = "Flop is: ";
      for (let i = 0; i < 3; i++) {
        announcement += formatCardForSpeech(gameRoom.communityCards[i]);
        if (i < 2) announcement += ", ";
      }
      speak(announcement);
      setAnnouncedFlop(true);
      setPrevCommunityCardsCount(3);
    }
    
    // Handle Turn card announcement
    if (
      gameRoom.gameState === "TURN" && 
      !gameRoom.waitingForCards && 
      gameRoom.communityCards && 
      gameRoom.communityCards.length === 4 && 
      prevCommunityCardsCount === 3
    ) {
      const turnAnnouncement = "Turn is: " + formatCardForSpeech(gameRoom.communityCards[3]);
      speak(turnAnnouncement);
      setPrevCommunityCardsCount(4);
    }
    
    // Handle River card announcement
    if (
      gameRoom.gameState === "RIVER" && 
      !gameRoom.waitingForCards && 
      gameRoom.communityCards && 
      gameRoom.communityCards.length === 5 && 
      prevCommunityCardsCount === 4
    ) {
      const riverAnnouncement = "River is: " + formatCardForSpeech(gameRoom.communityCards[4]);
      speak(riverAnnouncement);
      setPrevCommunityCardsCount(5);
    }
    
    // Update previous game state
    setPrevGameState(gameRoom.gameState);
  }, [
    gameRoom?.gameState, 
    gameRoom?.waitingForCards, 
    gameRoom?.communityCards, 
    prevCommunityCardsCount, 
    prevGameState, 
    announcedFlop,
    screenReaderEnabled, 
    speak
  ]);

  // Effect to announce player actions
  useEffect(() => {
    if (!screenReaderEnabled || !gameRoom?.actions) return;
    
    // Collect all new actions that haven't been announced yet
    const newActions = gameRoom.actions.filter(action => {
      // Create a unique ID for each action based on its properties
      const actionId = `${action.type}-${action.playerId}-${action.timestamp}`;
      return !announcedActionIds.has(actionId) && 
             action.type !== "LOG" && 
             action.type !== "SCAN_CARD" &&
             action.playerId; // Make sure playerId exists
    });
    
    if (newActions.length > 0) {
      // Create a new Set with all previously announced actions plus the new ones
      const updatedAnnouncedActions = new Set(announcedActionIds);
      
      // Process each new action
      newActions.forEach(action => {
        // Find the player position
        const playerIndex = gameRoom.players.findIndex(p => p.id === action.playerId);
        
        if (playerIndex >= 0) {
          const position = getPokerPosition(
            playerIndex,
            gameRoom.players.length,
            gameRoom.smallBlindPosition
          );
          
          const isCurrentPlayer = action.playerId === userRole.playerId;
          const playerPrefix = isCurrentPlayer ? "You" : position;
          
          // Format the action
          let actionText = "";
          
          switch (action.type) {
            case "FOLD":
              actionText = "fold";
              break;
            case "CHECK":
              actionText = "check";
              break;
            case "CALL":
              actionText = `call ${action.amount || 0}`;
              break;
            case "BET":
              actionText = `bet ${action.amount || 0}`;
              break;
            case "RAISE":
              actionText = `raise ${action.amount || 0}`;
              break;
            case "SMALL_BLIND":
              actionText = `post small blind ${action.amount || 0}`;
              break;
            case "BIG_BLIND":
              actionText = `post big blind ${action.amount || 0}`;
              break;
            default:
              actionText = action.type.toLowerCase();
          }
          
          // Announce the action
          speak(`${playerPrefix} ${actionText}`);
          
          // Add this action to the announced set
          const actionId = `${action.type}-${action.playerId}-${action.timestamp}`;
          updatedAnnouncedActions.add(actionId);
        }
      });
      
      // Update the state with all newly announced actions
      setAnnouncedActionIds(updatedAnnouncedActions);
    }
  }, [gameRoom?.actions, screenReaderEnabled, userRole.playerId, speak, gameRoom?.players, gameRoom?.smallBlindPosition]);

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
    
    // Reset announced winner flag when game state changes from SHOWDOWN/ENDED to PREFLOP
    if ((prevGameState === "SHOWDOWN" || prevGameState === "ENDED") && gameRoom.gameState === "PREFLOP") {
      setAnnouncedWinner(false);
    }
    
    // Announce winner only once per hand
    if ((gameRoom.gameState === "SHOWDOWN" || gameRoom.gameState === "ENDED") && 
        gameRoom.winnerIds && 
        gameRoom.winnerIds.length > 0 && 
        !announcedWinner) {
      
      const winners = gameRoom.players.filter(p => 
        gameRoom.winnerIds?.includes(p.id)
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
        setAnnouncedWinner(true); // Mark as announced
      }
    }
    
    // Update previous game state
    setPrevGameState(gameRoom.gameState);
  }, [gameRoom?.gameState, gameRoom?.winnerIds, prevGameState, screenReaderEnabled, speak, gameRoom?.players, gameRoom?.smallBlindPosition, announcedWinner]);

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