import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run（Docker）向けに必要なファイルだけを .next/standalone に出力する
  output: "standalone",
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
