"use client";

import React, { createContext, useState, useContext, ReactNode, useEffect } from "react";
import { GameRoomType, UserRole } from "./types";

type UserRoleState = {
  role: UserRole | null;
  playerId?: string;
  gameId?: string; // Add gameId to track which game the user was in
} | null;

type GameContextType = {
  gameRoom: GameRoomType | null;
  setGameRoom: React.Dispatch<React.SetStateAction<GameRoomType | null>>;
  userRole: UserRoleState;
  setUserRole: (role: UserRoleState) => void;
  clearUserRole: () => void;
};

const STORAGE_KEY = "poker_user_role";

const GameContext = createContext<GameContextType | undefined>(undefined);

export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [gameRoom, setGameRoom] = useState<GameRoomType | null>(null);
  const [userRole, setUserRoleState] = useState<UserRoleState>(null);
  
  // Load user role from local storage on initial mount
  useEffect(() => {
    try {
      const savedUserRole = localStorage.getItem(STORAGE_KEY);
      if (savedUserRole) {
        const parsedRole = JSON.parse(savedUserRole) as UserRoleState;
        setUserRoleState(parsedRole);
        console.log("Loaded user role from storage:", parsedRole);
      }
    } catch (error) {
      console.error("Error loading user role from storage:", error);
    }
  }, []);

  // Set user role in state and persist to local storage
  const setUserRole = (role: UserRoleState) => {
    setUserRoleState(role);
    try {
      if (role) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(role));
        console.log("Saved user role to storage:", role);
      } else {
        localStorage.removeItem(STORAGE_KEY);
        console.log("Removed user role from storage");
      }
    } catch (error) {
      console.error("Error saving user role to storage:", error);
    }
  };

  // Clear user role from state and local storage
  const clearUserRole = () => {
    setUserRoleState(null);
    try {
      localStorage.removeItem(STORAGE_KEY);
      console.log("Cleared user role from storage");
    } catch (error) {
      console.error("Error clearing user role from storage:", error);
    }
  };

  return (
    <GameContext.Provider
      value={{
        gameRoom,
        setGameRoom,
        userRole,
        setUserRole,
        clearUserRole,
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