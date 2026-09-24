import type { NextConfig } from "next";

// Low-risk baseline headers. Do not restrict the microphone: Floor Party uses voice input.
// A full Content-Security-Policy needs a separate asset/third-party inventory.
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Permissions-Policy", value: "camera=(), geolocation=()" },
];

const noStore = [{ key: "Cache-Control", value: "private, no-store, max-age=0" }];
const noIndex = [{ key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" }];

const nextConfig: NextConfig = {
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      { source: "/api/:path*", headers: noStore },
      { source: "/pokoj/:path*", headers: [...noStore, ...noIndex] },
      { source: "/gra/:path*", headers: [...noStore, ...noIndex] },
    ];
  },
};

export default nextConfig;
