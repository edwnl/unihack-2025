"use client";

import { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameContext } from "@/lib/game-context";

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const [error] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const { userRole } = useGameContext();

  // mock up to test
  const mockPlayers = [
    { id: "1", name: "Player 1", online: true, visuallyImpaired: false },
    { id: "2", name: "Player 2", online: true, visuallyImpaired: true },
  ];

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameId);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleStartGame = () => {
    // router.push(`/pick-game/game/${gameId}`); WHEN game file implementation is added
    router.push("/");
  };

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
                WAITING
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">
                  Players ({mockPlayers.length}/5):
                </h3>
                {mockPlayers.length === 0 ? (
                  <p>No players have joined yet.</p>
                ) : (
                  <ul className="divide-y">
                    {mockPlayers.map((player) => (
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
                    onClick={handleStartGame}
                    disabled={mockPlayers.length < 2}
                    className="w-full"
                  >
                    Start Game
                  </Button>
                  {mockPlayers.length < 2 && (
                    <p className="text-sm text-muted-foreground mt-2 text-center">
                      At least 2 players are required to start the game.
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
          <Button variant="ghost" onClick={() => router.push("/")}>
            Leave Game
          </Button>
        </div>
      </div>
    </main>
  );
}
