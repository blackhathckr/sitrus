/**
 * Root Layout
 *
 * Main layout component for the Sitrus social commerce platform.
 * Provides global providers, font configuration, and theme system initialization.
 */

import type { Metadata } from "next";
import {
  Inter,
  Manrope,
  IBM_Plex_Sans,
  Source_Sans_3,
  Plus_Jakarta_Sans,
  DM_Sans,
  Outfit,
  Lato,
  Montserrat,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/providers";

// Font configurations - All 12 font families for user customization
const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const ibmPlexSans = IBM_Plex_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  variable: "--font-ibm-plex-sans",
  display: "swap",
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  variable: "--font-source-sans",
  display: "swap",
});

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-plus-jakarta",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  variable: "--font-outfit",
  display: "swap",
});

const lato = Lato({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-lato",
  display: "swap",
});

const montserrat = Montserrat({
  subsets: ["latin"],
  variable: "--font-montserrat",
  display: "swap",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space-grotesk",
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Sitrus — Social Commerce for Creators",
  description:
    "Monetize your influence. Share products you love and earn from every click.",
  keywords: [
    "social commerce",
    "affiliate marketing",
    "creator economy",
    "Instagram creators",
    "Sitrus",
  ],
  authors: [{ name: "Sitrus Club" }],
};

// Combine all font CSS variables
const fontVariables = [
  inter.variable,
  manrope.variable,
  ibmPlexSans.variable,
  sourceSans.variable,
  plusJakarta.variable,
  dmSans.variable,
  outfit.variable,
  lato.variable,
  montserrat.variable,
  spaceGrotesk.variable,
  jetbrainsMono.variable,
].join(" ");

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className=""
      suppressHydrationWarning
      data-palette=""
      data-depth="subtle"
    >
      <body className={`${fontVariables} font-montserrat antialiased`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
