import type { Metadata } from "next";
import { Inter } from "next/font/google"; // <-- Импортируем Inter
import "./globals.css";
import TopBar from "@/components/layout/TopBar";
import MainHeader from "@/components/layout/MainHeader";
import CategoryNav from "@/components/layout/CategoryNav";
import HeroBanner from "@/components/layout/HeroBanner";
import RecommendedSection from "@/components/layout/RecommendedSection";
import SpecialOffersSection from "@/components/layout/SpecialOffersSection";
import Footer from '@/components/layout/Footer';

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
        <MainHeader />
        <CategoryNav />
        <HeroBanner />
        <RecommendedSection />
        <SpecialOffersSection />
        <Footer />
        {children}
      </body>
    </html>
  );
}