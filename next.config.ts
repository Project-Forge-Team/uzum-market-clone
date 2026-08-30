import type { NextConfig } from "next";

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

  // Блок rewrites УДАЛЕН
};

export default nextConfig;
