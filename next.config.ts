import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Mitigates Node.js 24 zlib/compression issues with Next.js 16 dev server.
  compress: false,
  serverExternalPackages: ["chromadb", "@google/genai"],
  webpack: (config) => {
    // ChromaDB ships optional embed plugins that webpack cannot resolve.
    config.resolve.alias = {
      ...config.resolve.alias,
      "@chroma-core/default-embed": false,
    };

    return config;
  },
};

export default nextConfig;
