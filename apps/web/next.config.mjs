/** @type {import('next').NextConfig} */
const nextConfig = {
  output: "standalone", // docker/Dockerfile.web copies the standalone build only
  reactStrictMode: true,
  eslint: { ignoreDuringBuilds: false },
  typescript: { ignoreBuildErrors: false },
};

export default nextConfig;
