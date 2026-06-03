import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import Link from "next/link";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Cloud AI Research Blog",
  description: "Research notes on cloud-native AI systems and infrastructure",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} antialiased`}>
      <body className="min-h-screen bg-white">
        <header className="border-b border-gray-200">
          <nav className="max-w-4xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <Link href="/" className="text-lg font-semibold text-gray-900">
                Cloud AI Research
              </Link>
              <div className="flex gap-6 text-sm">
                <Link href="/" className="text-gray-600 hover:text-gray-900">
                  Home
                </Link>
                <Link href="/projects" className="text-gray-600 hover:text-gray-900">
                  Projects
                </Link>
                <Link href="/reading-list" className="text-gray-600 hover:text-gray-900">
                  Reading
                </Link>
              </div>
            </div>
          </nav>
        </header>
        {children}
      </body>
    </html>
  );
}
