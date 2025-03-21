// frontend/components/dealer-view.tsx
"use client";

import { useState, useRef, useEffect } from "react";
import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { sendGameAction } from "@/lib/websocket-service";
import CommunityCards from "@/components/community-cards";
import PlayerHand from "@/components/player-hand";
import GameActions from "@/components/game-actions";
import { getPokerPosition } from "@/lib/utils";
import { Input } from "./ui/input";
import { useAzureSpeechRecognition } from "@/hooks/useAzureSpeechRecognition";
import { Mic, MicOff } from "lucide-react";
import { findBestPokerActionMatch, extractNumber } from "@/lib/fuzzy-match";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

interface DealerViewProps {
  gameId: string;
}

// Helper function to calculate how many cards remain to be scanned
/* eslint-disable @typescript-eslint/no-explicit-any */
function getRemainingCards(gameRoom: any): number {
  let remaining = 0;
  const currentCommunity = gameRoom.communityCards
    ? gameRoom.communityCards.length
    : 0;

  if (gameRoom.gameState === "PREFLOP") {
    // For PREFLOP, every active player should have 2 cards.
    /* eslint-disable @typescript-eslint/no-explicit-any */
    const activePlayers = gameRoom.players.filter((p: any) => p.active).length;
    const totalRequired = activePlayers * 2;
    let currentDealt = 0;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    gameRoom.players.forEach((p: any) => {
      if (p.hand && p.hand.cards) {
        currentDealt += p.hand.cards.length;
      }
    });
    remaining = totalRequired - currentDealt;
  } else if (gameRoom.gameState === "FLOP") {
    // The FLOP needs exactly 3 community cards
    remaining = 3 - currentCommunity;
  } else if (gameRoom.gameState === "TURN") {
    // After the flop, the TURN is the 4th community card
    remaining = 4 - currentCommunity;
  } else if (gameRoom.gameState === "RIVER") {
    // The RIVER is the 5th community card
    remaining = 5 - currentCommunity;
  }

  // Make sure we never return a negative number
  return remaining < 0 ? 0 : remaining;
}

export default function DealerView({ gameId }: DealerViewProps) {
  const { gameRoom, clearUserRole } = useGameContext();
  const [error, setError] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [raiseInputVoice, setRaiseInputVoice] = useState<number>(0);
  const [raiseInput, setRaiseInput] = useState<number>(0);
  const [cardsSeen, setCardsSeen] = useState(new Set<string>());
  const [scanDelay, setScanDelay] = useState(false);
  const foldRef = useRef<HTMLButtonElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const raiseRef = useRef<HTMLButtonElement>(null);
  const allInRef = useRef<HTMLButtonElement>(null);
  const callRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  useEffect(() => {
    if (raiseRef.current) {
      raiseRef.current.click();
    }
  }, [raiseInputVoice]);

  // Use Azure speech recognition hook
  const {
    isListening,
    recognizedText,
    startListening,
    stopListening,
    clearRecognizedText,
  } = useAzureSpeechRecognition((transcript) => {
    handleVoiceCommand(transcript);
    // Clear recognized text after 3 seconds
    setTimeout(() => clearRecognizedText(), 3000);
  });

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

  // Calculate how many cards remain to be scanned
  const remainingCards = getRemainingCards(gameRoom);
  // Allow scanning only if the game is waiting for cards, there are cards remaining, and the game is not over.
  const canScan = gameRoom.waitingForCards && remainingCards > 0 && !isGameOver;

  // Manual actions are disabled if the game is still waiting for cards or if the current player has folded.
  const actionsDisabled = gameRoom.waitingForCards || currentPlayer?.folded;

  // Handler for scanning a card
  const handleScanCard = () => {
    if (scanDelay) return; // Prevent scanning if not allowed
    if (!canScan) return; // Prevent scanning if not allowed
    setScanDelay(true);

    setTimeout(() => {
      setScanDelay(false);
    }, 150);

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

  // Handler for starting a new hand
  const handleStartNewHand = async () => {
    setCardsSeen(new Set<string>());
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const response = await fetch(
        `${backendUrl}/api/game/${gameId}/new-hand`,
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

  // Voice command handling
  const handleVoiceCommand = (command: string) => {
    // If the game is over, ignore voice commands
    if (isGameOver) return;

    // Clean up the command - remove punctuation and normalize
    const normalized = command
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:]/g, "");

    console.log("Dealer processing voice command:", normalized);

    if (currentPlayer.folded) {
      setErrorMsg("Player has already folded.");
      return;
    }

    // Process direct action commands without the "player" prefix
    const action = findBestPokerActionMatch(normalized);

    if (!action) {
      toast.error("Unrecognized voice command: " + normalized);
      console.log("Unrecognized voice command:", normalized);
      return;
    }

    if (action === "fold") {
      toast.success("Fold command recognized.");
      if (foldRef.current) {
        foldRef.current.click();
      }
    } else if (action === "check") {
      toast.success("Check command recognized.");
      if (checkRef.current) {
        checkRef.current.click();
      }
    } else if (action === "call") {
      toast.success("Call command recognized.");
      if (callRef.current) {
        callRef.current.click();
      }
    } else if (action === "raise" || action === "bet") {
      toast.success("Raise command recognized.");
      setRaiseInput(extractNumber(normalized) || 0);
      setRaiseInputVoice(extractNumber(normalized) || 0);
      if (raiseRef.current) {
        raiseRef.current.click();
      }
    } else if (action === "allin") {
      toast.success("All-in command recognized.");
      if (allInRef.current) {
        allInRef.current.click();
      }
    } else {
      toast.error("Unrecognized action: " + action);
      console.log("Unrecognized action:", action);
    }
  };

  // Manual action handlers
  const handleManualFold = () => {
    if (isGameOver) return;
    sendGameAction(gameId, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      type: "FOLD",
    });
  };
  const handleManualCheck = () => {
    if (isGameOver) return;
    const callAmt = getCallAmount();
    if (callAmt > 0) {
      setErrorMsg("Cannot check when there's a bet to call. Please use Call.");
      return;
    }
    setErrorMsg("");
    sendGameAction(gameId, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      type: "CHECK",
    });
  };
  const handleManualCall = () => {
    if (isGameOver) return;
    const callAmt = getCallAmount();
    if (callAmt === 0) {
      setErrorMsg("Call amount is zero. Please use Check.");
      return;
    }
    sendGameAction(gameId, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      type: "CALL",
      amount: callAmt,
    });
  };
  const handleManualRaise = () => {
    if (isGameOver) return;
    if (raiseInput <= 0) {
      setErrorMsg("Raise amount must be positive.");
      return;
    }
    if (raiseInput + getCallAmount() > (currentPlayer?.chips || 0)) {
      setErrorMsg("Raise amount exceeds player's chips.");
      return;
    }
    setErrorMsg("");
    sendGameAction(gameId, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      type: "RAISE",
      amount: raiseInput,
    });
  };
  const handleManualAllIn = () => {
    if (!currentPlayer) return;
    const allInAmount = currentPlayer.chips;
    if (allInAmount <= 0) {
      setErrorMsg("Player has no chips to go all in with.");
      return;
    }
    setErrorMsg("");
    sendGameAction(gameId, {
      playerId: currentPlayer.id,
      playerName: currentPlayer.name,
      type: getCallAmount() > 0 ? "RAISE" : "BET",
      amount: allInAmount,
    });
  };

  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  const handleDisbandRoom = async () => {
    try {
      const backendUrl =
        process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";
      const response = await fetch(`${backendUrl}/api/game/${gameId}/disband`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to disband game");
      }

      toast.success("You have disbanded the game room");
      clearUserRole();
      router.push("/poker");
    } catch (error) {
      console.error("Error disbanding game:", error);
      toast.error("Failed to disband the game room");
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
                <div className="text-center">
                  <Button variant="outline" onClick={handleDisbandRoom}>
                    Disband Room
                  </Button>
                </div>
              </div>
            </div>
            <div className="mt-2 flex justify-center">
              <Button
                onClick={toggleListening}
                className={`px-3 py-1 ${isListening ? "bg-red-500" : ""}`}
              >
                {isListening ? (
                  <div className="flex items-center">
                    <MicOff className="h-4 w-4 mr-1" />
                    Stop Listening
                  </div>
                ) : (
                  <div className="flex items-center">
                    <Mic className="h-4 w-4 mr-1" />
                    Start Listening
                  </div>
                )}
              </Button>
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

            {/* Scan Card Button with Countdown */}
            <Button
              onClick={handleScanCard}
              className="w-full"
              disabled={!canScan}
            >
              Scan Random Card ({remainingCards} remaining)
            </Button>

            {/* Manual Action Panel for current player */}
            <div className="p-4 border rounded-md">
              <p className="text-sm font-medium mb-2">
                Current Action for: {currentPlayer?.name}
              </p>
              <div className="flex justify-between items-center mb-2 text-sm">
                <span>Call Amount: {getCallAmount()}</span>
                <span>Chips: {currentPlayer?.chips}</span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  disabled={actionsDisabled}
                  onClick={handleManualFold}
                  variant="secondary"
                  ref={foldRef}
                >
                  Fold
                </Button>
                {getCallAmount() === 0 ? (
                  <Button
                    disabled={actionsDisabled}
                    onClick={handleManualCheck}
                    ref={checkRef}
                  >
                    Check
                  </Button>
                ) : (
                  <Button
                    onClick={handleManualCall}
                    disabled={
                      getCallAmount() > (currentPlayer?.chips || 0) ||
                      actionsDisabled
                    }
                    ref={callRef}
                  >
                    Call ({getCallAmount()})
                  </Button>
                )}
                <Input
                  type="number"
                  min={1}
                  max={Math.max(
                    0,
                    (currentPlayer?.chips || 0) - getCallAmount(),
                  )}
                  value={raiseInput.toString()}
                  onChange={(e) => setRaiseInput(Number(e.target.value))}
                  className="w-16"
                  disabled={actionsDisabled}
                />
                <Button
                  onClick={handleManualRaise}
                  disabled={
                    raiseInput <= 0 ||
                    raiseInput + getCallAmount() >
                      (currentPlayer?.chips || 0) ||
                    actionsDisabled
                  }
                  ref={raiseRef}
                >
                  Raise
                </Button>
                <Button
                  onClick={handleManualAllIn}
                  disabled={(currentPlayer?.chips || 0) <= 0 || actionsDisabled}
                  ref={allInRef}
                  className="bg-red-600 hover:bg-red-700"
                >
                  All In
                </Button>
              </div>
            </div>

            {(gameRoom.gameState === "SHOWDOWN" ||
              gameRoom.gameState === "ENDED") && (
              <Button onClick={handleStartNewHand} className="w-full">
                Start New Hand
              </Button>
            )}

            {error && <p className="text-red-500 text-center mt-4">{error}</p>}
            {recognizedText && (
              <p className="mt-2 text-sm text-center text-muted-foreground">
                Recognized: {recognizedText}
              </p>
            )}
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
