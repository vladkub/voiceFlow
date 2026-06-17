import fs from "fs";
import path from "path";
import https from "https";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const version = "0.6.1";
const url = `https://existential.audio/downloads/BlackHole2ch-${version}.pkg`;
const outDir = path.resolve(__dirname, "..", "build");
const outFile = path.join(outDir, `BlackHole2ch-${version}.pkg`);

function download(targetUrl, dest) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    const req = https.get(targetUrl, (res) => {
      if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        file.close();
        fs.unlinkSync(dest);
        download(res.headers.location, dest).then(resolve, reject);
        return;
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        reject(new Error(`HTTP ${res.statusCode} for ${targetUrl}`));
        return;
      }
      res.pipe(file);
      file.on("finish", () => file.close(resolve));
    });
    req.on("error", reject);
    file.on("error", reject);
  });
}

fs.mkdirSync(outDir, { recursive: true });
if (fs.existsSync(outFile) && fs.statSync(outFile).size > 100000) {
  console.log(`BlackHole pkg already present: ${outFile}`);
  process.exit(0);
}

console.log(`Downloading ${url} ...`);
await download(url, outFile);
const mb = (fs.statSync(outFile).size / (1024 * 1024)).toFixed(2);
console.log(`Saved BlackHole pkg (${mb} MB): ${outFile}`);
