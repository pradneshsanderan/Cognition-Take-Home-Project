import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  agentRules: false,
  // Enables forbidden(), which renders app/forbidden.tsx with a real 403 status
  // instead of redirecting away from an app the current user may not view.
  experimental: { authInterrupts: true },
};

export default nextConfig;
