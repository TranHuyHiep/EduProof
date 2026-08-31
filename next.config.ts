import type { NextConfig } from "next";
import path from "path";

const nextConfig: NextConfig = {
  outputFileTracingRoot: path.join(__dirname),

  // Smaller Docker image: only the files actually needed to run get copied.
  // See docs/32-deployment.md.
  output: "standalone",

  // The school route signs with a hand-rolled Schnorr over JubJub
  // (lib/midnight/schnorr.ts), which pulls in compact-runtime's WASM. These
  // packages resolve their .wasm file with `join(__dirname, '...wasm')` at
  // runtime, so webpack bundling them (which rewrites __dirname's meaning)
  // breaks that lookup even when outputFileTracingIncludes copies the file —
  // Vercel's Function re-roots node_modules, so the path no longer lines up.
  // Marking them external keeps them as plain `require()`s from node_modules,
  // which both platforms copy in with their original layout intact.
  serverExternalPackages: [
    "@midnight-ntwrk/onchain-runtime-v3",
    "@midnight-ntwrk/zkir-v2",
    "@midnight-ntwrk/ledger-v8",
  ],

  webpack: (config, { isServer }) => {
    // The Midnight runtime is WebAssembly, which webpack 5 does not enable by
    // default. Without this the build fails outright on any import of it.
    config.experiments = { ...config.experiments, asyncWebAssembly: true, layers: true };

    // The WASM glue is async by nature. Without an explicit target, webpack
    // assumes it may have to downlevel it and warns that the environment might
    // not support async/await — every browser that can run WebAssembly can.
    config.target = isServer ? "node18" : ["web", "es2020"];

    if (!isServer) {
      // Proving runs in the browser, and the runtime reaches for Node built-ins
      // that have no business in a bundle. Stubbing them keeps the WASM path
      // loadable client-side, which is where the witness has to stay.
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        crypto: false,
      };
    }

    return config;
  },
};

export default nextConfig;
