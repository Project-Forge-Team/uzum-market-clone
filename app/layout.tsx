import type { Metadata } from "next";
import { Inter } from "next/font/google"; // <-- Импортируем Inter
import "./globals.css";
import TopBar from "@/components/layout/TopBar";

// Настраиваем шрифт (subsets: ["latin", "cyrillic"] нужны для русского языка!)
const inter = Inter({ 
  subsets: ["latin", "cyrillic"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "Uzum Market Clone",
  description: "Clone of Uzum Market",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ru">
      {/* Применяем шрифт ко всему body через className */}
      <body className={inter.className}>
        <TopBar />
        {children}
      </body>
    </html>
  );
}