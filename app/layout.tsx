import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getContent } from "@/lib/content-store";
import { PublicBackground } from "@/components/PublicBackground";
import { GlobeBurstTransition } from "@/components/GlobeBurstTransition";

export const viewport: Viewport = {
  themeColor: "#060913",
  colorScheme: "dark",
};

const geistSans = localFont({
  src: "./fonts/geist-sans-variable.woff2",
  variable: "--font-geist-sans",
  weight: "100 900",
  display: "block",
});

const geistMono = localFont({
  src: "./fonts/geist-mono-variable.woff2",
  variable: "--font-geist-mono",
  weight: "100 900",
  display: "block",
});

export async function generateMetadata(): Promise<Metadata> {
  const { site } = await getContent();
  return {
    title: { default: site.title, template: '%s - ' + site.brand + site.brandAccent },
    description: site.description,
    openGraph: { title: site.title, description: site.description, type: 'website' },
    twitter: { card: 'summary', title: site.title, description: site.description },
    icons: { icon: site.faviconUrl || site.iconUrl, shortcut: site.faviconUrl || site.iconUrl, apple: site.iconUrl },
  };
}

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable}`}
      suppressHydrationWarning
      style={{ colorScheme: "dark", backgroundColor: "#060913" }}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `if(performance.getEntriesByType("navigation")[0]?.type==="reload"||(performance.navigation&&performance.navigation.type===1))document.documentElement.dataset.introBypass="true";`,
          }}
        />
      </head>
      <body><PublicBackground />{children}<GlobeBurstTransition /></body>
    </html>
  );
}
