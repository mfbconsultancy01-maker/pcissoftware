/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  typescript: {
    // Allow production builds even with type warnings in dependencies
    ignoreBuildErrors: false,
  },
  poweredByHeader: false,
  compress: true,
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
        { key: 'X-Permitted-Cross-Domain-Policies', value: 'none' },
        {
          key: 'Permissions-Policy',
          value: 'camera=(), microphone=(), geolocation=(self), interest-cohort=()',
        },
        {
          key: 'Content-Security-Policy',
          value: [
            "default-src 'self'",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.clerk.io https://*.clerk.accounts.dev https://clerk.platformpcissolution.com https://challenges.cloudflare.com",
            "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
            "font-src 'self' https://fonts.gstatic.com data:",
            "img-src 'self' data: blob: https://*.clerk.com https://img.clerk.com https://clerk.platformpcissolution.com https://*.maplibre.org https://*.openstreetmap.org https://*.basemaps.cartocdn.com",
            "connect-src 'self' https://*.clerk.accounts.dev https://*.clerk.com https://api.clerk.io https://clerk.platformpcissolution.com https://accounts.platformpcissolution.com https://*.basemaps.cartocdn.com https://*.openstreetmap.org https://pciscom-production.up.railway.app https://api.dubaipulse.gov.ae",
            "frame-src 'self' https://*.clerk.accounts.dev https://accounts.platformpcissolution.com https://challenges.cloudflare.com",
            "worker-src 'self' blob:",
            "object-src 'none'",
            "base-uri 'self'",
            "form-action 'self'",
          ].join('; '),
        },
      ],
    },
  ],
}

module.exports = nextConfig
