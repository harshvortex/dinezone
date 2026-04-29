import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "@/app/globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { QueryProvider } from "@/providers/QueryProvider";
import { AuthProvider } from "@/providers/AuthProvider";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });

export const metadata: Metadata = {
  title:       { default: "DineSpot — Discover & Book Restaurants", template: "%s | DineSpot" },
  description: "Find nearby restaurants, check real-time seat availability, book buffets and event halls — all in one place.",
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"),
  openGraph: {
    type: "website", siteName: "DineSpot",
    title: "DineSpot — Discover & Book Restaurants",
    description: "India's #1 restaurant booking platform.",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <QueryProvider>
          <AuthProvider>
            <Navbar />
            <main>{children}</main>
          </AuthProvider>
        </QueryProvider>
      </body>
    </html>
  );
}
