"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function PlayerJoinPage() {
  const router = useRouter();
  const { setUserRole } = useGameContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

    // player states
  const [name, setName] = useState("");
  const [gameCode, setGameCode] = useState("");
  const [online, setOnline] = useState(true);
  const [visuallyImpaired, setVisuallyImpaired] = useState(false);

  const handlePlayerJoin = async () => {
    if (!name || !gameCode) {
      setError("Name and game code are required");
      return;
    }

    setLoading(true);
    setError(null);

    try {
        // temp 
      setUserRole({
        role: "PLAYER",
        playerId: "temp-player-id",
      });

      // home 
      router.push("/");
      
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
                <Label htmlFor="name">Your Name</Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="gameCode">Game Code</Label>
                <Input
                  id="gameCode"
                  value={gameCode}
                  onChange={(e) => setGameCode(e.target.value.toUpperCase())}
                  placeholder="Enter game code"
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="online">Joining Online</Label>
                <Switch
                  id="online"
                  checked={online}
                  onCheckedChange={setOnline}
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="visuallyImpaired">Visually Impaired</Label>
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
              onClick={() => router.push("/start")}
            >
              Back
            </Button>
          </CardContent>
        </Card>
      </div>
    </main>
  );
}