import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeScript } from "@/components/ui/ThemeProvider";
import { I18nScript } from "@/lib/i18n/I18nProvider";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BHN Training Platform",
  description: "Learning Management System",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${geist.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        <ThemeScript />
        <I18nScript />
      </head>
      <body className="min-h-full bg-page text-fg">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
