"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import Link from "next/link";
import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <main className="flex min-h-screen flex-col items-center justify-start relative overflow-hidden px-4">
      {/* Navigation Area */}
      <div className="w-full flex justify-between pt-5 sm:pt-6 md:pt-8 mb-10 sm:mb-16 md:mb-24">
        {/* FAB with Text and Card Symbol */}
        <motion.div
          className="bg-white text-black rounded-full shadow-lg px-4 py-2 flex items-center justify-center cursor-pointer"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <span className="font-bold text-base md:text-lg">shuffl 🂡</span>
        </motion.div>

        {/* Play Now Button */}
        <Link href="/pick-game">
          <motion.button
            className="bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-2 px-4 md:py-3 md:px-6 rounded-full shadow-lg text-sm md:text-base"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Play Now
          </motion.button>
        </Link>
      </div>

      {/* Main Content */}
      <div className="flex flex-col items-center justify-center w-full mt-8 sm:mt-12 md:mt-0">
      <div className="flex flex-col items-center justify-center w-full mt-8 sm:mt-12 md:mt-0">
        {/* Text Section */}
        <div className="max-w-4xl text-center mb-10 md:mb-14">
          <motion.h1
            className="text-4xl sm:text-5xl md:text-7xl font-bold mb-4 md:mb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            A new card game <span className="text-yellow-300">experience.</span>
            A new card game <span className="text-yellow-300">experience.</span>
          </motion.h1>

          <motion.p
            className="text-lg md:text-xl text-gray-300"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5, duration: 0.8 }}
          >
            Redefining inclusivity. Highlighting accessibility. Playing smarter.
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
