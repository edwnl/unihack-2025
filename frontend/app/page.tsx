// app/page.tsx
"use client";

import { useRouter } from "next/navigation";

export default function Home() {
  const router = useRouter();

  const handlePlayNow = () => {
    router.push("/start");
  };

  return (
    <div className="min-h-screen flex flex-col bg-black text-white">
      <header className="p-6 absolute top-0 left-0">
        <h2 className="text-2xl font-bold text-[#ffe330]">shuffl</h2>
      </header>

      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-8">
            A new card game
            <br />
            <span className="text-[#ffe330]">experience</span>
          </h1>

          <button
            onClick={handlePlayNow}
            className="bg-[#ffe330] hover:bg-white text-black font-bold transition-colors duration-300 text-lg px-8 py-6 rounded-lg"
          >
            Play Now
          </button>
        </div>
      </div>

      <footer className="p-4 text-center text-gray-500 text-sm">
        Play smarter, learn faster, accessible for everyone
      </footer>
    </div>
  );
}
