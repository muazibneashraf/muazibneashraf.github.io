import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { getContent } from "@/lib/content-store";
import { PublicBackground } from "@/components/PublicBackground";

export const viewport: Viewport = {
  themeColor: "#060913",
  colorScheme: "dark",
};

const spaceGrotesk = localFont({
  src: "./fonts/space-grotesk-latin.woff2",
  variable: "--font-space-grotesk",
  weight: "300 700",
  display: "block",
});

const manrope = localFont({
  src: "./fonts/manrope-latin.woff2",
  variable: "--font-manrope",
  weight: "200 800",
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
      className={`${spaceGrotesk.variable} ${manrope.variable}`}
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
      <body><PublicBackground />{children}</body>
    </html>
  );
}
