import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

import { AppShell } from "@/components/AppShell";

import { ReviewProvider } from "@/lib/ReviewContext";

export const metadata: Metadata = {
  title: "Archive of our Books",
  description: "A mobile-first web app for book lovers",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${playfair.variable} h-full antialiased`}
    >
      <body className="min-h-full flex font-sans bg-brand-bg text-brand-text">
        <ReviewProvider>
          <AppShell>{children}</AppShell>
        </ReviewProvider>
      </body>
    </html>
  );
}
