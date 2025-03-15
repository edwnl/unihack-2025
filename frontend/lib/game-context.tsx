// frontend/lib/game-context.tsx
"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";
import { GameRoomType, UserRoleInfo } from "./types";

type GameContextType = {
  gameRoom: GameRoomType | null;
  setGameRoom: React.Dispatch<React.SetStateAction<GameRoomType | null>>;
  userRole: UserRoleInfo | null;
  setUserRole: React.Dispatch<React.SetStateAction<UserRoleInfo | null>>;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameRoom, setGameRoom] = useState<GameRoomType | null>(null);
  const [userRole, setUserRole] = useState<UserRoleInfo | null>(null);

  return (
    <GameContext.Provider
      value={{
        gameRoom,
        setGameRoom,
        userRole,
        setUserRole,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGameContext = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGameContext must be used within a GameProvider");
  }
  return context;
};