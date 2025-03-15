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
      // player details page
      router.push("/pick-game/start/player");
    } else {
      // dealer -> waiting room
      const mockGameCode = Math.random()
        .toString(36)
        .substring(2, 8)
        .toUpperCase();
      router.push(`/pick-game/waiting/${mockGameCode}`);
    }
  };

  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-4 md:p-8">
      <Button
        variant="ghost"
        className="absolute top-4 left-4"
        onClick={() => router.push("/pick-game")}
      >
        <ArrowLeft className="w-5 h-5 mr-1" />
        Back
      </Button>

      <div className="w-full max-w-md">
        <div className="max-w-md w-full">
          <h1 className="text-3xl font-bold text-center text-b mb-6">
            Ready to play? 🃏
          </h1>
          <div className="space-y-4">
            <div
              onClick={() => handleRoleSelect("PLAYER")}
              className="group block w-full py-3 bg-gray-100 text-black font-bold rounded-lg shadow-md hover:bg-[#ffe330] transition duration-300 text-center relative overflow-hidden cursor-pointer"
            >
              <div className="relative w-full inline-flex justify-center items-center">
                <span className="inline-block mr-0 group-hover:mr-2 transition-all duration-300 align-middle">
                  Join a Game
                </span>
                <span className="inline-block w-0 whitespace-nowrap overflow-hidden group-hover:w-auto transition-all duration-300 align-middle">
                  &gt; Player
                </span>
              </div>
            </div>
            <div
              onClick={() => handleRoleSelect("DEALER")}
              className="group block w-full py-3 bg-gray-100 text-black font-bold rounded-lg shadow-md hover:bg-[#ffe330] transition duration-300 text-center relative overflow-hidden cursor-pointer"
            >
              <div className="relative w-full inline-flex justify-center items-center">
                <span className="inline-block mr-0 group-hover:mr-2 transition-all duration-300 align-middle">
                  Create a Lobby
                </span>
                <span className="inline-block w-0 whitespace-nowrap overflow-hidden group-hover:w-auto transition-all duration-300 align-middle">
                  &gt; Dealer
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
