import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // @libsql/client ships an optional native binary for embedded (file) mode;
  // keep it external so it isn't bundled. On serverless the fetch-based
  // /web entry is used instead, so the native binary is never loaded there.
  serverExternalPackages: ["@libsql/client", "libsql"],
};

export default nextConfig;
