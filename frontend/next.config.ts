import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: false,
  // Allow hot-reload WebSocket when opening dev server via LAN IP (e.g. 192.168.x.x)
  allowedDevOrigins: ["192.168.0.107", "localhost", "127.0.0.1"],
};

export default nextConfig;
