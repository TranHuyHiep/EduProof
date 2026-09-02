// Serves the compiled Compact circuit's binary assets (prover/verifier keys,
// zkIR) to the browser.
//
// `NodeZkConfigProvider` (what scripts/register-issuer.mjs uses) reads these
// with `fs`, which webpack's client config stubs to `false` — see
// next.config.ts. This route runs server-side, where `fs` is real, and hands
// the same bytes to the browser over plain HTTP so a browser-side
// ZKConfigProvider (lib/midnight/browser-providers.ts) can fetch them.
//
// Path segments are validated against the same allow-list
// NodeZkConfigProvider itself enforces (assertSafeName) rather than trusted
// from the URL — this reads server files by name from a public route.

import { readFile } from "node:fs/promises";
import { join, normalize } from "node:path";
import { NextResponse } from "next/server";

const ASSETS_DIR = join(process.cwd(), "contracts/build/eduproof");

const SAFE_SEGMENT = /^[A-Za-z0-9_-]+$/;
const ALLOWED_SUBDIRS = new Set(["keys", "zkir"]);
const ALLOWED_EXTENSIONS = new Set([".prover", ".verifier", ".bzkir"]);

export async function GET(_req: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const { path } = await params;

  if (path.length !== 2) {
    return NextResponse.json({ error: "Expected /circuit-assets/<subdir>/<file>." }, { status: 400 });
  }
  const [subDir, fileName] = path;
  if (!ALLOWED_SUBDIRS.has(subDir)) {
    return NextResponse.json({ error: "Unknown asset directory." }, { status: 404 });
  }

  const dotIndex = fileName.lastIndexOf(".");
  const base = dotIndex === -1 ? fileName : fileName.slice(0, dotIndex);
  const ext = dotIndex === -1 ? "" : fileName.slice(dotIndex);
  if (!SAFE_SEGMENT.test(base) || !ALLOWED_EXTENSIONS.has(ext)) {
    return NextResponse.json({ error: "Invalid asset name." }, { status: 400 });
  }

  const target = normalize(join(ASSETS_DIR, subDir, fileName));
  if (!target.startsWith(normalize(ASSETS_DIR))) {
    return NextResponse.json({ error: "Invalid asset name." }, { status: 400 });
  }

  try {
    const data = await readFile(target);
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "content-type": "application/octet-stream",
        "cache-control": "public, max-age=31536000, immutable",
      },
    });
  } catch {
    return NextResponse.json({ error: "Asset not found." }, { status: 404 });
  }
}
