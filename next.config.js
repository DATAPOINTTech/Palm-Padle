/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'export',
  // Disable image optimization because it requires a Node.js server
  images: {
    unoptimized: true,
  }
};

module.exports = nextConfig;