// frontend/app/game/[id]/page.tsx
"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket-service";
import DealerView from "@/components/dealer-view";
import PlayerView from "@/components/player-view";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { gameRoom, setGameRoom, userRole } = useGameContext();
  const [error, setError] = useState<string | null>(null);

  // Backend URL
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Redirect if role is not set or if game hasn't started
  useEffect(() => {
    if (!userRole?.role) {
      console.log("userRole is missing: ", userRole);
      router.push("/");
      return;
    }

    if (gameRoom && gameRoom.gameState === "WAITING") {
      router.push(`/waiting/${gameId}`);
    }
  }, [userRole, router, gameRoom, gameId]);

  // Connect to WebSocket
  useEffect(() => {
    connectWebSocket(gameId, (updatedRoom) => {
      setGameRoom(updatedRoom);

      // If game returns to waiting state, redirect back to waiting room
      if (updatedRoom.gameState === "WAITING") {
        router.push(`/waiting/${gameId}`);
      }
    });

    return () => {
      disconnectWebSocket();
    };
  }, [gameId, setGameRoom, router]);

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

        // If game is in waiting state, redirect to waiting room
        if (data.gameState === "WAITING") {
          router.push(`/waiting/${gameId}`);
        }
      } catch (err) {
        setError((err as Error).message);
      }
    };

    fetchGameRoom();
  }, [gameId, backendUrl, setGameRoom, router]);

  if (!gameRoom) return <p className="text-center p-8">Loading...</p>;
  if (error) return <p className="text-center text-red-500 p-8">{error}</p>;

  return (
    <main className="flex min-h-screen flex-col items-center p-4 md:p-8">
      {userRole?.role === "PLAYER" ? (
        <PlayerView gameId={gameId} />
      ) : (
        <DealerView gameId={gameId} />
      )}
    </main>
  );
}
