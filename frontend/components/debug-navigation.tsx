// frontend/components/debug-navigation.tsx
"use client";

import { useRouter } from "next/navigation";
import { User, Users } from "lucide-react";

export default function DebugNavigation() {
  const router = useRouter();

  return (
    <div className="fixed top-2 left-2 z-50 flex gap-2 bg-black/30 backdrop-blur-sm p-1 rounded-md">
      <button
        onClick={() => router.push("/poker/dealer")}
        className="text-xs p-1 hover:bg-gray-700 rounded-md"
        title="Go to dealer start"
      >
        <Users size={32} />
      </button>
      <button
        onClick={() => router.push("/poker/player")}
        className="text-xs p-1 hover:bg-gray-700 rounded-md"
        title="Go to player start"
      >
        <User size={32} />
      </button>
    </div>
  );
}
