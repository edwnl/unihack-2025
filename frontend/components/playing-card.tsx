// frontend/components/playing-card.tsx
"use client";

import { CardType } from "@/lib/types";

interface PlayingCardProps {
  card?: CardType;
  hidden?: boolean;
  faceDown?: boolean;
}

export default function PlayingCard({
  card,
  hidden = false,
  faceDown = false,
}: PlayingCardProps) {
  // If card is hidden or not provided
  if (hidden || !card) {
    return (
      <div className="border w-14 h-20 rounded-lg flex items-center justify-center bg-primary/20"></div>
    );
  }

  // If card should be shown face down
  if (faceDown) {
    return (
      <div className="border w-14 h-20 rounded-lg flex items-center justify-center bg-secondary/40"></div>
    );
  }

  // Determine color based on suit
  const isRed = card.suit === "HEARTS" || card.suit === "DIAMONDS";

  // Get readable rank name
  const getRankDisplay = (rank: string) => {
    switch (rank) {
      case "ACE":
        return "A";
      case "KING":
        return "K";
      case "QUEEN":
        return "Q";
      case "JACK":
        return "J";
      case "TEN":
        return "10";
      case "NINE":
        return "9";
      case "EIGHT":
        return "8";
      case "SEVEN":
        return "7";
      case "SIX":
        return "6";
      case "FIVE":
        return "5";
      case "FOUR":
        return "4";
      case "THREE":
        return "3";
      case "TWO":
        return "2";
      default:
        return "?";
    }
  };

  // Get suit symbol
  const getSuitSymbol = (suit: string) => {
    switch (suit) {
      case "HEARTS":
        return "♥";
      case "DIAMONDS":
        return "♦";
      case "CLUBS":
        return "♣";
      case "SPADES":
        return "♠";
      default:
        return "";
    }
  };

  return (
    <div
      className={`border w-14 h-20 rounded-lg flex flex-col justify-between py-2 px-3 bg-white ${isRed ? "text-red-500" : "text-black"}`}
    >
      <div className={"text-2xl"}>{getRankDisplay(card.rank)}</div>
      <div className={"text-2xl"}>{getSuitSymbol(card.suit)}</div>
    </div>
  );
}
