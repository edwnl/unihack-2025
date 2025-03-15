"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function DealerCreatePage() {
  const router = useRouter();
  const { setUserRole, setGameRoom } = useGameContext();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Backend URL with fallback
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  const handleDealerCreate = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(`${backendUrl}/api/game/dealer/create`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      if (!response.ok) {
        throw new Error("Failed to create game room");
      }

      const data = await response.json();
      setGameRoom(data);

      // Set user role with dealer ID
      setUserRole({
        role: "DEALER",
        gameId: data.id,
      });

      router.push(`waiting/${data.id}`);
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
            <CardTitle className="text-center">Create Game as Dealer</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-4">
              <p className="text-center">
                Create a new game room as the dealer.
              </p>
              <Button
                onClick={handleDealerCreate}
                disabled={loading}
                className="w-full"
              >
                {loading ? "Creating..." : "Create Game Room"}
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
      </div>
    </main>
  );
}
