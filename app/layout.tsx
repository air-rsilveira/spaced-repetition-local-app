import type { Metadata } from "next";
import { Inter } from "next/font/google";
import AppHeader from "@/components/AppHeader";
import ContextualActionBar from "@/components/ContextualActionBar";
import { DecksProvider } from "@/contexts/DecksContext";
import { UIActionsProvider } from "@/contexts/UIActionsContext";
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
        <UIActionsProvider>
          <AppHeader />
          <ContextualActionBar />
          <DecksProvider>
            <main className="flex flex-1 flex-col">{children}</main>
          </DecksProvider>
        </UIActionsProvider>
      </body>
    </html>
  );
}
