"use client";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState, useRef, RefObject, useMemo } from "react";

export default function Home() {
  const [hasScrolled, setHasScrolled] = useState(false);
  const [activeSection, setActiveSection] = useState(-1);

  const section1Ref = useRef<HTMLElement | null>(null);
  const section2Ref = useRef<HTMLElement | null>(null);
  const section3Ref = useRef<HTMLElement | null>(null);
  const section4Ref = useRef<HTMLElement | null>(null);

  const sectionRefsArray = useMemo(
    () => [section1Ref, section2Ref, section3Ref, section4Ref],
    [section1Ref, section2Ref, section3Ref, section4Ref],
  );

  useEffect(() => {
    const handleScroll = () => {
      setHasScrolled(window.scrollY > 10);

      let foundActive = false;
      sectionRefsArray.forEach((ref, index) => {
        if (ref.current) {
          const rect = ref.current.getBoundingClientRect();
          const windowHeight = window.innerHeight;
          const isInMiddleThird =
            rect.top <= windowHeight * 0.6 && rect.bottom >= windowHeight * 0.4;

          if (isInMiddleThird) {
            setActiveSection(index);
            foundActive = true;
          }
        }
      });

      if (!foundActive) {
        setActiveSection(-1);
      }
    };

    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, [sectionRefsArray]);

  const sections = [
    { title: "redefining inclusivity" },
    { title: "highlighting accessibility" },
    { title: "playing smarter" },
    { title: "shuffl 🂡", isCallToAction: true },
  ];

  return (
    <main className="flex flex-col min-h-screen pb-16">
      <section className="h-screen flex items-center justify-center">
        <h1 className="text-5xl md:text-7xl font-bold text-center">
          A new card game
          <br />
          <span
            className={`transition-colors duration-300 ${hasScrolled ? "text-[#ffe330]" : ""}`}
          >
            experience.
          </span>
        </h1>
      </section>

      {sections.map((section, index) => (
        <section
          key={index}
          ref={sectionRefsArray[index] as RefObject<HTMLElement>}
          className={`${section.isCallToAction ? "min-h-[90vh] flex flex-col" : "min-h-[50vh] flex"} items-center justify-center ${!section.isCallToAction ? "py-16" : ""} ${section.isCallToAction ? "gap-6" : ""}`}
        >
          <h2
            className={`text-4xl md:text-6xl font-bold text-center transition-colors duration-300 ${activeSection === index ? "text-[#ffe330]" : ""}`}
          >
            {section.title}
          </h2>
          {section.isCallToAction && (
            <>
              <Button
                className={`bg-primary hover:bg-white text-black transition-colors duration-300 text-lg px-8 py-6 ${activeSection === index ? "bg-[#ffe330]" : ""}`}
              >
                <Link href="/pick-game">Get Started Now</Link>
              </Button>
              <p className="text-gray-300">...because fun is for everyone!</p>
            </>
          )}
        </section>
      ))}
    </main>
  );
}
