import type { Metadata } from "next";
import Link from "next/link";
import { ThemeToggle } from "@/components/theme-toggle";
import { Icon } from "@/components/icons";
import { siteURL } from "@/lib/seo";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL(siteURL),
  title: {
    default: "DramaMatch — Find a drama you’ll actually love",
    template: "%s | DramaMatch",
  },
  description:
    "K-dramas and C-dramas matched to your mood. Three little questions. A more personal next watch.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "DramaMatch — Your next favorite story",
    description: "K-dramas + C-dramas matched to your mood.",
    type: "website",
    siteName: "DramaMatch",
    images: ["/opengraph-image"],
  },
};
const themeScript = `try{const t=localStorage.getItem('dramamatch-theme');document.documentElement.dataset.theme=t||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light')}catch{}`;
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <header className="site-header">
          <Link className="logo" href="/" aria-label="DramaMatch home">
            <span className="logo-icon">
              <Icon name="flower" size={26} />
            </span>
            DramaMatch<span className="logo-period">.</span>
          </Link>
          <nav aria-label="Main navigation">
            <Link href="/discover">Discover</Link>
            <Link href="/collections">Collections</Link>
          </nav>
          <div className="header-actions">
            <Link
              className="saved-link"
              href="/saved"
              aria-label="Saved dramas"
            >
              <Icon name="bookmark" size={18} />
              <span>My list</span>
            </Link>
            <span className="header-divider" />
            <ThemeToggle />
          </div>
        </header>
        <main id="main">{children}</main>
        <footer className="site-footer">
          <Link className="logo" href="/">
            <Icon name="flower" size={20} />
            DramaMatch<span className="logo-period">.</span>
          </Link>
          <span>A little less scrolling. A lot more feeling.</span>
          <div>
            <Link href="/collections">Find your next story</Link>
            <Link href="/saved">My list</Link>
            <span>Made for the drama of it all ♡</span>
          </div>
        </footer>
      </body>
    </html>
  );
}
