import type { Metadata } from "next";
import { Inter, Outfit } from "next/font/google";
import "./globals.css";
import { EcoOpsProvider } from "./core/context";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const outfit = Outfit({ subsets: ["latin"], weight: ["400", "700"], variable: "--font-outfit" });

export const metadata: Metadata = {
  title: "EcoOps Suite",
  description: "Enterprise Technical Architecture & End-to-End Flow Blueprint",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${outfit.variable} font-sans antialiased bg-gray-50 text-gray-900 min-h-screen relative overflow-x-hidden`}>
        <div className="mesh-bg absolute inset-0 fixed z-[-1]">
          <div className="blob-1"></div>
          <div className="blob-2"></div>
        </div>
        <EcoOpsProvider>
          {children}
        </EcoOpsProvider>
      </body>
    </html>
  );
}
