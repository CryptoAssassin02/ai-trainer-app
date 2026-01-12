// REMOVED dotenv require - Rely on Next.js built-in .env loading
// require('dotenv').config();

// REMOVED DEBUGGING LOG
// console.log(...);

/** @type {import('next').NextConfig} */
const nextConfig = {
  // REMOVED the env block previously
  /*
  env: {
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  },
  */
  // Keep existing image config
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
      },
      {
        protocol: 'https',
        hostname: 'dummyimage.com',
      },
    ],
  },
  // Keep other configs if they exist...
  /*
  experimental: {
    serverComponentsExternalPackages: ['@tremor/react'],
  },
  */
};

module.exports = nextConfig; 