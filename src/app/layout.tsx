import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "@/components/providers";
import { ThemeProvider } from "@/components/theme-provider";
import { Toaster } from "@/components/ui/toaster";

export const metadata: Metadata = {
  title: "Support Desk Pro - Ticketing System",
  description: "A comprehensive ticketing support system for managing customer requests",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen bg-background antialiased">
        <SessionProvider>
          <ThemeProvider>
            {children}
            <Toaster />
          </ThemeProvider>
        </SessionProvider>
      </body>
    </html>
  );
}