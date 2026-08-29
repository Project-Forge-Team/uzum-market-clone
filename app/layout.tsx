import type { Metadata } from "next";
import "./globals.css";
import TopBar from "@/components/layout/TopBar";
import MainHeader from "@/components/layout/MainHeader";
import Footer from "@/components/layout/Footer";

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
      <body>
        <TopBar />
        <MainHeader />
        {children}
        <Footer />
      </body>
    </html>
  );
}
