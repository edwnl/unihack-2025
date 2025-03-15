// frontend/components/player-actions.tsx
"use client";

import { Button } from "@/components/ui/button";
import { useState } from "react";
import { sendGameAction } from "@/lib/websocket-service";
import { PlayerType } from "@/lib/types";
import RaiseDialog from "@/components/raise-dialog";

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
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [raiseDialogOpen, setRaiseDialogOpen] = useState(false);

  // Calculate call amount as difference between current table bet and what the player has already contributed
  const callAmount = currentBet - playerCurrentBet;
  const canCheck = callAmount === 0;

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
      setErrorMsg("Raise amount must be positive.");
      return;
    }
    if (amount + callAmount > player.chips) {
      setErrorMsg("You cannot raise more than your available chips.");
      return;
    }
    setErrorMsg("");

    sendGameAction(gameId, {
      playerId: player.id,
      playerName: player.name,
      type: "RAISE",
      amount: amount,
    });
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

      <div className="grid grid-cols-3 gap-2">
        <Button
          onClick={handleFold}
          disabled={player.folded || !isPlayerTurn}
          variant="secondary"
          className="bg-zinc-900 hover:bg-zinc-800"
        >
          Fold
        </Button>

        {canCheck ? (
          <Button
            onClick={handleCheck}
            disabled={player.folded || !isPlayerTurn}
          >
            Check
          </Button>
        ) : (
          <Button
            onClick={handleCall}
            disabled={
              player.folded || !isPlayerTurn || callAmount > player.chips
            }
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
    </div>
  );
}
