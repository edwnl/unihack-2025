"use client";

import React, { createContext, useState, useContext, ReactNode } from "react";
import { UserRole } from "./types";

type GameContextType = {
  userRole: {
    role: UserRole | null;
    playerId?: string;
  } | null;
  setUserRole: React.Dispatch<
    React.SetStateAction<{
      role: UserRole | null;
      playerId?: string;
    } | null>
  >;
};

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  // User role state (PLAYER or DEALER)
  const [userRole, setUserRole] = useState<{
    role: UserRole | null;
    playerId?: string;
  } | null>(null);

  return (
    <GameContext.Provider
      value={{
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
