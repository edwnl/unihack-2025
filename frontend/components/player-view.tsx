// frontend/components/player-view.tsx
"use client";

import { useEffect, useState, useRef } from "react";
import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import PlayerHand from "@/components/player-hand";
import CommunityCards from "@/components/community-cards";
import PlayerActions from "@/components/player-actions";
import AIAdvisor from "@/components/ai-advisor";
import { getPokerPosition } from "@/lib/utils";
import { useAzureSpeechSynthesis } from "@/hooks/useAzureSpeechSynthesis";
import { CardType, GameActionType, PlayerType } from "@/lib/types";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

interface PlayerViewProps {
  gameId: string;
}

export default function PlayerView({ gameId }: PlayerViewProps) {
  console.log("Rendering PlayerView");
  const { gameRoom, userRole } = useGameContext();
  const { speak } = useAzureSpeechSynthesis();

  const [prevCommunityCardsCount, setPrevCommunityCardsCount] =
    useState<number>(0);
  const [prevGameState, setPrevGameState] = useState<string | undefined>(
    undefined,
  );
  const announcedHandRef = useRef<boolean>(false);
  const [currentHandString, setCurrentHandString] = useState<string>("");
  const [announcedActionIds, setAnnouncedActionIds] = useState<Set<string>>(
    new Set(),
  );
  const [announcedWinner, setAnnouncedWinner] = useState<boolean>(false);
  const [announcedFlop, setAnnouncedFlop] = useState<boolean>(false);

  const router = useRouter();
  const { clearUserRole } = useGameContext();
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Determine if we're loading required data.
  const loading = !gameRoom || !userRole?.playerId;
  const currentPlayer =
    !loading && gameRoom!.players
      ? (gameRoom!.players.find(
          (p: PlayerType) => p.id === userRole!.playerId,
        ) ?? null)
      : null;

  const screenReaderEnabled = userRole?.screenReader === true;

  // Compute isPlayerTurn as a boolean.
  const isPlayerTurn =
    !loading && currentPlayer
      ? gameRoom!.players[gameRoom!.currentPlayerIndex]!.id ===
          currentPlayer!.id && !gameRoom!.waitingForCards
      : false;

  const currentBet = gameRoom ? gameRoom.currentBet || 0 : 0;
  const playerBet =
    gameRoom && currentPlayer && gameRoom.bets
      ? gameRoom.bets[currentPlayer.id] || 0
      : 0;
  const pot = gameRoom ? gameRoom.pot || 0 : 0;

  const isGameActive = gameRoom
    ? ["PREFLOP", "FLOP", "TURN", "RIVER"].includes(gameRoom.gameState)
    : false;

  // Helper: format a card for speech.
  function formatCardForSpeech(card: CardType | null | undefined): string {
    if (!card) return "unknown card";
    return `${card.rank} of ${card.suit}`;
  }

  // --- Effects ---
  useEffect(() => {
    if (!currentPlayer || !currentPlayer.hand?.cards) {
      setCurrentHandString("");
      return;
    }
    const handStr = JSON.stringify(currentPlayer.hand.cards);
    setCurrentHandString(handStr);
  }, [currentPlayer, currentPlayer?.hand?.cards]);

  useEffect(() => {
    if (!gameRoom || !currentPlayer || !screenReaderEnabled) return;
    if (!currentPlayer.hand?.cards) return;
    const handStr = JSON.stringify(currentPlayer.hand.cards);
    if (
      currentPlayer.hand.cards.length > 0 &&
      gameRoom.gameState === "PREFLOP" &&
      !gameRoom.waitingForCards &&
      handStr === currentHandString &&
      !announcedHandRef.current
    ) {
      const card1 = currentPlayer.hand.cards[0];
      const card2 =
        currentPlayer.hand.cards.length > 1
          ? currentPlayer.hand.cards[1]
          : null;
      let announcement = "Your hand is: " + formatCardForSpeech(card1);
      if (card2) {
        announcement += " and " + formatCardForSpeech(card2);
      }
      speak(announcement);
      announcedHandRef.current = true;
    }
    if (gameRoom.gameState !== "PREFLOP") {
      announcedHandRef.current = false;
    }
  }, [currentHandString, gameRoom, screenReaderEnabled, speak, currentPlayer]);

  useEffect(() => {
    if (!gameRoom || !screenReaderEnabled) return;
    if (!gameRoom.communityCards || gameRoom.communityCards.length === 0) {
      if (prevCommunityCardsCount !== 0 || announcedFlop) {
        setAnnouncedFlop(false);
        setPrevCommunityCardsCount(0);
      }
    }
    if (
      gameRoom.gameState === "FLOP" &&
      !gameRoom.waitingForCards &&
      gameRoom.communityCards &&
      gameRoom.communityCards.length === 3 &&
      !announcedFlop
    ) {
      let announcement = "Flop is: ";
      for (let i = 0; i < 3; i++) {
        announcement += formatCardForSpeech(gameRoom.communityCards[i]);
        if (i < 2) announcement += ", ";
      }
      speak(announcement);
      setAnnouncedFlop(true);
      setPrevCommunityCardsCount(3);
    }
    if (
      gameRoom.gameState === "TURN" &&
      !gameRoom.waitingForCards &&
      gameRoom.communityCards &&
      gameRoom.communityCards.length === 4 &&
      prevCommunityCardsCount === 3
    ) {
      const turnAnnouncement =
        "Turn is: " + formatCardForSpeech(gameRoom.communityCards[3]);
      speak(turnAnnouncement);
      setPrevCommunityCardsCount(4);
    }
    if (
      gameRoom.gameState === "RIVER" &&
      !gameRoom.waitingForCards &&
      gameRoom.communityCards &&
      gameRoom.communityCards.length === 5 &&
      prevCommunityCardsCount === 4
    ) {
      const riverAnnouncement =
        "River is: " + formatCardForSpeech(gameRoom.communityCards[4]);
      speak(riverAnnouncement);
      setPrevCommunityCardsCount(5);
    }
    setPrevGameState(gameRoom.gameState);
  }, [
    gameRoom,
    prevCommunityCardsCount,
    screenReaderEnabled,
    speak,
    announcedFlop,
  ]);

  useEffect(() => {
    if (!gameRoom || !screenReaderEnabled) return;
    const actions = (gameRoom.actions ?? []) as GameActionType[];
    const newActions = actions.filter((action) => {
      if (action.timestamp === undefined || action.playerId === undefined)
        return false;
      const actionId = `${action.type}-${action.playerId}-${action.timestamp}`;
      return (
        !announcedActionIds.has(actionId) &&
        action.type !== "LOG" &&
        action.type !== "SCAN_CARD"
      );
    });
    if (newActions.length > 0) {
      const updatedAnnouncedActions = new Set(announcedActionIds);
      newActions.forEach((action) => {
        const playerIndex = gameRoom!.players.findIndex(
          (p: PlayerType) => p.id === action.playerId,
        );
        if (playerIndex >= 0) {
          const position = getPokerPosition(
            playerIndex,
            gameRoom!.players.length,
            gameRoom!.smallBlindPosition!,
          );
          const isCurrentPlayer = action.playerId === userRole?.playerId;
          const playerPrefix = isCurrentPlayer ? "You" : position;
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
          speak(`${playerPrefix} ${actionText}`);
          const actionId = `${action.type}-${action.playerId}-${action.timestamp}`;
          updatedAnnouncedActions.add(actionId);
        }
      });
      setAnnouncedActionIds(updatedAnnouncedActions);
    }
  }, [gameRoom, screenReaderEnabled, userRole, speak, announcedActionIds]);

  useEffect(() => {
    if (!gameRoom || !screenReaderEnabled) return;
    if (gameRoom.gameState === "SHOWDOWN" && prevGameState !== "SHOWDOWN") {
      const activePlayers = gameRoom.players.filter(
        (p: PlayerType) => !p.folded,
      );
      if (activePlayers.length > 1) {
        let showdownAnnouncement = "Showdown: ";
        activePlayers.forEach((player: PlayerType, idx: number) => {
          const position = getPokerPosition(
            gameRoom!.players.findIndex((p: PlayerType) => p.id === player.id),
            gameRoom!.players.length,
            gameRoom!.smallBlindPosition!,
          );
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
    if (
      (prevGameState === "SHOWDOWN" || prevGameState === "ENDED") &&
      gameRoom.gameState === "PREFLOP"
    ) {
      setAnnouncedWinner(false);
    }
    if (
      (gameRoom.gameState === "SHOWDOWN" || gameRoom.gameState === "ENDED") &&
      gameRoom.winnerIds &&
      gameRoom.winnerIds.length > 0 &&
      !announcedWinner
    ) {
      const winners = gameRoom.players.filter((p: PlayerType) =>
        gameRoom.winnerIds!.includes(p.id),
      );
      if (winners.length > 0) {
        let winnerAnnouncement =
          winners.length === 1 ? "Winner is " : "Winners are ";
        winners.forEach((winner: PlayerType, idx: number) => {
          const position = getPokerPosition(
            gameRoom!.players.findIndex((p: PlayerType) => p.id === winner.id),
            gameRoom!.players.length,
            gameRoom!.smallBlindPosition!,
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
        setAnnouncedWinner(true);
      }
    }
    setPrevGameState(gameRoom.gameState);
  }, [gameRoom, prevGameState, screenReaderEnabled, speak, announcedWinner]);

  // Add this function inside the component
  const handleLeaveGame = async () => {
    try {
      const response = await fetch(
        `${backendUrl}/api/game/${gameId}/leave?playerId=${currentPlayer?.id}`,
        { method: "POST" },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to leave game");
      }

      toast.success("You have left the game");
      clearUserRole();
      router.push("/poker");
    } catch (error) {
      console.error("Error leaving game:", error);
      toast.error("Failed to leave the game");
    }
  };

  // --- Render ---
  if (loading) {
    return (
      <p>
        {!gameRoom ? "Loading player view..." : "Error: Player ID not found"}
      </p>
    );
  }
  if (!currentPlayer) {
    return <p>Error: Could not find your player information</p>;
  }

  return (
    <div className="w-full max-w-4xl">
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex justify-between items-center">
            <span>Game Room: {gameId}</span>
            <div className="text-center">
              <Button variant="outline" onClick={handleLeaveGame}>
                Leave Game
              </Button>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col space-y-4">
            {/* Other players */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4 overflow-x-auto whitespace-nowrap">
              {gameRoom.players.map((player: PlayerType, index: number) => {
                const position = getPokerPosition(
                  index,
                  gameRoom.players.length,
                  gameRoom.smallBlindPosition!,
                );
                const isWinner =
                  gameRoom.winnerIds && gameRoom.winnerIds.includes(player.id);
                return (
                  <PlayerHand
                    key={player.id}
                    // Provide defaults for online and folded then cast to the expected type.
                    player={
                      {
                        ...player,
                        online: player.online ?? false,
                        folded: player.folded ?? false,
                      } as PlayerType
                    }
                    isCurrentPlayer={
                      gameRoom.currentPlayerIndex === index &&
                      !gameRoom.waitingForCards &&
                      gameRoom.gameState !== "SHOWDOWN"
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
            {/* Player actions */}
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
