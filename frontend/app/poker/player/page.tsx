// frontend/app/start/player/page.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { generateRandomName } from "@/lib/name-generator";

export default function PlayerJoinPage() {
  const router = useRouter();
  const { setUserRole, setGameRoom } = useGameContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state for player
  const [name, setName] = useState(generateRandomName());
  const [gameCode, setGameCode] = useState("");
  const [online, setOnline] = useState(true);
  const [visuallyImpaired, setVisuallyImpaired] = useState(false);
  const [screenReader, setScreenReader] = useState(false);

  // Backend URL with fallback
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

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

      // Store screenReader flag along with the player role info.
      setUserRole({
        role: "PLAYER",
        playerId: player.id,
        screenReader, 
      });

      // Get room details and store in game context.
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
                <Switch id="online" checked={online} onCheckedChange={setOnline} />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="visuallyImpaired" className="block text-sm font-medium">
                  Visually Impaired
                </label>
                <Switch
                  id="visuallyImpaired"
                  checked={visuallyImpaired}
                  onCheckedChange={setVisuallyImpaired}
                />
              </div>

              <div className="flex items-center justify-between">
                <label htmlFor="screenReader" className="block text-sm font-medium">
                  Screen Reader
                </label>
                <Switch
                  id="screenReader"
                  checked={screenReader}
                  onCheckedChange={setScreenReader}
                />
              </div>

              <Button onClick={handlePlayerJoin} disabled={loading} className="w-full">
                {loading ? "Joining..." : "Join Game"}
              </Button>
            </div>

            {error && <p className="text-red-500 mt-4 text-center">{error}</p>}

            <Button variant="ghost" className="w-full mt-4" onClick={() => router.push("/poker")}>
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}
