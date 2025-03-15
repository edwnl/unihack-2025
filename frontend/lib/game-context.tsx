// frontend/lib/game-context.tsx
// Modify the GameProvider to include a loading state

"use client";

import React, {
  createContext,
  useState,
  useContext,
  ReactNode,
  useEffect,
} from "react";
import { GameRoomType, UserRoleInfo } from "./types";

type GameContextType = {
  gameRoom: GameRoomType | null;
  setGameRoom: React.Dispatch<React.SetStateAction<GameRoomType | null>>;
  userRole: UserRoleInfo | null;
  setUserRole: React.Dispatch<React.SetStateAction<UserRoleInfo | null>>;
  clearUserRole: () => void;
  isLoading: boolean;
};

const STORAGE_KEY = "shuffl-session-data";

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameRoom, setGameRoom] = useState<GameRoomType | null>(null);
  const [userRole, setUserRole] = useState<UserRoleInfo | null>(null);
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  // Load user role from sessionStorage on initial render
  useEffect(() => {
    try {
      const savedUserRole = sessionStorage.getItem(STORAGE_KEY);
      console.log("shuffl-session-data", savedUserRole);
      if (savedUserRole) {
        setUserRole(JSON.parse(savedUserRole));
        console.log("Loaded shuffl-session-data into game provider.");
      }
    } catch (error) {
      console.error("Failed to load user role from sessionStorage:", error);
    } finally {
      setIsLoading(false); // Mark loading as complete
    }
  }, []);

  // Save user role to sessionStorage whenever it changes
  useEffect(() => {
    if (userRole) {
      sessionStorage.setItem(STORAGE_KEY, JSON.stringify(userRole));
    }
  }, [userRole]);

  // Function to clear user role from sessionStorage
  const clearUserRole = () => {
    console.log("Clearing saved user role");
    sessionStorage.removeItem(STORAGE_KEY);
    setUserRole(null);
  };

  return (
    <GameContext.Provider
      value={{
        gameRoom,
        setGameRoom,
        userRole,
        setUserRole,
        clearUserRole,
        isLoading,
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
