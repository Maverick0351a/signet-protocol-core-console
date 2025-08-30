/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    optimizePackageImports: ["lucide-react"],
    // Allow both host representations during dev so e2e (127.0.0.1) matches Next internal asset host (localhost)
    allowedDevOrigins: ["http://127.0.0.1:3100", "http://localhost:3100"],
  },
};
export default nextConfig;
