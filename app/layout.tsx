import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import { DecksProvider } from "@/contexts/DecksContext";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Spaced Repetition",
  description: "A local-first spaced repetition study app.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${inter.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-aws-gray-100 text-aws-gray-900 font-sans">
        <AppHeader />
        <DecksProvider>
          <main className="flex flex-1 flex-col">{children}</main>
        </DecksProvider>
      </body>
    </html>
  );
}
