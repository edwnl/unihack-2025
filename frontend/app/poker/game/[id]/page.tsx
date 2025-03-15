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
  const { gameRoom, setGameRoom, userRole, setUserRole } = useGameContext();
  const [error, setError] = useState<string | null>(null);
  const [isReconnecting, setIsReconnecting] = useState(false);

  // Backend URL
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Handle reconnection if needed
  useEffect(() => {
    // Check if we need to reconnect (if we have a stored role but for this game)
    if (userRole && userRole.gameId === gameId && !isReconnecting) {
      setIsReconnecting(true);
      console.log("Attempting to reconnect with stored role:", userRole);

      // Update the gameId in case it was changed
      setUserRole({
        ...userRole,
        gameId: gameId,
      });
    }
  }, [userRole, gameId, setUserRole, isReconnecting]);

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
    if (!userRole?.role) return;

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
  }, [gameId, setGameRoom, router, userRole]);

  // Fetch initial game state
  useEffect(() => {
    if (!userRole?.role) return;

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

        // If we were reconnecting, mark it as complete
        if (isReconnecting) {
          setIsReconnecting(false);
          console.log("Reconnection successful");
        }
      } catch (err) {
        setError((err as Error).message);
        if (isReconnecting) {
          setIsReconnecting(false);
          console.error("Reconnection failed:", err);
        }
      }
    };

    fetchGameRoom();
  }, [gameId, backendUrl, setGameRoom, router, userRole, isReconnecting]);

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
