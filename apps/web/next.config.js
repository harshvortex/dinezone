/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile workspace packages
  transpilePackages: ["@dinespot/types", "@dinespot/utils"],

  // Image optimization domains
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "res.cloudinary.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "maps.googleapis.com" },
    ],
  },

  // ISR — static restaurant pages revalidate every 60 seconds
  experimental: {
    serverActions: { allowedOrigins: ["dinespot-api.onrender.com", "localhost:4000"] },
  },

  // Security headers
  async headers() {
    const isProd = process.env.NODE_ENV === "production";
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-DNS-Prefetch-Control",  value: "on" },
          { key: "X-Frame-Options",          value: "SAMEORIGIN" },
          { key: "X-Content-Type-Options",   value: "nosniff" },
          { key: "X-XSS-Protection",         value: "1; mode=block" },
          { key: "Referrer-Policy",          value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy",       value: "camera=(), microphone=(), geolocation=(self)" },
          ...(isProd
            ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
            : []),
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://checkout.razorpay.com https://maps.googleapis.com https://maps.gstatic.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
              "font-src 'self' https://fonts.gstatic.com",
              "img-src 'self' data: blob: https://res.cloudinary.com https://maps.googleapis.com https://maps.gstatic.com https://lh3.googleusercontent.com",
              "connect-src 'self' http://localhost:4000 ws://localhost:4000 https://dinespot-api.onrender.com wss://dinespot-api.onrender.com https://api.razorpay.com",
              "frame-src https://api.razorpay.com",
              "worker-src 'self' blob:",
            ].join("; "),
          },
        ],
      },
      // Cache static assets aggressively
      {
        source: "/static/(.*)",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },

  // API proxy rewrites (fallback if vercel.json rewrites not used)
  async rewrites() {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000/api/v1";
    return [
      { source: "/api/v1/:path*", destination: `${apiUrl}/:path*` },
    ];
  },
};

module.exports = nextConfig;
