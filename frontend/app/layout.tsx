import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Big Fish Small Fish",
  description:
    "AI interviewer research dashboard for collecting evidence, tracking TinyFish runs, and generating prep briefs.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
