// frontend/app/start/page.tsx
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
      router.push("poker/player");
    } else {
      router.push("poker/dealer");
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <Button
        variant="ghost"
        className="absolute top-4 left-4"
        onClick={() => router.push("/")}
        aria-label="Go back to home page"
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </Button>

      <div className="w-full max-w-md ">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-center mb-6" id="page-heading">
            Ready to play? 🃏
          </h1>
          <div
            className="space-y-4"
            role="group"
            aria-labelledby="page-heading"
          >
            <button
              onClick={() => handleRoleSelect("PLAYER")}
              className="group block w-full py-3 bg-gray-100 text-black font-bold rounded-lg shadow-md hover:bg-yellow-500 transition duration-300 text-center relative overflow-hidden cursor-pointer"
              aria-label="Join a game as a player"
            >
              <div className="relative w-full inline-flex justify-center items-center">
                <span className="inline-block mr-0 group-hover:mr-2 transition-all duration-300 align-middle">
                  Join a Game
                </span>
                <span className="inline-block w-0 whitespace-nowrap overflow-hidden group-hover:w-auto transition-all duration-300 align-middle">
                  &gt; Player
                </span>
              </div>
            </button>
            <button
              onClick={() => handleRoleSelect("DEALER")}
              className="group block w-full py-3 bg-gray-100 text-black font-bold rounded-lg shadow-md hover:bg-yellow-500 transition duration-300 text-center relative overflow-hidden cursor-pointer"
              aria-label="Create a lobby as a dealer"
            >
              <div className="relative w-full inline-flex justify-center items-center">
                <span className="inline-block mr-0 group-hover:mr-2 transition-all duration-300 align-middle">
                  Create a Lobby
                </span>
                <span className="inline-block w-0 whitespace-nowrap overflow-hidden group-hover:w-auto transition-all duration-300 align-middle">
                  &gt; Dealer
                </span>
              </div>
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
