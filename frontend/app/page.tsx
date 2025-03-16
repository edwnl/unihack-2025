// frontend/app/page.tsx
"use client";
import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { DotLottiePlayer } from "@dotlottie/react-player";
import "@dotlottie/react-player/dist/index.css";
import DotBackground from "@/components/dot-background";
import FullLogo from "@/assets/full-logo.svg";
import Image from "next/image";

export default function Home() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) return null;

  return (
    <>
      <DotBackground />
      <main className="flex min-h-svh flex-col items-center mx-auto max-w-7xl px-6">
        {/* Navigation Area */}
        <nav className="w-full flex justify-between items-center py-6">
          {/* Logo */}
          <Image src={FullLogo} className={"w-36"} alt={"Shuffl Logo"} />

          {/* Play Now Button */}
          <Link href="/pick-game">
            <motion.button
              className="bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Now
            </motion.button>
          </Link>
        </nav>

        {/* Main Content */}
        <div className="flex flex-col items-center justify-center flex-1 w-full mt-16 md:mt-22 max-w-xl">
          {/* Text Section */}
          <div className="text-center">
            <motion.h1
              className="text-4xl md:text-6xl font-bold mb-4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
            >
              A new card game{" "}
              <span className="text-yellow-300">experience.</span>
            </motion.h1>

            <motion.p
              className="text-lg text-gray-300 mb-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.5, duration: 0.8 }}
            >
              Redefining inclusivity. Highlighting accessibility. Playing
              smarter.
            </motion.p>
          </div>

          <Link href="/pick-game">
            <motion.button
              className="bg-yellow-300 hover:bg-yellow-400 text-black font-bold py-2 px-6 rounded-full shadow-lg"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              Play Now
            </motion.button>
          </Link>

          {/* DotLottie Animation */}
          <motion.div
            className="w-full flex justify-center"
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
                maxWidth: "min(350px, 70vw)",
              }}
            />
          </motion.div>
        </div>
      </main>
    </>
  );
}
