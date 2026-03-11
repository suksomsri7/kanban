import type { NextConfig } from "next";

// Docker/VPS: defaults to "/kanban"
// Vercel:     set NEXT_PUBLIC_BASE_PATH="" in Vercel dashboard to use root
const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "/kanban";

const nextConfig: NextConfig = {
  ...(basePath ? { basePath } : {}),
  env: {
    NEXT_PUBLIC_BASE_PATH: basePath,
  },
};

export default nextConfig;
