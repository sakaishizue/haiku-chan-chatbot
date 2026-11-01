import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Cloud Run（Docker）向けに必要なファイルだけを .next/standalone に出力する
  output: "standalone",
  // 同じ Wi-Fi のスマホから dev サーバーを開けるようにする（開発時のみ有効。本番には影響しない）
  allowedDevOrigins: ["192.168.*.*", "10.*.*.*"],
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
