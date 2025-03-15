// frontend/components/game-actions.tsx
"use client";

import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { GameActionType } from "@/lib/types";
import { useEffect, useRef } from "react";

interface GameActionsProps {
  actions: GameActionType[];
}

export default function GameActions({ actions = [] }: GameActionsProps) {
  // Reference to the content div for scrolling
  const contentRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to the bottom when new actions come in
  useEffect(() => {
    if (contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight;
    }
  }, [actions]);

  // Sort actions chronologically
  const sortedActions = [...actions].sort((a, b) => {
    if (!a.timestamp && !b.timestamp) return 0;
    if (!a.timestamp) return -1;
    if (!b.timestamp) return 1;
    return new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime();
  });

  const formatAction = (action: GameActionType) => {
    switch (action.type) {
      case "JOIN":
        return `${action.playerName} joined the game`;
      case "LEAVE":
        return `${action.playerName} left the game`;
      case "CHECK":
        return `${action.playerName} checks`;
      case "BET":
        return `${action.playerName} bets ${action.amount} chips`;
      case "CALL":
        return `${action.playerName} calls ${action.amount} chips`;
      case "RAISE":
        return `${action.playerName} raises ${action.amount} chips`;
      case "FOLD":
        return `${action.playerName} folds`;
      case "SCAN_CARD":
        return `Card scanned: ${action.card?.rank} of ${action.card?.suit}`;
      case "DEAL_CARDS":
        return `Cards are being dealt`;
      case "START_HAND":
        return `New hand started`;
      case "SMALL_BLIND":
        return `${action.playerName} posts small blind of ${action.amount}`;
      case "BIG_BLIND":
        return `${action.playerName} posts big blind of ${action.amount}`;
      case "LOG":
        return `${action.message || "Game log message"}`;
      default:
        return `Unknown action: ${action.type}`;
    }
  };

  const formatTime = (timestamp: string) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  };

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="flex justify-between items-center">
          <span>Game Actions</span>
          <span className="text-xs text-muted-foreground">
            {sortedActions.length} actions
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent
        className="max-h-80 overflow-y-auto px-4 py-2"
        ref={contentRef}
      >
        {sortedActions.length === 0 ? (
          <p className="text-center text-muted-foreground">No actions yet</p>
        ) : (
          <ul className="space-y-1 text-sm">
            {sortedActions.map((action, index) => (
              <li
                key={index}
                className={`pb-1 ${action.type === "LOG" ? "text-muted-foreground text-xs" : ""}`}
              >
                <span className="text-xs text-muted-foreground mr-2 inline-block w-20">
                  {action.timestamp ? formatTime(action.timestamp) : ""}
                </span>
                {formatAction(action)}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
