// frontend/app/game/[id]/page.tsx
"use client";

import { useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { connectWebSocket, disconnectWebSocket } from "@/lib/websocket-service";
import DealerView from "@/components/dealer-view";
import PlayerView from "@/components/player-view";
import { toast } from "sonner";

export default function GamePage() {
  const params = useParams();
  const router = useRouter();
  const gameId = params.id as string;
  const { gameRoom, setGameRoom, userRole, clearUserRole, isLoading } =
    useGameContext();
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Connect to WebSocket
  useEffect(() => {
    if (isLoading) return;

    connectWebSocket(gameId, (updatedRoom) => {
      setGameRoom(updatedRoom);

      // If game returns to waiting state, redirect back to waiting room
      if (updatedRoom.gameState === "WAITING") {
        router.push(`/poker/waiting/${gameId}`);
        toast(`This game is already started!`);
      } else {
        if (userRole?.role) toast(`Connected to room ${gameId} via websocket!`);
      }
    });

    return () => {
      disconnectWebSocket();
    };
  }, [gameId, setGameRoom, router, isLoading, userRole?.role]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    if (!userRole?.role) {
      toast("You don't have access to this game!");
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
        console.error("Error reconnecting:", error);
        router.push("/poker");
      });
  }, [
    isLoading,
    userRole?.role,
    gameId,
    router,
    setGameRoom,
    clearUserRole,
    backendUrl,
  ]);

  // Add a loading indicator for when the context is still initializing
  if (isLoading) {
    return <p className="text-center p-8">Loading session data...</p>;
  }

  if (!gameRoom) return <p className="text-center p-8">Loading...</p>;

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
