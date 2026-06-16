import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..");
const distDir = path.resolve(process.cwd(), "dist");
const outDir = path.resolve(root, "public", "downloads");
const outDmg = path.resolve(outDir, "Voice-Translator.dmg");

function latestDmgFile() {
  if (!fs.existsSync(distDir)) return null;
  const files = fs.readdirSync(distDir)
    .map((name) => path.resolve(distDir, name))
    .filter((p) => fs.statSync(p).isFile() && p.toLowerCase().endsWith(".dmg"));
  const exact = files.find((p) => path.basename(p) === "Voice-Translator.dmg");
  if (exact) return exact;
  const sorted = files.sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return sorted[0] || null;
}

const src = latestDmgFile();
if (!src) {
  console.error("No DMG found in desktop/dist. Run npm run dist:mac first (on macOS).");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, outDmg);
console.log(`Published macOS installer: ${outDmg}`);
