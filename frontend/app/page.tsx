"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";
import { useRouter } from "next/navigation";

export default function Home() {
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // Prevent hydration errors with animations
  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start pt-16 md:pt-24 lg:justify-center relative overflow-hidden px-4">
      {/* Play Now Button */}
      <div className="absolute top-5 right-5 z-10">
        <motion.button
          onClick={() => router.push("/pick-game")}
          className="bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded-full shadow-lg text-sm md:text-base"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Play Now
        </motion.button>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center w-full">
        {/* Text Section */}
        <div className="max-w-4xl text-center mb-10 md:mb-14">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 md:mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            Casual poker, <span className="text-yellow-300">redesigned.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            A new way to enjoy poker with friends, anytime, anywhere.
          </motion.p>
        </div>

        {/* DotLottie Animation Container */}
        <motion.div
          className="w-full flex justify-center items-center mt-2 md:mt-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8, duration: 1 }}
        >
          <DotLottiePlayer
            src="https://lottie.host/170ae3fe-a67a-4f0b-b503-70a906bd0bff/6itoGqiMOx.lottie"
            loop
            autoplay
            style={{
              width: "100%",
              height: "auto",
              maxWidth: "600px",
              maxHeight: "600px",
              marginBottom: "20px",
            }}
          />
        </motion.div>
      </div>
    </main>
  );
}
