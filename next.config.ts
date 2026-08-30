import type { NextConfig } from "next";

/**
 * Бэкенд живёт на другом домене (Django на Render). Чтобы куки сессии
 * оставались same-site, а CORS был не нужен вообще, весь трафик к API и к
 * картинкам товаров идёт через этот же origin и проксируется здесь.
 */
const BACKEND_ORIGIN = (
  process.env.BACKEND_URL ?? "https://backend-uzum-market.onrender.com"
)
  .trim()
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

  async rewrites() {
    return [
      // Картинки товаров бэкенд отдаёт по абсолютным путям `/products/gen/*.svg`
      // со своего домена. Правило стоит в afterFiles (значение по умолчанию),
      // поэтому локальные файлы из public/products/** по-прежнему выигрывают,
      // а всё остальное подтягивается с бэкенда.
      {
        source: "/products/gen/:path*",
        destination: `${BACKEND_ORIGIN}/products/gen/:path*`,
      },
      // Загруженные продавцами картинки отдаёт бэкенд (`/api/uploads/<key>`),
      // но их обслуживает catch-all прокси в app/api/[...path]/route.ts —
      // здесь дублировать не нужно.
    ];
  },
};

export default nextConfig;
