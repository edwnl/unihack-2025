import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { GameProvider } from "@/lib/game-context";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Poker Game",
  description: "Accessible poker game for everyone",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${poppins.className} antialiased`}>
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
