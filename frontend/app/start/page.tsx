"use client";

import { useRouter } from "next/navigation";
import { useGameContext } from "@/lib/game-context";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function StartPage() {
  const router = useRouter();
  const { setUserRole } = useGameContext();

  const handleRoleSelect = (role: "PLAYER" | "DEALER") => {
    setUserRole({
      role: role,
      playerId: undefined,
    });

    if (role === "PLAYER") {
      router.push("/start/player");
    } else {
      router.push("/start/dealer");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <Button
        variant="ghost"
        className="absolute top-4 left-4"
        onClick={() => router.push("/")}
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </Button>

      <div className="w-full max-w-md">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6">
            Ready to play? 🃏
          </h1>

          <div className="space-y-4">
            <button
              onClick={() => handleRoleSelect("PLAYER")}
              className="w-full py-3 bg-gray-100 text-black font-bold rounded-lg shadow-md hover:bg-gray-200 text-center cursor-pointer"
            >
              Join a Game - Player
            </button>

            <button
              onClick={() => handleRoleSelect("DEALER")}
              className="w-full py-3 bg-gray-100 text-black font-bold rounded-lg shadow-md hover:bg-gray-200 text-center cursor-pointer"
            >
              Create a Lobby - Dealer
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
