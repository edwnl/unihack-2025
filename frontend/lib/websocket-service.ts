// frontend/lib/websocket-service.ts
import { Client } from "@stomp/stompjs";
import { GameActionType, GameRoomType } from "./types";

let stompClient: Client | null = null;

export const connectWebSocket = (
  gameId: string,
  onGameUpdate: (gameRoom: GameRoomType) => void,
) => {
  if (stompClient) {
    disconnectWebSocket();
  }

  // Get the backend URL from environment variables with fallback
  const backendUrl =
    process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:8080";

  // Determine if we need to use wss:// or ws:// based on the current protocol
  const wsProtocol = window.location.protocol === "https:" ? "wss://" : "ws://";
  const baseUrl = backendUrl.replace(/^https?:\/\//, "");

  stompClient = new Client({
    brokerURL: `${wsProtocol}${baseUrl}/ws-poker`,
    connectHeaders: {},
    reconnectDelay: 5000,
    heartbeatIncoming: 4000,
    heartbeatOutgoing: 4000,
  });

  stompClient.onConnect = () => {
    console.log("Connected to WebSocket");

    // Ensure stompClient is not null
    if (!stompClient) return;

    // Subscribe to game updates
    stompClient.subscribe(`/topic/game/${gameId}`, (message) => {
      try {
        const gameRoom = JSON.parse(message.body) as GameRoomType;
        onGameUpdate(gameRoom);
        console.log("Game Updated");
        console.log(gameRoom);
      } catch (err) {
        console.error("Error parsing game update", err);
      }
    });

    // Join the game
    stompClient.publish({
      destination: `/app/game/${gameId}/join`,
      body: JSON.stringify({}),
    });
  };

  stompClient.onStompError = (frame) => {
    console.error("STOMP error", frame);
  };

  stompClient.activate();
};

export const disconnectWebSocket = () => {
  if (stompClient) {
    if (stompClient.connected) {
      stompClient.deactivate();
    }
    stompClient = null;
  }
};

export const sendGameAction = (gameId: string, action: GameActionType) => {
  if (!stompClient || !stompClient.connected) {
    console.error("WebSocket not connected");
    return;
  }

  stompClient.publish({
    destination: `/app/game/${gameId}/action`,
    body: JSON.stringify(action),
  });
};
