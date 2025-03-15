"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateRandomName } from "@/lib/name-generator";

export default function PlayerJoinPage() {
  const router = useRouter();
  const { userRole, setUserRole, setGameRoom } = useGameContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reconnectInfo, setReconnectInfo] = useState<{gameId: string, playerId: string} | null>(null);

  // Form state for player
  const [name, setName] = useState(generateRandomName());
  const [gameCode, setGameCode] = useState("");
  const [online, setOnline] = useState(true);
  const [visuallyImpaired, setVisuallyImpaired] = useState(false);

  // Backend URL with fallback
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Check for existing player session
  useEffect(() => {
    if (userRole?.role === "PLAYER" && userRole.playerId && userRole.gameId) {
      setReconnectInfo({
        gameId: userRole.gameId,
        playerId: userRole.playerId
      });
      setGameCode(userRole.gameId);
    }
  }, [userRole]);

  const handleReconnect = async () => {
    if (!reconnectInfo) return;
    
    setLoading(true);
    setError(null);

    try {
      // First, check if the game still exists
      const roomResponse = await fetch(`${backendUrl}/api/game/${reconnectInfo.gameId}`);
      if (!roomResponse.ok) {
        throw new Error("Game no longer exists. Please join a new game.");
      }
      
      const room = await roomResponse.json();
      
      // Check if player still exists in the game
      const playerExists = room.players.some((p: any) => p.id === reconnectInfo.playerId);
      
      if (!playerExists) {
        throw new Error("Your player is no longer in this game. Please join as a new player.");
      }
      
      // Set game room state
      setGameRoom(room);
      
      // Navigate to the waiting room or game based on state
      if (room.gameState === "WAITING") {
        router.push(`/poker/waiting/${reconnectInfo.gameId}`);
      } else {
        router.push(`/poker/game/${reconnectInfo.gameId}`);
      }
    } catch (err) {
      setError((err as Error).message);
      setReconnectInfo(null); // Clear reconnect info on failure
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerJoin = async () => {
    if (!name || !gameCode) {
      setError("Name and game code are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/game/player/join`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, gameCode, online, visuallyImpaired }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(errorText || "Failed to join game");
      }

      const player = await response.json();

      // Set user role with player ID and game ID for persistence
      setUserRole({
        role: "PLAYER",
        playerId: player.id,
        gameId: gameCode
      });

      // Get room details
      const roomResponse = await fetch(`${backendUrl}/api/game/${gameCode}`);
      if (roomResponse.ok) {
        const room = await roomResponse.json();
        setGameRoom(room);
      }

      router.push(`/poker/waiting/${gameCode}`);
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <div className="w-full max-w-md">
        {reconnectInfo ? (
          <Card className="w-full mb-4">
            <CardHeader>
              <CardTitle className="text-center">Rejoin Previous Game</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <p>
                  You were previously playing in game: <strong>{reconnectInfo.gameId}</strong>
                </p>
                <Button 
                  onClick={handleReconnect} 
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Reconnecting..." : "Rejoin Game"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => setReconnectInfo(null)}
                  className="w-full"
                >
                  Join as New Player
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="w-full">
            <CardHeader>
              <CardTitle className="text-center">Join Game as Player</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col space-y-4">
                <div className="space-y-2">
                  <label htmlFor="name" className="block text-sm font-medium">
                    Your Name
                  </label>
                  <input
                    id="name"
                    type="text"
                    value={name}
                    maxLength={16}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>

                <div className="space-y-2">
                  <label htmlFor="gameCode" className="block text-sm font-medium">
                    Game Code
                  </label>
                  <input
                    id="gameCode"
                    type="text"
                    value={gameCode}
                    onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                    placeholder="Enter game code"
                    className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm transition-colors file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 md:text-sm"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label htmlFor="online" className="block text-sm font-medium">
                    Joining Online
                  </label>
                  <Switch
                    id="online"
                    checked={online}
                    onCheckedChange={setOnline}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <label
                    htmlFor="visuallyImpaired"
                    className="block text-sm font-medium"
                  >
                    Visually Impaired
                  </label>
                  <Switch
                    id="visuallyImpaired"
                    checked={visuallyImpaired}
                    onCheckedChange={setVisuallyImpaired}
                  />
                </div>

                <Button
                  onClick={handlePlayerJoin}
                  disabled={loading}
                  className="w-full"
                >
                  {loading ? "Joining..." : "Join Game"}
                </Button>
              </div>

              {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

              <Button
                variant="ghost"
                className="w-full mt-4"
                onClick={() => router.push("/poker")}
              >
                Back
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </main>
  );
}