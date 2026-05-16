import type { Metadata } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { ThemeScript } from "@/components/ui/ThemeProvider";
import { I18nScript } from "@/lib/i18n/I18nProvider";
import { getActiveDesignSystem } from "@/lib/settings";

const geist = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "BHN Training Platform",
  description: "Learning Management System",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  // Design system is platform-wide — admins set it from
  // /admin/design-system, every user of the platform sees the same
  // shell. Read once here and stamp it onto <html> so:
  //   • CSS selectors like `[data-design-system="cinematic"]` work
  //     during server render (no flash)
  //   • The client provider receives the value as a prop, no
  //     localStorage roundtrip or hydration mismatch
  const activeDesignSystem = await getActiveDesignSystem();

  return (
    <html
      lang="en"
      className={`${geist.variable} h-full antialiased`}
      data-design-system={activeDesignSystem}
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
        <I18nScript />
      </head>
      <body className="min-h-full bg-page text-fg">
        <Providers initialDesignSystem={activeDesignSystem}>{children}</Providers>
      </body>
    </html>
  );
}
