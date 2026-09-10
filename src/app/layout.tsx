import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Takipet",
  description: "Özel ders yönetim sistemi",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="tr">
      <body>{children}</body>
    </html>
  );
}
