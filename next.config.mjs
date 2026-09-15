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

    // Cache de navegação do App Router. O padrão para rota dinâmica é 0, ou
    // seja: voltar para a tela anterior, ou alternar entre as abas de
    // Comercial, refazia a requisição inteira e mostrava o esqueleto de novo.
    //
    // Com 30s a volta é instantânea, sem rede. Não é dado velho escondido: as
    // actions chamam `revalidatePath`, que limpa este cache, então qualquer
    // gravação feita no app derruba a entrada na hora. O prazo só cobre a
    // navegação de ida e volta em poucos segundos.
    staleTimes: {
      dynamic: 30,
      static: 180,
    },
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
