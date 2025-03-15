// frontend/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import { Poppins } from "next/font/google";
import { GameProvider } from "@/lib/game-context";
import DebugNavigation from "@/components/debug-navigation";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Shuffl",
  description: "Accessible card games platform for everyone",
  icons: {
    icon: "/favicon.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        {/* Favicon Links */}
        <link rel="icon" type="image/png" href="/favicon.png" sizes="any" />
        <link rel="apple-touch-icon" href="/favicon.png" />
      </head>
      <body className={`${poppins.className} antialiased`}>
        <DebugNavigation />
        <GameProvider>{children}</GameProvider>
      </body>
    </html>
  );
}
