// frontend/components/session-recovery-toast.tsx
"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { useGameContext } from "@/lib/game-context";

export function SessionRecoveryToast() {
  const router = useRouter();
  const { userRole, clearUserRole } = useGameContext();
  const [shown, setShown] = useState(false);

  useEffect(() => {
    // Only show once per session and only if we have a user role
    if (!shown && userRole?.role) {
      setShown(true);

      // Check if we're already in a game page - if so, don't show the toast
      const isGamePage =
        window.location.pathname.includes("/poker/game/") ||
        window.location.pathname.includes("/poker/waiting/");

      if (!isGamePage) {
        // Get game ID from userRole if available
        const gameId = userRole?.gameId;

        if (gameId) {
          toast("Ongoing Game Session", {
            description: `You have an ongoing poker game session in room ${gameId}.`,
            duration: 10000,
            action: {
              label: "Rejoin",
              onClick: () => {
                const route =
                  userRole.role === "DEALER"
                    ? `/poker/waiting/${gameId}`
                    : `/poker/game/${gameId}`;
                router.push(route);
              },
            },
            cancel: {
              label: "Clear Session",
              onClick: () => {
                clearUserRole();
                toast("Session data cleared!");
              },
            },
          });
        }
      }
    }
  }, [userRole, router, clearUserRole, shown]);

  return null; // This component doesn't render anything itself
}
