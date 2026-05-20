#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const jobs = [
  ["餐廳", "import-google-places-restaurants.mjs"],
  ["酒吧", "import-google-places-restaurants.mjs", {
    SOURCE_TAG: "bar",
    OUTPUT_FILE: path.join(__dirname, "..", "restaurant-bars.js"),
    OUTPUT_VARIABLE: "googleBarsRestaurants",
    START_RANK: "500",
    RADIUS_METERS: "2200",
    MIN_RATING: "4.3",
    MIN_REVIEWS: "30",
    MAX_RESULTS: "45",
    INCLUDED_TYPES: "bar,restaurant,cafe",
    TEXT_QUERIES: "酒吧|餐酒館|bar|cocktail bar|speakeasy|居酒屋|小酒館|lounge bar"
  }],
  ["Threads 餐廳", "import-threads-restaurants.mjs"],
  ["寶寶景點", "import-google-baby-places.mjs"]
];

for (const [label, script, extraEnv] of jobs) {
  console.log(`\n== 更新${label} ==`);
  await runNodeScript(path.join(__dirname, script), extraEnv);
}

function runNodeScript(scriptPath, extraEnv = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [scriptPath], {
      stdio: "inherit",
      env: { ...process.env, ...extraEnv }
    });
    child.on("exit", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`${path.basename(scriptPath)} exited with ${code}`));
    });
    child.on("error", reject);
  });
}
