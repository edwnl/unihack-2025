// frontend/components/player-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState, useRef } from "react";
import { sendGameAction } from "@/lib/websocket-service";
import { PlayerType } from "@/lib/types";
import RaiseDialog from "@/components/raise-dialog";
import { useAzureSpeechRecognition } from "@/hooks/useAzureSpeechRecognition";
import { Mic, MicOff } from "lucide-react";
import { findBestPokerActionMatch, extractNumber } from "@/lib/fuzzy-match";

interface PlayerActionsProps {
  gameId: string;
  player: PlayerType;
  currentBet: number;
  playerCurrentBet: number;
  pot?: number;
  isPlayerTurn: boolean;
}

export default function PlayerActions({
  gameId,
  player,
  currentBet,
  playerCurrentBet = 0,
  pot = 0,
  isPlayerTurn = false,
}: PlayerActionsProps) {
  const [raiseDialogOpen, setRaiseDialogOpen] = useState(false);
  const foldRef = useRef<HTMLButtonElement>(null);
  const checkRef = useRef<HTMLButtonElement>(null);
  const raiseRef = useRef<HTMLButtonElement>(null);
  //const allInRef = useRef<HTMLButtonElement>(null);
  const callRef = useRef<HTMLButtonElement>(null);

  // Calculate call amount as difference between current table bet and what the player has already contributed
  const callAmount = currentBet - playerCurrentBet;
  const canCheck = callAmount === 0;
  const handleVoiceCommand = (command: string) => {
    // Clean up the command - remove punctuation and normalize
    const normalized = command
      .toLowerCase()
      .trim()
      .replace(/[.,!?;:]/g, "");

    console.log("Dealer processing voice command:", normalized);

    // Process direct action commands without the "player" prefix
    const action = findBestPokerActionMatch(normalized);

    if (!action) {
      console.log("Unrecognized voice command:", normalized);
      return;
    }

    if (action === "fold") {
      if (foldRef.current) {
        foldRef.current.click();
      }
    } else if (action === "check") {
      if (checkRef.current) {
        checkRef.current.click();
      }
    } else if (action === "call") {
      if (callRef.current) {
        callRef.current.click();
      }
    } else if (action === "raise" || action === "bet") {
      handleBet(extractNumber(normalized) || 0);
    } else {
      console.log("Unrecognized action:", action);
    }
  };

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

  const handleFold = () => {
    if (!isPlayerTurn) return;

    sendGameAction(gameId, {
      playerId: player.id,
      playerName: player.name,
      type: "FOLD",
    });
  };

  const handleCheck = () => {
    if (!isPlayerTurn) return;

    sendGameAction(gameId, {
      playerId: player.id,
      playerName: player.name,
      type: "CHECK",
    });
  };

  const handleCall = () => {
    if (!isPlayerTurn) return;

    sendGameAction(gameId, {
      playerId: player.id,
      playerName: player.name,
      type: "CALL",
      amount: callAmount,
    });
  };

  const handleBet = (amount: number) => {
    if (!isPlayerTurn) return;

    if (amount <= 0 || amount > player.chips) return;

    sendGameAction(gameId, {
      playerId: player.id,
      playerName: player.name,
      type: "BET",
      amount: amount,
    });
  };

  const handleRaise = (amount: number) => {
    if (!isPlayerTurn) return;

    if (amount <= 0) {
      return;
    }
    if (amount + callAmount > player.chips) {
      return;
    }

    sendGameAction(gameId, {
      playerId: player.id,
      playerName: player.name,
      type: "RAISE",
      amount: amount,
    });
  };
  const toggleListening = () => {
    if (isListening) {
      stopListening();
    } else {
      startListening();
    }
  };

  return (
    <div
      className={`p-4 border rounded-md ${!isPlayerTurn ? "opacity-70" : ""}`}
    >
      <div className="flex justify-between items-center mb-3">
        <span className="font-semibold">Actions</span>
        <div className="flex text-sm">
          <span className="mr-4">Current Bet: {currentBet}</span>
          <span className="mr-4">Your Bet: {playerCurrentBet}</span>
          <span>Your Chips: {player.chips}</span>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-2">
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
        <Button
          onClick={handleFold}
          disabled={player.folded || !isPlayerTurn}
          variant="secondary"
          className="bg-zinc-900 hover:bg-zinc-800"
          ref={foldRef}
        >
          Fold
        </Button>

        {canCheck ? (
          <Button
            onClick={handleCheck}
            disabled={player.folded || !isPlayerTurn}
            ref={checkRef}
          >
            Check
          </Button>
        ) : (
          <Button
            onClick={handleCall}
            disabled={
              player.folded || !isPlayerTurn || callAmount > player.chips
            }
            ref={callRef}
          >
            Call ({callAmount})
          </Button>
        )}

        <Button
          onClick={() => setRaiseDialogOpen(true)}
          disabled={
            player.folded ||
            !isPlayerTurn ||
            (currentBet > 0 && callAmount >= player.chips)
          }
          ref={raiseRef}
        >
          {currentBet === 0 ? "Bet" : "Raise"}
        </Button>
      </div>

      <RaiseDialog
        isOpen={raiseDialogOpen}
        onClose={() => setRaiseDialogOpen(false)}
        onRaise={currentBet === 0 ? handleBet : handleRaise}
        currentBet={currentBet}
        pot={pot}
        playerChips={player.chips}
      />
      {recognizedText && (
        <p className="mt-2 text-sm text-center text-muted-foreground">
          Recognized: {recognizedText}
        </p>
      )}
    </div>
  );
}
