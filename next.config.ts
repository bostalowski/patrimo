import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
  transpilePackages: ["@patrimo/core"],
  // Playwright e2e uses a separate distDir so a local `next dev` lock does not block smoke.
  ...(process.env.FINGRAPHS_E2E_DIST_DIR
    ? { distDir: process.env.FINGRAPHS_E2E_DIST_DIR }
    : {}),
  async redirects() {
    return [
      {
        source: "/dca",
        destination: "/investissements",
        permanent: false,
      },
      {
        source: "/retraite",
        destination: "/investissements",
        permanent: false,
      },
      {
        source: "/immobilier",
        destination: "/investissements",
        permanent: false,
      },
      {
        source: "/prix-manuels",
        destination: "/actifs",
        permanent: false,
      },
      {
        source: "/performance",
        destination: "/",
        permanent: false,
      },
    ];
  },
};

export default nextConfig;
