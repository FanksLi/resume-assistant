import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  serverExternalPackages: ["pdf-parse", "mammoth"],
  experimental: {
    serverComponentsExternalPackages: ['pdf-parse', 'mammoth']
  },
  // 在 Vercel 上增加超时时间，因为文件处理可能需要更长时间
  timeout: 300,
  // 禁用 Next.js 遥测
  telemetry: false,
};

export default nextConfig;