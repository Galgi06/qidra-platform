import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";

const contentSecurityPolicy = [
  "default-src 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob:",
  "font-src 'self' data:",
  "style-src 'self' 'unsafe-inline'",
  `script-src 'self' 'unsafe-inline'${isProduction ? "" : " 'unsafe-eval'"} https://telegram.org https://*.telegram.org`,
  "connect-src 'self' https://api.trongrid.io",
  "frame-src 'self' https://oauth.telegram.org https://telegram.org https://*.telegram.org",
  ...(isProduction ? ["upgrade-insecure-requests"] : [])
].join("; ");

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: contentSecurityPolicy
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin"
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff"
  },
  {
    key: "X-Frame-Options",
    value: "DENY"
  },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()"
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=31536000; includeSubDomains; preload"
  }
];

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  async redirects() {
    return [
      {
        source: "/auth/login",
        destination: "/auth/sign-in",
        permanent: false
      },
      {
        source: "/auth/registration",
        destination: "/auth/sign-up",
        permanent: false
      },
      {
        source: "/wallet",
        destination: "/investor/wallet",
        permanent: false
      },
      {
        source: "/messages",
        destination: "/investor/support",
        permanent: false
      },
      {
        source: "/profile",
        destination: "/investor",
        permanent: false
      },
      {
        source: "/profile/:path*",
        destination: "/investor",
        permanent: false
      },
      {
        source: "/cabinet",
        destination: "/investor",
        permanent: false
      },
      {
        source: "/cabinet/:path*",
        destination: "/investor",
        permanent: false
      }
    ];
  },
  async headers() {
    return [
      {
        headers: securityHeaders,
        source: "/:path*"
      }
    ];
  }
};

export default nextConfig;
