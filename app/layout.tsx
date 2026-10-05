import type { Metadata, Viewport } from "next";
import "./globals.css";

const siteURL = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteURL),
  title: "DramaMatch — what should I watch tonight?",
  description:
    "Tell DramaMatch how you feel, a star you love, or a movie you can't stop thinking about. Get hand-picked movies, series, K-dramas and more, filtered by IMDb rating and year.",
  openGraph: {
    title: "DramaMatch — what should I watch tonight?",
    description: "Mood, star or movie in. Your next favourite out.",
    type: "website",
    siteName: "DramaMatch",
  },
  twitter: { card: "summary" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaff" },
    { media: "(prefers-color-scheme: dark)", color: "#0e0d14" },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
