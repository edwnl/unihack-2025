// frontend/app/waiting/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameContext } from "@/lib/game-context";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket-service";
import { generateRandomName } from "@/lib/name-generator";

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { gameRoom, setGameRoom, userRole } = useGameContext();
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Backend URL
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Connect to WebSocket
  useEffect(() => {
    connectWebSocket(gameId, (updatedRoom) => {
      setGameRoom(updatedRoom);

      // If game has started, redirect to game page
      if (updatedRoom.gameState !== "WAITING") {
        router.push(`/poker/game/${gameId}`);
      }
    });

    return () => {
      disconnectWebSocket();
    };
  }, [gameId, setGameRoom, userRole, router]);

  // Fetch initial game state
  useEffect(() => {
    const fetchGameRoom = async () => {
      try {
        const response = await fetch(`${backendUrl}/api/game/${gameId}`);
        if (!response.ok) {
          throw new Error("Game room not found");
        }
        const data = await response.json();
        setGameRoom(data);

        // Check if game has already started
        if (data.gameState !== "WAITING") {
          router.push(`/poker/game/${gameId}`);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchGameRoom();
  }, [gameId, backendUrl, setGameRoom, userRole, router]);

  const handleAddFakePlayer = async () => {
    try {
      // Prompt the dealer for the fake player's name
      const fakeName = generateRandomName();

      const response = await fetch(
        `${backendUrl}/api/game/dealer/add-fake-player`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: fakeName, gameCode: gameId }),
        },
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to add fake player");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const handleStartGame = async () => {
    try {
      const response = await fetch(`${backendUrl}/api/game/${gameId}/start`, {
        method: "POST",
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to start game");
      }
    } catch (err) {
      setError((err as Error).message);
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  if (!gameRoom) return <p className="text-center p-8">Loading...</p>;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      <div className="w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Waiting Room</h1>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              <div className="flex flex-col">
                <span>Game Code:</span>
                <div className="flex items-center space-x-2">
                  <span className="text-xl font-mono">{gameId}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={copyGameCode}
                    className="h-6 px-2"
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </Button>
                </div>
              </div>
              <span className="text-sm font-normal bg-secondary px-3 py-1 rounded">
                {gameRoom.gameState}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Players ({gameRoom.players.length}/5):
                </h3>
                {gameRoom.players.length === 0 ? (
                  <p>No players have joined yet.</p>
                ) : (
                  <ul className="divide-y">
                    {gameRoom.players.map((player) => (
                      <li
                        key={player.id}
                        className="flex items-center justify-between py-2"
                      >
                        <span>{player.name}</span>
                        <div className="flex gap-2">
                          {player.online && (
                            <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                              Online
                            </span>
                          )}
                          {player.visuallyImpaired && (
                            <span className="text-xs bg-primary/20 px-2 py-1 rounded">
                              Visually Impaired
                            </span>
                          )}
                        </div>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {userRole?.role === "DEALER" && (
                <div className="mt-4">
                  <Button
                    onClick={handleAddFakePlayer}
                    variant="outline"
                    className="w-full mb-4"
                    disabled={gameRoom.players.length >= 5}
                  >
                    Add Fake Player
                  </Button>
                  <Button
                    onClick={handleStartGame}
                    disabled={gameRoom.players.length < 3}
                    className="w-full"
                  >
                    Start Game
                  </Button>
                  {gameRoom.players.length < 3 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      At least 3 players are required to start the game.
                    </p>
                  )}
                  {gameRoom.players.length >= 5 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      Maximum player limit reached (5).
                    </p>
                  )}
                </div>
              )}

              {userRole?.role === "PLAYER" && (
                <p className="text-center py-2">
                  Waiting for the dealer to start the game...
                </p>
              )}

              {error && (
                <p className="text-red-500 text-center mt-4">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={() => router.push("/poker")}>
            Leave Game
          </Button>
        </div>
      </div>
    </main>
  );
}
