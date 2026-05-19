#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jobs = [
  ["餐廳", "import-google-places-restaurants.mjs"],
  ["寶寶景點", "import-google-baby-places.mjs"]
];

for (const [label, script] of jobs) {
  console.log(`\n== 更新${label} ==`);
  await runNodeScript(path.join(__dirname, script));
}

function runNodeScript(scriptPath) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      env: process.env
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exited with ${code}`));
    });
    child.on("error", reject);
  });
}
