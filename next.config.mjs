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
  // O link curto do cardápio (/c) fica em src/app/c/route.ts: registra o acesso e redireciona
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
          // Só o próprio app pode abrir as páginas num iframe (o PDF do cardápio usa um)
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Content-Security-Policy", value: "frame-ancestors 'self'; base-uri 'self'; form-action 'self'; object-src 'none'" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), payment=()" },
          { key: "Strict-Transport-Security", value: "max-age=63072000" },
        ],
      },
    ];
  },
};

export default nextConfig;
