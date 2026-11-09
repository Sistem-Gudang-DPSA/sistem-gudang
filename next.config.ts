import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // module.exports = {
  //   allowedDevOrigins: ['192.168.1.158']
  // }
  allowedDevOrigins: ["192.168.1.*"],
  // With NEXT_PUBLIC_API_BASE_URL empty, the browser calls /api on this origin and Next forwards it to the BE.
  // Lets a phone on `dev:https` reach the http BE without mixed-content blocks.
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${process.env.BACKEND_URL ?? "http://localhost:3001"}/api/:path*` }];
  },

};

export default nextConfig;
