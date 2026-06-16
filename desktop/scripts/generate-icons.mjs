/**
 * Генерация icon.png / icon.ico для Windows из favicon.svg (логотип Voice Translator).
 * Запуск: node scripts/generate-icons.mjs
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import sharp from "sharp";
import pngToIco from "png-to-ico";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const desktopRoot = path.join(__dirname, "..");
const svgPath = path.join(desktopRoot, "favicon.svg");
const buildDir = path.join(desktopRoot, "icons");

async function main() {
  if (!fs.existsSync(svgPath)) {
    console.error("Missing", svgPath);
    process.exit(1);
  }
  fs.mkdirSync(buildDir, { recursive: true });
  const sizes = [16, 24, 32, 48, 64, 128, 256];
  const pngPaths = [];
  for (const size of sizes) {
    const out = path.join(buildDir, `icon-${size}.png`);
    await sharp(svgPath).resize(size, size).png().toFile(out);
    pngPaths.push(out);
  }
  await sharp(svgPath).resize(512, 512).png().toFile(path.join(buildDir, "icon.png"));
  const icoBuf = await pngToIco(pngPaths);
  fs.writeFileSync(path.join(buildDir, "icon.ico"), icoBuf);
  for (const p of pngPaths) {
    try {
      fs.unlinkSync(p);
    } catch {
      /* ignore */
    }
  }
  console.log("Wrote", path.join(buildDir, "icon.png"), "and icon.ico");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
