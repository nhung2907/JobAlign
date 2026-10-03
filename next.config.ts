import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // impit là module native (giả TLS Chrome) — không đóng gói, để Node nạp trực tiếp.
  serverExternalPackages: ["impit", "unpdf", "mammoth"],
};

export default nextConfig;
