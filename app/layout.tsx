import type { Metadata, Viewport } from "next";
import { Instrument_Serif, DM_Sans, Caveat } from "next/font/google";
import Providers from "@/components/providers";
import "./globals.css";

const serif = Instrument_Serif({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  variable: "--font-serif",
});

const sans = DM_Sans({ subsets: ["latin"], variable: "--font-sans" });

const hand = Caveat({ subsets: ["latin"], weight: "600", variable: "--font-hand" });

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Napkin | Scribble the idea. Get it judged.",
    template: "%s | Napkin",
  },
  description:
    "Pitch your startup idea in 400 characters or fewer and a panel of five judging lenses on GenLayer scores it. The best ideas of the week share the prize pool.",
  icons: {
    icon: [{ url: "/favicon-32.png", sizes: "32x32", type: "image/png" }],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    title: "Napkin | Scribble the idea. Get it judged.",
    description:
      "Pitch in 400 characters. Five judging lenses score it on GenLayer. Top ideas of the week share the prize pool.",
    url: siteUrl,
    siteName: "Napkin",
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Napkin" }],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Napkin | Scribble the idea. Get it judged.",
    description: "Pitch in 400 characters. Five judging lenses score it on GenLayer.",
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F1EA" },
    { media: "(prefers-color-scheme: dark)", color: "#0D111E" },
  ],
};

// Applies the saved theme before first paint so the logo and background
// never flash the wrong variant.
const themeScript = `(function(){try{var t=localStorage.getItem('nk-theme');if(t==='light'||t==='dark'){document.documentElement.dataset.theme=t}}catch(e){}})();`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${serif.variable} ${sans.variable} ${hand.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
