import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Rankify - Music Ranking App",
  description: "Rank your favorite songs and albums using comparison-based logic",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" style={{ backgroundColor: '#f5f1e8' }}>
      <body style={{ backgroundColor: '#f5f1e8' }}>{children}</body>
    </html>
  );
}

