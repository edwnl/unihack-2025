"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function Home() {
  const sections = [
    { title: "redefining inclusivity" },
    { title: "highlighting accessibility" },
    { title: "playing smarter" },
    { title: "shuffl 🂡", isCallToAction: true },
  ];

  return (
    <main className="flex flex-col min-h-screen pb-16">
      {/* Hero section */}
      <section className="h-screen flex items-center justify-center">
        <h1 className="text-5xl md:text-7xl font-bold text-center">
          A new card game
          <br />
          <span>experience.</span>
        </h1>
      </section>

      {/* Static sections */}
      {sections.map((section, index) => (
        <section
          key={index}
          className={`${section.isCallToAction ? "min-h-[90vh] flex flex-col" : "min-h-[50vh] flex"} items-center justify-center ${!section.isCallToAction ? "py-16" : ""} ${section.isCallToAction ? "gap-6" : ""}`}
        >
          <h2 className="text-4xl md:text-6xl font-bold text-center">
            {section.title}
          </h2>
          {section.isCallToAction && (
            <Button className="bg-primary hover:bg-white text-black text-lg px-8 py-6">
              <Link href="/start">Get Started Now</Link>
            </Button>
          )}
        </section>
      ))}
    </main>
  );
}
