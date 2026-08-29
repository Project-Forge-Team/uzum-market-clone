import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Не даём Next.js убирать trailing slash у /api-путей — бэкенд Django
  // ожидает конечный слэш (/auth/csrf/, /products/ и т.д.).
  skipTrailingSlashRedirect: true,

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "placehold.co",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "backend-uzum-market.onrender.com",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "picsum.photos",
        pathname: "/**",
      },
      {
        protocol: "https",
        hostname: "**",
        pathname: "/**",
      },
    ],
  },

  // 🔥 ДОБАВЛЕНО: Проксирование запросов через сервер Next.js
  async rewrites() {
    return [
      {
        // Любой запрос, начинающийся с /api/ на фронтенде...
        source: "/api/:path*",
        // ...будет перенаправлен сервером Next.js на бэкенд Render
        destination: "https://backend-uzum-market.onrender.com/api/:path*",
      },
    ];
  },
};

export default nextConfig;
