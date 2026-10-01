import type { Metadata } from "next";
import { Bricolage_Grotesque, Manrope, JetBrains_Mono } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { AuroraBackground } from "@/components/aurora-background";
import "./globals.css";

const bricolage = Bricolage_Grotesque({
  variable: "--font-bricolage",
  subsets: ["latin"],
});

const manrope = Manrope({
  variable: "--font-manrope",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "Geld Flow",
  description: "Split trips, tabs, and everything in between — without the spreadsheet.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${bricolage.variable} ${manrope.variable} ${jetbrainsMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-bg text-ink">
        <div className="relative z-50 bg-amber-500/90 px-4 py-1.5 text-center text-xs font-medium text-amber-950">
          🚧 Site under construction — actively being rebuilt right now, so a few things may be flaky. 🚧
        </div>
        <AuroraBackground />
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
