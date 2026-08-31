import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Email designer uploads (professional photos) need more than the 1 MB default.
  experimental: {
    serverActions: {
      bodySizeLimit: "35mb",
    },
  },
  serverExternalPackages: ["exceljs"],
};

export default nextConfig;
