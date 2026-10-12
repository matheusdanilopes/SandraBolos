/** @type {import('next').NextConfig} */
const nextConfig = {
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [390, 768, 1024, 1280],
    minimumCacheTTL: 86400,
  },
  experimental: {
    optimizePackageImports: ["lucide-react", "date-fns"],
  },
  // Link curto do cardápio para a bio do Instagram
  async redirects() {
    return [{ source: "/c", destination: "/cardapio", permanent: false }];
  },
  async headers() {
    return [
      {
        source: "/_next/static/:path*",
        headers: [
          { key: "Cache-Control", value: "public, max-age=31536000, immutable" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
        ],
      },
    ];
  },
};

export default nextConfig;
