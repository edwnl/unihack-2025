// frontend/components/raise-dialog.tsx
"use client";

import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";

interface RaiseDialogProps {
  isOpen: boolean;
  onClose: () => void;
  onRaise: (amount: number) => void;
  currentBet: number;
  pot: number;
  playerChips: number;
}

export default function RaiseDialog({
  isOpen,
  onClose,
  onRaise,
  pot,
  playerChips,
}: RaiseDialogProps) {
  const [customAmount, setCustomAmount] = useState<number>(0);
  const inputRef = useRef<HTMLInputElement>(null);

  const thirdPot = Math.floor(pot * 0.33);
  const halfPot = Math.floor(pot * 0.5);
  const fullPot = pot;

  const handleRaiseOption = (amount: number) => {
    onRaise(amount);
    onClose();
  };

  const handleCustomRaise = () => {
    if (customAmount > 0 && customAmount <= playerChips) {
      onRaise(customAmount);
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={"max-w-xs rounded-lg top-1/4"}>
        <DialogHeader>
          <DialogTitle>Select Raise Amount</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-2 gap-2 py-4">
          <Button
            onClick={() => handleRaiseOption(thirdPot)}
            disabled={thirdPot > playerChips}
          >
            33% Pot ({thirdPot})
          </Button>

          <Button
            onClick={() => handleRaiseOption(halfPot)}
            disabled={halfPot > playerChips}
          >
            50% Pot ({halfPot})
          </Button>

          <Button
            onClick={() => handleRaiseOption(fullPot)}
            disabled={fullPot > playerChips}
          >
            100% Pot ({fullPot})
          </Button>

          <Button
            onClick={() => handleRaiseOption(playerChips)}
            variant="secondary"
          >
            All In ({playerChips})
          </Button>
        </div>

        <div className="flex gap-2">
          <Input
            ref={inputRef}
            type="number"
            min={1}
            max={playerChips}
            value={customAmount}
            onChange={(e) => setCustomAmount(Number(e.target.value))}
            placeholder="Custom amount"
            className="w-full"
          />
          <Button
            onClick={handleCustomRaise}
            disabled={customAmount <= 0 || customAmount > playerChips}
          >
            Raise
          </Button>
        </div>

        <DialogFooter>
          <Button onClick={onClose} variant="outline">
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
