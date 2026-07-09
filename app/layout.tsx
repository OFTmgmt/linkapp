import type { Metadata } from "next";
import { inter, FONT_VARS } from "@/lib/fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "My Links",
  description: "Your links in one place",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body className={`${inter.className} ${FONT_VARS}`}>{children}</body>
    </html>
  );
}
