import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono, Instrument_Serif } from "next/font/google";
import "lenis/dist/lenis.css";
import "./globals.css";
import { MotionNotice } from "@/components/layout/MotionNotice";
import { RouteProgress } from "@/components/layout/RouteProgress";
import { SmoothScroll } from "@/components/layout/SmoothScroll";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist", display: "swap" });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: "--font-geist-mono", display: "swap" });
const instrument = Instrument_Serif({ subsets: ["latin"], weight: "400", style: ["normal", "italic"], variable: "--font-instrument", display: "swap" });

export const metadata: Metadata = {
  title: "ProofBeforePay · Check a job offer before it costs you",
  description:
    "Paste a job offer or client message. AI agents built on NVIDIA Nemotron check the company, the sender, the domain and every claim, then tell you whether it's safe to take the next step.",
  openGraph: {
    title: "ProofBeforePay",
    description: "Check a job offer or client message before it costs you. Every claim cited.",
    type: "website",
  },
};

export const viewport: Viewport = {
  themeColor: "#080807",
  colorScheme: "dark",
};

// Applies the visitor's animation choice before first paint, so the page never flashes the wrong motion setting.
const MOTION_SCRIPT = `try{var m=localStorage.getItem("pbp:motion");if(m==="full"||m==="reduced")document.documentElement.setAttribute("data-motion",m)}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} ${geistMono.variable} ${instrument.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: MOTION_SCRIPT }} />
      </head>
      <body>
        <SmoothScroll>
          <RouteProgress />
          {children}
          <MotionNotice />
        </SmoothScroll>
      </body>
    </html>
  );
}
