"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

export default function GameSelectionPage() {
  const router = useRouter();

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

      <h1 className="text-3xl font-bold text-center mb-12">Select a Game</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-5xl">
        {/* poker card */}
        <Link href="/poker" className="block w-full h-full">
          <div className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-blue-900 flex flex-col items-center justify-center hover:opacity-90 transition-opacity">
            <span className="text-6xl mb-4">🂡</span>
            <h3 className="text-xl font-bold text-white">Poker</h3>
            <p className="text-sm text-white/80">Texas Hold&apos;em</p>
          </div>
        </Link>

        {/* coming soon cards */}
        {[1, 2].map((index) => (
          <div
            key={index}
            className="w-full aspect-[3/4] rounded-xl overflow-hidden shadow-lg bg-black flex flex-col items-center justify-center"
          >
            <h3 className="text-xl font-bold text-white">Coming Soon</h3>
            <p className="text-sm text-white/80 mt-2">
              New game under development
            </p>
          </div>
        ))}
      </div>
    </main>
  );
}
