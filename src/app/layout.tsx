import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});
export const metadata: Metadata = {
  title: {
    default: "DPSA Inventory Management System",
    template: "%s | DPSA Inventory",
  },
  description:
    "Sistem manajemen inventaris PT DPSA untuk mengelola data barang, stok, transaksi, dan pergerakan inventaris secara terintegrasi.",
  applicationName: "DPSA Inventory",
  keywords: [
    "DPSA",
    "PT DPSA",
    "Inventory Management",
    "Inventory System",
    "Stock Management",
    "Warehouse Management",
  ],
  authors: [{ name: "PT DPSA" }],
  creator: "PT DPSA",
  publisher: "PT DPSA",
  robots: {
    index: false,
    follow: false,
  },
  openGraph: {
    title: "DPSA Inventory Management System",
    description:
      "Platform manajemen inventaris PT DPSA untuk pengelolaan stok, barang, dan aktivitas pergudangan.",
    siteName: "DPSA Inventory",
    locale: "id_ID",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
