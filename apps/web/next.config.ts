import type { NextConfig } from "next";

const production = process.env.NODE_ENV === "production";

// Production: exported as static files that FastAPI serves, so the app and API share one origin and one container.
// Development: the dev server proxies /api to FastAPI on :8000, so the session cookie is first-party there too.
const config: NextConfig = {
  ...(production ? { output: "export" as const } : {}),
  reactStrictMode: true,
  images: { unoptimized: true },
  poweredByHeader: false,
  // Server-sent events must not be gzipped by the dev proxy, or they arrive in one lump at the end.
  compress: false,
  ...(production
    ? {}
    : {
        async rewrites() {
          return [{ source: "/api/:path*", destination: `${process.env.API_ORIGIN ?? "http://127.0.0.1:8000"}/api/:path*` }];
        },
      }),
};

export default config;
