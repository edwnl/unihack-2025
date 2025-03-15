import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function getPokerPosition(
  playerIndex: number,
  playerCount: number,
  smallBlindPosition: number,
): string {
  if (playerCount < 3) return "";

  // Calculate button position (one position before SB)
  const buttonPos = (smallBlindPosition - 1 + playerCount) % playerCount;

  if (playerIndex === buttonPos) return "BTN";
  if (playerIndex === smallBlindPosition) return "SB";
  if (playerIndex === (smallBlindPosition + 1) % playerCount) return "BB";

  // Calculate position relative to button
  const positionFromButton =
    (playerIndex - buttonPos + playerCount) % playerCount;

  switch (positionFromButton) {
    case 0:
      return "BTN";
    case 1:
      return "SB";
    case 2:
      return "BB";
    case 3:
      return "UTG";
    case playerCount - 1:
      return "CO"; // Cutoff
    case playerCount - 2:
      return playerCount > 4 ? "HJ" : "UTG"; // Hijack
    default:
      return "MP"; // Middle position
  }
}
