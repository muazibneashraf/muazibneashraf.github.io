import type { NextConfig } from "next";

const isGithubPages = process.env.GITHUB_PAGES === "true" || process.env.NEXT_PUBLIC_STATIC_EXPORT === "true";

const nextConfig: NextConfig = {
  ...(isGithubPages ? {
    output: "export",
    images: { unoptimized: true },
  } : {
    async redirects() {
      return [
        {
          source: "/internship",
          destination: "/experience",
          permanent: false,
        },
      ];
    },
  }),
};

export default nextConfig;
