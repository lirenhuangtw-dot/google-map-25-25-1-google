#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const CENTER_QUERY = process.env.CENTER_QUERY || "台北市南京東路三段89巷附近";
const CENTER_LAT = process.env.CENTER_LAT ? Number(process.env.CENTER_LAT) : null;
const CENTER_LNG = process.env.CENTER_LNG ? Number(process.env.CENTER_LNG) : null;
const RADIUS_METERS = Number(process.env.RADIUS_METERS || 1200);
const MIN_RATING = Number(process.env.MIN_RATING || 4.2);
const MIN_REVIEWS = Number(process.env.MIN_REVIEWS || 100);
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 80);
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(repoRoot, "restaurant-google-places.js");
const START_RANK = Number(process.env.START_RANK || 300);

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.priceLevel",
  "places.types",
  "places.primaryType",
  "places.googleMapsUri",
  "places.businessStatus"
].join(",");

const TEXT_QUERIES = [
  "餐廳",
  "美食",
  "中價位餐廳",
  "日式料理",
  "居酒屋",
  "餐酒館",
  "台菜",
  "熱炒",
  "鐵板燒",
  "海鮮餐廳",
  "義大利麵",
  "咖啡廳",
  "早午餐",
  "小吃"
];

if (!API_KEY) {
  exitWithUsage("Missing GOOGLE_MAPS_API_KEY.");
}

const center = await resolveCenter();
const existingNames = await loadExistingRestaurantNames();
const places = await searchPlaces(center);
const restaurants = places
  .filter(isOpenOrUnknown)
  .filter(isRestaurantLike)
  .filter((place) => (place.rating || 0) >= MIN_RATING)
  .filter((place) => (place.userRatingCount || 0) >= MIN_REVIEWS)
  .filter((place) => distanceMeters(center, place.location) <= RADIUS_METERS)
  .filter((place) => !isExistingName(existingNames, getName(place)))
  .sort((a, b) => {
    const scoreA = scorePlace(a);
    const scoreB = scorePlace(b);
    return scoreB - scoreA;
  })
  .slice(0, MAX_RESULTS)
  .map((place, index) => toRestaurant(place, center, START_RANK + index));

await fs.writeFile(OUTPUT_FILE, renderJs(restaurants));

console.log(`center: ${center.lat},${center.lng}`);
console.log(`fetched: ${places.length}`);
console.log(`written: ${restaurants.length}`);
console.log(`output: ${path.relative(repoRoot, OUTPUT_FILE)}`);

async function resolveCenter() {
  if (CENTER_LAT !== null && CENTER_LNG !== null && Number.isFinite(CENTER_LAT) && Number.isFinite(CENTER_LNG)) {
    return { lat: CENTER_LAT, lng: CENTER_LNG };
  }

  const body = {
    textQuery: CENTER_QUERY,
    languageCode: "zh-TW",
    regionCode: "TW",
    pageSize: 1
  };
  const data = await googlePost("https://places.googleapis.com/v1/places:searchText", body, "places.location");
  const location = data.places?.[0]?.location;
  if (!location) exitWithUsage("Could not resolve center. Set CENTER_LAT and CENTER_LNG explicitly.");
  return { lat: location.latitude, lng: location.longitude };
}

async function searchPlaces(center) {
  const results = new Map();

  await addNearbyResults(results, center);
  for (const query of TEXT_QUERIES) {
    await addTextResults(results, center, query);
  }

  return [...results.values()];
}

async function addNearbyResults(results, center) {
  const body = {
    includedTypes: ["restaurant", "cafe", "bar", "bakery", "meal_takeaway"],
    maxResultCount: 20,
    rankPreference: "POPULARITY",
    languageCode: "zh-TW",
    regionCode: "TW",
    locationRestriction: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: RADIUS_METERS
      }
    }
  };
  const data = await googlePost("https://places.googleapis.com/v1/places:searchNearby", body, FIELD_MASK);
  addPlaces(results, data.places || []);
}

async function addTextResults(results, center, query) {
  const body = {
    textQuery: `${CENTER_QUERY} ${query}`,
    languageCode: "zh-TW",
    regionCode: "TW",
    pageSize: 20,
    locationBias: {
      circle: {
        center: { latitude: center.lat, longitude: center.lng },
        radius: RADIUS_METERS
      }
    }
  };
  const data = await googlePost("https://places.googleapis.com/v1/places:searchText", body, FIELD_MASK);
  addPlaces(results, data.places || []);
}

function addPlaces(results, places) {
  for (const place of places) {
    const id = place.id || `${getName(place)}|${place.formattedAddress}`;
    if (id) results.set(id, place);
  }
}

async function googlePost(url, body, fieldMask) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": fieldMask
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

async function loadExistingRestaurantNames() {
  const files = [
    "restaurant-data.js",
    "restaurant-extra-near.js",
    "restaurant-more-local.js"
  ];
  const names = new Set();
  for (const file of files) {
    const text = await fs.readFile(path.join(repoRoot, file), "utf8");
    for (const match of text.matchAll(/name:"([^"]+)"/g)) {
      names.add(normalizeName(match[1]));
    }
  }
  return names;
}

function toRestaurant(place, center, rank) {
  const name = cleanDisplayName(getName(place));
  const straightLineMeters = Math.round(distanceMeters(center, place.location));
  const meters = estimatedWalkingMeters(straightLineMeters);
  const distance = walkingUpperMinutes(meters) <= 15 ? "near" : "mid";
  const priceTag = priceLevelToTag(place.priceLevel);
  const cuisine = inferCuisine(place);
  const address = place.formattedAddress || "";
  const rating = Number(place.rating || 0).toFixed(1);
  const reviews = place.userRatingCount || 0;

  return {
    rank,
    name,
    area: simplifyArea(address),
    distance,
    time: walkingTimeLabel(meters),
    cuisine,
    price: tagLabel(priceTag),
    googleRating: `${rating} (${reviews} 則)`,
    tags: [...new Set([distance, ...inferTags(place, cuisine), "google", priceTag])],
    why: `Google Maps 高評分附近餐廳，評分 ${rating}、評論 ${reviews} 則；步行距離估約 ${meters} 公尺。`,
    order: "以 Google Maps 最新照片、菜單與熱門評論挑選。",
    booking: "營業時間、訂位與臨時店休以 Google Maps 或店家公告為準。",
    destination: `${name} ${address}`.trim(),
    mapUrl: place.googleMapsUri || ""
  };
}

function isOpenOrUnknown(place) {
  return !place.businessStatus || place.businessStatus === "OPERATIONAL";
}

function isRestaurantLike(place) {
  const types = new Set(place.types || []);
  if (types.has("lodging") || types.has("hotel")) return false;
  return ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "food"].some((type) => types.has(type));
}

function scorePlace(place) {
  const rating = place.rating || 0;
  const reviews = place.userRatingCount || 0;
  return rating * 1000 + Math.log10(reviews + 1) * 100;
}

function getName(place) {
  return place.displayName?.text || "";
}

function cleanDisplayName(name) {
  let cleaned = name.split(/[|｜]/)[0].trim();
  cleaned = cleaned.replace(/[-－—]\s*(大安|台北|熱門|必吃|人氣|網美|酒吧|居酒屋|餐廳|聚餐|推薦|首選).*/u, "").trim();
  return cleaned || name;
}

function isExistingName(existingNames, name) {
  const normalized = normalizeName(cleanDisplayName(name));
  if (existingNames.has(normalized)) return true;
  for (const existing of existingNames) {
    if (normalized.length >= 6 && existing.includes(normalized)) return true;
    if (existing.length >= 6 && normalized.includes(existing)) return true;
    const core = cjkCore(normalized);
    const existingCore = cjkCore(existing);
    if (core.length >= 4 && existingCore.length >= 4 && (core.startsWith(existingCore.slice(0, 4)) || existingCore.startsWith(core.slice(0, 4)))) {
      return true;
    }
  }
  return false;
}

function cjkCore(name) {
  return name.replace(/[^\u4e00-\u9fff]/g, "");
}

function normalizeName(name) {
  return cleanDisplayName(name)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[｜|()（）店]/g, "");
}

function distanceMeters(center, location) {
  if (!location) return Number.POSITIVE_INFINITY;
  const lat2 = location.latitude;
  const lng2 = location.longitude;
  const earth = 6371000;
  const dLat = toRad(lat2 - center.lat);
  const dLng = toRad(lng2 - center.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(center.lat)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimatedWalkingMeters(straightLineMeters) {
  return Math.round(straightLineMeters * 1.4 + 50);
}

function toRad(value) {
  return (value * Math.PI) / 180;
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

function priceLevelToTag(priceLevel) {
  return {
    PRICE_LEVEL_FREE: "p1",
    PRICE_LEVEL_INEXPENSIVE: "p1",
    PRICE_LEVEL_MODERATE: "p2",
    PRICE_LEVEL_EXPENSIVE: "p3",
    PRICE_LEVEL_VERY_EXPENSIVE: "p4"
  }[priceLevel] || "p2";
}

function tagLabel(tag) {
  return { p1: "$", p2: "$$", p3: "$$$", p4: "$$$$" }[tag] || "$$";
}

function inferCuisine(place) {
  const text = [...(place.types || []), place.primaryType || "", getName(place)].join(" ").toLowerCase();
  if (/cafe|coffee|咖啡/.test(text)) return "咖啡/輕食";
  if (/bar|pub|居酒|酒/.test(text)) return "餐酒/酒吧";
  if (/bakery|bread|甜點|蛋糕|麵包/.test(text)) return "甜點/烘焙";
  if (/japanese|sushi|ramen|壽司|拉麵|日式/.test(text)) return "日式料理";
  if (/hotpot|火鍋|麻辣/.test(text)) return "火鍋";
  if (/korean|韓/.test(text)) return "韓式料理";
  if (/thai|泰/.test(text)) return "泰式料理";
  if (/italian|pizza|pasta|義式|義大利/.test(text)) return "義式料理";
  if (/steak|grill|鐵板|牛排/.test(text)) return "排餐/鐵板燒";
  if (/seafood|海鮮/.test(text)) return "海鮮/熱炒";
  if (/chinese|中式|小館/.test(text)) return "中式料理";
  return "餐廳";
}

function inferTags(place, cuisine) {
  const tags = [];
  if (/日式|壽司|拉麵/.test(cuisine)) tags.push("jp");
  if (/中式/.test(cuisine)) tags.push("cn");
  if (/台式|海鮮|熱炒/.test(cuisine)) tags.push("tw");
  if (/咖啡|餐酒|酒吧|甜點|義式|排餐/.test(cuisine)) tags.push("west");
  if (/餐酒|酒吧/.test(cuisine)) tags.push("bistro");
  if (/火鍋/.test(cuisine)) tags.push("hotpot");
  if ((place.userRatingCount || 0) >= 300) tags.push("popular");
  return tags;
}

function simplifyArea(address) {
  const match = address.match(/台北市(.{2,3}區)([^,，]*)/);
  if (!match) return "南京東路三段89巷附近";
  return `${match[1]}${match[2]}`.replace(/\d+樓.*/, "").slice(0, 18);
}

function renderJs(restaurants) {
  const lines = restaurants.map((item) => `  ${JSON.stringify(item)}`);
  return `const googlePlacesRestaurants = [\n${lines.join(",\n")}\n];\n`;
}

function exitWithUsage(message) {
  console.error(message);
  console.error("");
  console.error("Usage:");
  console.error("  GOOGLE_MAPS_API_KEY=... node scripts/import-google-places-restaurants.mjs");
  console.error("");
  console.error("Optional env:");
  console.error("  CENTER_LAT=25.x CENTER_LNG=121.x RADIUS_METERS=1200 MIN_RATING=4.2 MIN_REVIEWS=100 MAX_RESULTS=80");
  process.exit(1);
}
