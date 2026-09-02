import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case ".wasm":
      return "application/wasm";
    case ".html":
      return "text/html; charset=utf-8";
    case ".js":
    case ".mjs":
      return "application/javascript; charset=utf-8";
    case ".css":
      return "text/css; charset=utf-8";
    case ".png":
      return "image/png";
    case ".jpg":
    case ".jpeg":
      return "image/jpeg";
    case ".svg":
      return "image/svg+xml";
    case ".json":
      return "application/json";
    case ".woff2":
      return "font/woff2";
    case ".woff":
      return "font/woff";
    default:
      return "application/octet-stream";
  }
}

function scanDirectory(dir: string, baseDir: string = dir): Array<{ relativePath: string; fullPath: string }> {
  const results: Array<{ relativePath: string; fullPath: string }> = [];
  if (!fs.existsSync(dir)) return results;

  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...scanDirectory(fullPath, baseDir));
    } else if (entry.isFile()) {
      // Exclude existing package bundles to prevent recursive packaging
      if (entry.name.endsWith(".bgw.json") || entry.name.endsWith(".bgw")) continue;
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, "/");
      results.push({ relativePath, fullPath });
    }
  }
  return results;
}

async function main() {
  const rootDir = process.cwd();
  const manifestPath = path.join(rootDir, "manifest.json");

  if (!fs.existsSync(manifestPath)) {
    console.error(`❌ manifest.json not found at ${manifestPath}`);
    process.exit(1);
  }

  const manifestContent = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
  const distDir = path.join(rootDir, "dist");

  if (!fs.existsSync(distDir)) {
    console.error(`❌ Frontend build output not found at ${distDir}. Run 'just build' first.`);
    process.exit(1);
  }

  // 1. Locate WASM Binary
  const entryWasm = manifestContent.engine?.entry || "apex_nebula.wasm";
  const wasmSrcPath = path.join(rootDir, "engine", "target", "wasm32-unknown-unknown", "release", entryWasm);

  let wasmBuf: Buffer | null = null;
  let wasmHash = "";
  let wasmSize = 0;

  if (fs.existsSync(wasmSrcPath)) {
    wasmBuf = fs.readFileSync(wasmSrcPath);
    wasmHash = crypto.createHash("sha256").update(wasmBuf).digest("hex");
    wasmSize = wasmBuf.length;
    console.log(`✓ Read compiled WASM binary (${wasmSize} bytes, SHA-256: ${wasmHash})`);

    // Copy WASM into dist directory as well
    const destWasmPath = path.join(distDir, entryWasm);
    fs.writeFileSync(destWasmPath, wasmBuf);
  } else {
    console.warn(`⚠️ WASM binary not found at ${wasmSrcPath}. Run 'just build-wasm' first.`);
  }

  // 2. Scan all dist assets (UI HTML, JS, CSS, assets, WASM)
  const distFiles = scanDirectory(distDir);
  const assetDescriptors: Array<{
    path: string;
    hash: string;
    mimeType: string;
    size: number;
    data?: string; // Inlined Base64 for 100% offline self-containment
  }> = [];

  let totalPackageSize = 0;

  for (const file of distFiles) {
    const fileBuf = fs.readFileSync(file.fullPath);
    const hash = crypto.createHash("sha256").update(fileBuf).digest("hex");
    const mimeType = getMimeType(file.fullPath);
    const size = fileBuf.length;
    totalPackageSize += size;

    assetDescriptors.push({
      path: file.relativePath,
      hash,
      mimeType,
      size,
      data: fileBuf.toString("base64"),
    });

    console.log(`  + Asset: ${file.relativePath.padEnd(45)} [${mimeType}] (${size} B)`);
  }

  // 3. Assemble Manifest
  manifestContent.publisher = manifestContent.publisher || {};
  manifestContent.publisher.publicKey =
    manifestContent.publisher.publicKey ||
    "b5c6d7e8f9a0123456789abcdef0123456789abcdef0123456789abcdef01234";

  manifestContent.engine = manifestContent.engine || {};
  manifestContent.engine.entry = entryWasm;
  if (wasmHash) {
    manifestContent.engine.wasmHash = wasmHash;
  }

  manifestContent.assets = assetDescriptors;
  manifestContent.ui = {
    entry: "index.html",
    type: "html5-spa",
  };

  // 4. Write Self-Contained JSON Package
  const pkgFileName = `${manifestContent.gameId || "apex-nebula"}.bgw.json`;
  const outPath = path.join(distDir, pkgFileName);
  const formattedJson = JSON.stringify(manifestContent, null, 2);

  fs.writeFileSync(outPath, formattedJson, "utf-8");

  const totalMb = (totalPackageSize / (1024 * 1024)).toFixed(2);
  console.log(`\n🎉 Fully Local Apex Nebula Package built successfully!`);
  console.log(`  📦 Bundle Name:       ${pkgFileName}`);
  console.log(`  📁 Bundle Output:     ${outPath}`);
  console.log(`  📊 Total Assets:      ${assetDescriptors.length} files (${totalMb} MB uncompressed)`);
  console.log(`  🛡️ Engine WASM Hash:  ${wasmHash}`);
  console.log(`  🌐 Zero remote dependencies — 100% offline self-contained.`);
  console.log(`\nYou can now drag & drop or upload '${pkgFileName}' directly into Board Game Wallet!`);
}

main().catch((err) => {
  console.error("Failed to package game:", err);
  process.exit(1);
});
