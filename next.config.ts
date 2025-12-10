import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Turbopack 配置（Next.js 16 默认使用 Turbopack）
  // 设置空的 turbopack 配置以明确使用 Turbopack
  turbopack: {
    // Turbopack 会自动排除 node_modules 中的测试文件
    // 如果需要自定义规则，可以在这里添加
  },
  // 排除特定包，避免处理它们的测试文件
  experimental: {
    serverComponentsExternalPackages: ["thread-stream"],
  },
};

export default nextConfig;
