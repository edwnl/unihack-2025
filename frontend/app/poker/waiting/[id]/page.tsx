// frontend/app/poker/waiting/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useGameContext } from "@/lib/game-context";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket-service";
import { generateRandomName } from "@/lib/name-generator";
import { toast } from "sonner";

export default function WaitingRoomPage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { gameRoom, setGameRoom, userRole, clearUserRole, isLoading } =
    useGameContext();
  const [error, setError] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);

  // Backend URL
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Connect to WebSocket
  useEffect(() => {
    if (isLoading) return; // Wait until session loading is complete

    connectWebSocket(gameId, (updatedRoom) => {
      setGameRoom(updatedRoom);

      // Check if player is still in the room
      if (userRole?.role === "PLAYER") {
        const isPlayerInRoom = updatedRoom.players.some(
          (player) => player.id === userRole.playerId,
        );

        if (!isPlayerInRoom) {
          // Player has been kicked
          toast.error("You have been removed from the game");
          clearUserRole(); // do not add this to the dependency array
          router.push("/poker");
          return;
        }
      }

      // If the game is no longer WAITING, we decide where to redirect
      if (updatedRoom.gameState !== "WAITING") {
        // If disbanded or ended, go back to /poker
        if (
          updatedRoom.gameState === "ENDED" ||
          updatedRoom.gameState === "DISBANDED"
        ) {
          router.push("/poker");
          clearUserRole();
        } else {
          toast("Starting game...");
          router.push(`/poker/game/${gameId}`);
        }
      }
    });

    return () => {
      disconnectWebSocket();
    };

    // disabling this as adding clearUserRole causes spam websocket connections
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameId, setGameRoom, userRole, router, isLoading]);

  // Check if user has access to this room and the room exists
  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!userRole?.role) {
      toast("You are no longer in the waiting room.");
      router.push("/poker");
      return;
    }

    // Fetch the latest game state to verify the game still exists
    fetch(`${backendUrl}/api/game/${gameId}`)
      .then((response) => {
        if (!response.ok) {
          clearUserRole();
          toast("That room no longer exists!");
          throw new Error("Game no longer exists");
        }
        return response.json();
      })
      .catch((error) => {
        console.error("Error connecting to room:", error);
        router.push("/poker");
      });
  }, [
    isLoading,
    userRole,
    gameId,
    router,
    setGameRoom,
    clearUserRole,
    backendUrl,
  ]);

  const handleAddFakePlayer = async () => {
    try {
      // Generate a fake player's name
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
      toast.error("Failed to add fake player");
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
      toast.error("Failed to start game");
    }
  };

  const copyGameCode = () => {
    navigator.clipboard.writeText(gameId);
    setIsCopied(true);
    toast.success("Game code copied to clipboard!");
    setTimeout(() => setIsCopied(false), 2000);
  };

  // Function to handle leaving/disbanding the game
  const handleLeaveGame = async () => {
    try {
      let response;
      if (userRole?.role === "DEALER") {
        // If dealer leaves, disband the room (kick all players)
        response = await fetch(`${backendUrl}/api/game/${gameId}/disband`, {
          method: "POST",
        });
      } else {
        response = await fetch(
          `${backendUrl}/api/game/${gameId}/leave?playerId=${userRole?.playerId}`,
          { method: "POST" },
        );
      }
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          errorText ||
            (userRole?.role === "DEALER"
              ? "Failed to disband game"
              : "Failed to leave game"),
        );
      }
      clearUserRole();
      router.push("/poker");
    } catch (err) {
      setError((err as Error).message);
      toast.error("Failed to leave game");
    }
  };

  // Add a loading indicator for when the context is still initializing
  if (isLoading) {
    return <p className="text-center p-8">Loading session data...</p>;
  }

  if (!gameRoom) return <p className="text-center p-8">Loading room data...</p>;

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
                    {isCopied ? "Copied!" : "Copy Code"}
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
                        <div className="flex items-center gap-2">
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
                          {/* For dealer: add Kick button for other players */}
                          {userRole?.role === "DEALER" &&
                            player.id !== userRole?.playerId && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={async () => {
                                  try {
                                    const kickResponse = await fetch(
                                      `${backendUrl}/api/game/${gameId}/leave?playerId=${player.id}`,
                                      { method: "POST" },
                                    );
                                    if (!kickResponse.ok) {
                                      const errorText =
                                        await kickResponse.text();
                                      throw new Error(
                                        errorText || "Failed to kick player",
                                      );
                                    }
                                  } catch (err) {
                                    setError((err as Error).message);
                                    toast.error("Failed to kick player");
                                  }
                                }}
                              >
                                Kick
                              </Button>
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

              {/* Render error message if an error occurs */}
              {error && (
                <p className="text-red-500 text-center mt-4">{error}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <div className="text-center">
          <Button variant="ghost" onClick={handleLeaveGame}>
            {userRole?.role === "DEALER" ? "Disband Room" : "Leave Game"}
          </Button>
        </div>
      </div>
    </main>
  );
}
