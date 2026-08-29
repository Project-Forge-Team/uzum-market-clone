/** @type {import('next').NextConfig} */

const nextConfig = {
  // Не даём Next.js убирать trailing slash у /api-путей — бэкенд Django
  // ожидает конечный слэш (/auth/csrf/, /products/ и т.д.).
  skipTrailingSlashRedirect: true,

  // Проксируем все /api/* запросы на бэкенд Django
  async rewrites() {
    return [
      {
        source: "/api/auth/:path*",
        destination: "https://backend-uzum-market.onrender.com/api/auth/:path*",
      },
    ];
  },

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
};

module.exports = nextConfig;
