import type { NextConfig } from "next";

// Бэкенд: по умолчанию прод (Render), в dev/тестах — локальный
// (tests/local-backend), адрес задаётся одной переменной BACKEND_URL.
const BACKEND_ORIGIN = (
  process.env.BACKEND_URL ?? "https://backend-uzum-market.onrender.com"
)
  .replace(/\/+$/, "")
  .replace(/\/api$/, "");

const nextConfig: NextConfig = {
  skipTrailingSlashRedirect: true,

  // `npm test` поднимает свой dev-сервер рядом с рабочим: у него отдельный
  // каталог сборки, иначе два процесса делят .next и мешают друг другу.
  distDir: process.env.NEXT_DIST_DIR ?? ".next",

  // Песочница/превью отдаёт dev-сервер по внешнему хосту *.e2b.app —
  // без этого Next блокирует кросс-ориджин запросы к /_next/* в dev-режиме.
  allowedDevOrigins: ["*.e2b.app", "*.localhost"],

  images: {
    remotePatterns: [
      { protocol: "https", hostname: "placehold.co", pathname: "/**" },
      {
        protocol: "https",
        hostname: "backend-uzum-market.onrender.com",
        pathname: "/**",
      },
      { protocol: "https", hostname: "picsum.photos", pathname: "/**" },
      { protocol: "https", hostname: "**", pathname: "/**" },
    ],
  },
  // В песочницах и контейнерах с ограниченной памятью dev-сервер на Turbopack
  // рисковал быть убитым: пусть агрессивнее выгружает кэш из RAM на диск.
  experimental: {
    turbopackMemoryEviction: "full",
  },

  // Картинки товаров бэкенд отдаёт путями /products/gen/*.svg (это его
  // домен, а не фронта). Локальные public/products/gen/*.svg — те же файлы
  // сида и отдаются первыми; rewrite — страховка на случай, если файл
  // появился только на бэкенде. afterFiles-фаза: /public проверяется раньше.
  rewrites: async () => [
    {
      source: "/products/gen/:path*",
      destination: `${BACKEND_ORIGIN}/products/gen/:path*`,
    },
  ],
};

export default nextConfig;
