#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const files = [
  { file: "restaurant-google-places.js", variable: "googlePlacesRestaurants" },
  { file: "restaurant-threads.js", variable: "threadsRestaurants" }
];

for (const target of files) {
  const filePath = path.join(repoRoot, target.file);
  const source = await fs.readFile(filePath, "utf8");
  const restaurants = parseGeneratedArray(source, target.variable);
  let changed = 0;

  const updated = restaurants.map((item) => {
    const straightLineMeters = readDistanceMeters(item);
    if (!straightLineMeters) return item;

    const walkingMeters = estimatedWalkingMeters(straightLineMeters);
    const distance = walkingUpperMinutes(walkingMeters) <= 15 ? "near" : "mid";
    const previousDistance = item.distance;
    const tags = Array.isArray(item.tags) ? item.tags.filter((tag) => tag !== "near" && tag !== "mid" && tag !== "far") : [];
    changed += 1;

    return {
      ...item,
      distance,
      time: walkingTimeLabel(walkingMeters),
      tags: [distance, ...tags],
      why: rewriteWhy(item.why || "", walkingMeters, straightLineMeters, previousDistance)
    };
  });

  await fs.writeFile(filePath, renderJs(target.variable, updated), "utf8");
  console.log(`${target.file}: updated ${changed} distances`);
}

function parseGeneratedArray(source, variable) {
  const match = source.match(new RegExp(`const\\s+${variable}\\s*=\\s*\\[\\n([\\s\\S]*)\\n\\];\\s*$`));
  if (!match) throw new Error(`Could not parse ${variable}`);
  const body = match[1].trim();
  if (!body) return [];
  return body
    .split(/\n(?=\s*\{)/)
    .map((line) => JSON.parse(line.trim().replace(/,$/, "")));
}

function renderJs(variable, restaurants) {
  const lines = restaurants.map((item) => `  ${JSON.stringify(item)}`);
  return `const ${variable} = [\n${lines.join(",\n")}\n];\n`;
}

function readDistanceMeters(item) {
  const text = `${item.why || ""} ${item.destination || ""}`;
  const match = text.match(/距離中心約\s*([\d,]+)\s*公尺/);
  if (!match) return 0;
  return Number(match[1].replace(/,/g, ""));
}

function estimatedWalkingMeters(straightLineMeters) {
  return Math.round(straightLineMeters * 1.4 + 50);
}

function walkingTimeLabel(meters) {
  const minutes = walkingBaseMinutes(meters);
  return `步行約 ${Math.max(3, minutes - 2)}-${walkingUpperMinutes(meters)} 分鐘`;
}

function walkingBaseMinutes(meters) {
  return Math.max(3, Math.round(meters / 80));
}

function walkingUpperMinutes(meters) {
  return walkingBaseMinutes(meters) + 2;
}

function rewriteWhy(why, walkingMeters, straightLineMeters) {
  const replacement = `步行距離估約 ${walkingMeters} 公尺`;
  if (/(?:距離中心約|步行距離估約)\s*[\d,]+\s*公尺/.test(why)) {
    return why.replace(/(?:距離中心約|步行距離估約)\s*[\d,]+\s*公尺/, replacement);
  }
  return `${why} ${replacement}，原直線距離約 ${straightLineMeters} 公尺。`.trim();
}
