import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const here = path.dirname(fileURLToPath(import.meta.url));
const file = path.join(here, "..", "build", "Install TalkPilot.command");
if (!fs.existsSync(file)) {
  console.error("Missing:", file);
  process.exit(1);
}
fs.chmodSync(file, 0o755);
console.log("chmod +x:", file);
