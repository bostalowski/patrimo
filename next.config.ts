import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: "standalone",
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
    ];
  },
};

export default nextConfig;
