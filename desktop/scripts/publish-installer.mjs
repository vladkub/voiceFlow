import fs from "fs";
import path from "path";

const root = path.resolve(process.cwd(), "..");
const distDir = path.resolve(
  process.cwd(),
  process.env.DESKTOP_DIST_DIR && String(process.env.DESKTOP_DIST_DIR).trim()
    ? process.env.DESKTOP_DIST_DIR
    : "dist"
);
const outDir = path.resolve(root, "public", "downloads");
const outFile = path.resolve(outDir, "Voice-Translator-Setup.exe");
const outLatestYml = path.resolve(outDir, "latest.yml");
const outBlockmap = path.resolve(outDir, "Voice-Translator-Setup.exe.blockmap");

function latestInstallerFile() {
  if (!fs.existsSync(distDir)) return null;
  const files = fs.readdirSync(distDir)
    .map((name) => path.resolve(distDir, name))
    .filter((p) => fs.statSync(p).isFile() && p.toLowerCase().endsWith(".exe"));
  const exact = files.find((p) => path.basename(p) === "Voice-Translator-Setup.exe");
  if (exact) return exact;
  const nsisLike = files
    .filter((p) => /setup|installer/i.test(path.basename(p)))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return nsisLike[0] || null;
}

const src = latestInstallerFile();
if (!src) {
  console.error("No installer EXE found in desktop/dist. Run npm run dist:installer first.");
  process.exit(1);
}

fs.mkdirSync(outDir, { recursive: true });
fs.copyFileSync(src, outFile);
console.log(`Published installer: ${outFile}`);

const latestYml = path.resolve(distDir, "latest.yml");
if (fs.existsSync(latestYml)) {
  fs.copyFileSync(latestYml, outLatestYml);
  console.log(`Published manifest: ${outLatestYml}`);
} else {
  console.warn("latest.yml not found in desktop/dist — auto-update will not work until you rebuild with electron-builder.");
}

const blockmap = path.resolve(distDir, "Voice-Translator-Setup.exe.blockmap");
if (fs.existsSync(blockmap)) {
  fs.copyFileSync(blockmap, outBlockmap);
  console.log(`Published blockmap: ${outBlockmap}`);
}
