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
const RADIUS_METERS = Number(process.env.RADIUS_METERS || 9000);
const MIN_RATING = Number(process.env.MIN_RATING || 4.1);
const MIN_REVIEWS = Number(process.env.MIN_REVIEWS || 50);
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 100);
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(repoRoot, "google-baby-places.js");
const START_RANK = Number(process.env.START_RANK || 500);

const FIELD_MASK = [
  "places.id",
  "places.displayName",
  "places.formattedAddress",
  "places.location",
  "places.rating",
  "places.userRatingCount",
  "places.types",
  "places.primaryType",
  "places.googleMapsUri",
  "places.businessStatus"
].join(",");

const TEXT_QUERIES = [
  "親子景點",
  "親子館",
  "親子餐廳",
  "兒童遊戲場",
  "共融遊戲場",
  "公園 遊戲場",
  "沙坑 公園",
  "室內遊樂場",
  "兒童樂園",
  "博物館 兒童",
  "兒童圖書館",
  "親子友善 咖啡",
  "雨天 親子景點",
  "室內親子景點",
  "河濱公園",
  "大草地 公園"
];

if (!API_KEY) {
  exitWithUsage("Missing GOOGLE_MAPS_API_KEY.");
}

const center = await resolveCenter();
const existingNames = await loadExistingSpotNames();
const places = await searchPlaces(center);
const imported = places
  .filter(isOpenOrUnknown)
  .filter(isKidPlaceLike)
  .filter((place) => (place.rating || 0) >= MIN_RATING)
  .filter((place) => (place.userRatingCount || 0) >= MIN_REVIEWS)
  .filter((place) => distanceMeters(center, place.location) <= RADIUS_METERS)
  .filter((place) => !isExistingName(existingNames, getName(place)))
  .sort((a, b) => scorePlace(b) - scorePlace(a))
  .slice(0, MAX_RESULTS)
  .map((place, index) => toSpot(place, center, START_RANK + index));

await fs.writeFile(OUTPUT_FILE, renderJs(imported));

console.log(`center: ${center.lat},${center.lng}`);
console.log(`fetched: ${places.length}`);
console.log(`written: ${imported.length}`);
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
    includedTypes: ["park", "museum", "library", "tourist_attraction", "amusement_park", "shopping_mall"],
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

async function loadExistingSpotNames() {
  const files = ["script.js", "official-near-parks.js"];
  const names = new Set();
  for (const file of files) {
    const text = await fs.readFile(path.join(repoRoot, file), "utf8");
    for (const match of text.matchAll(/name(?::|":)\s*"([^"]+)"/g)) {
      names.add(normalizeName(match[1]));
    }
  }
  return names;
}

function toSpot(place, center, rank) {
  const name = cleanDisplayName(getName(place));
  const meters = Math.round(distanceMeters(center, place.location));
  const type = inferType(place);
  const distance = inferDistance(meters);
  const tags = [...new Set([type === "indoor" ? "室內" : "室外", "Google高評分", ...inferTags(place, type), distanceLabel(distance)])];
  const rating = Number(place.rating || 0).toFixed(1);
  const reviews = place.userRatingCount || 0;
  const category = inferCategory(place);
  const address = place.formattedAddress || "";

  return {
    rank,
    name,
    area: simplifyArea(address),
    type,
    distance,
    time: timeLabel(meters, distance),
    tags,
    why: `Google Maps 高評分親子備案，評分 ${rating}、評論 ${reviews} 則；類型偏 ${category}，距離中心約 ${meters} 公尺。`,
    toddler: toddlerNote(type, category),
    traffic: trafficNote(meters, distance),
    destination: `${name} ${address}`.trim(),
    mapUrl: place.googleMapsUri || ""
  };
}

function isOpenOrUnknown(place) {
  return !place.businessStatus || place.businessStatus === "OPERATIONAL";
}

function isKidPlaceLike(place) {
  const types = new Set(place.types || []);
  const text = `${getName(place)} ${(place.types || []).join(" ")} ${place.formattedAddress || ""}`;
  const name = getName(place);
  if (types.has("lodging") || types.has("hotel") || types.has("night_club") || types.has("bar")) return false;
  if (types.has("train_station") || types.has("subway_station") || types.has("transit_station")) return false;
  if ((types.has("restaurant") || types.has("cafe")) && !/親子|兒童/.test(name)) return false;
  if (/成人|酒吧|夜店|酒店|旅館|汽車旅館|女生運動|捷運站|觀光夜市|夜市|疏散門|股份有限公司|郵筒/.test(text)) return false;
  if (/親子|兒童|遊戲場|公園|博物館|美術館|圖書館|樂園|科學|天文|河濱|草地|沙坑|共融|育兒/.test(text)) return true;
  return ["park", "museum", "library", "tourist_attraction", "amusement_park", "shopping_mall"].some((type) => types.has(type));
}

function scorePlace(place) {
  const rating = place.rating || 0;
  const reviews = place.userRatingCount || 0;
  const typeBonus = /親子|兒童|遊戲場|公園|圖書館|博物館/.test(getName(place)) ? 150 : 0;
  return rating * 1000 + Math.log10(reviews + 1) * 100 + typeBonus;
}

function getName(place) {
  return place.displayName?.text || "";
}

function cleanDisplayName(name) {
  let cleaned = name.split(/[|｜]/)[0].trim();
  cleaned = cleaned.replace(/[-－—]\s*(親子|兒童|熱門|推薦|景點).*/u, "").trim();
  return cleaned || name;
}

function isExistingName(existingNames, name) {
  const normalized = normalizeName(name);
  if (existingNames.has(normalized)) return true;
  for (const existing of existingNames) {
    if (normalized.length >= 5 && existing.includes(normalized)) return true;
    if (existing.length >= 5 && normalized.includes(existing)) return true;
  }
  return false;
}

function normalizeName(name) {
  return cleanDisplayName(name)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[｜|()（）\-_－—]/g, "");
}

function inferType(place) {
  const text = `${getName(place)} ${(place.types || []).join(" ")}`;
  if (/Play Center|親子餐廳|親子空間|親子館|親子樂園|遊樂園-|樂米樂園|FUN星球|喵店長|Weplay|hi kidsroom|蟲蟲巴斯|觀景台|冰上樂園|圖書館|博物館|美術館|科學|天文|室內|mall|shopping_mall|museum|library/i.test(text)) return "indoor";
  return "outdoor";
}

function inferDistance(meters) {
  if (meters <= 6500) return "near";
  if (meters <= 18000) return "mid";
  return "far";
}

function inferCategory(place) {
  const text = `${getName(place)} ${(place.types || []).join(" ")}`;
  if (/Play Center|親子空間|親子館|室內遊樂|遊戲愛樂園|樂米樂園|FUN星球|喵店長|Weplay|hi kidsroom|蟲蟲巴斯|冰上樂園|樂園/i.test(text)) return "室內放電";
  if (/親子餐廳/.test(text)) return "親子餐廳";
  if (/圖書館|library/.test(text)) return "圖書館";
  if (/博物館|美術館|科學|天文|museum/.test(text)) return "展館";
  if (/河濱|草地/.test(text)) return "大空間";
  if (/公園|遊戲場|park/.test(text)) return "公園遊具";
  if (/shopping_mall|mall|百貨/.test(text)) return "百貨雨備";
  return "親子景點";
}

function inferTags(place, type) {
  const text = `${getName(place)} ${(place.types || []).join(" ")}`;
  const tags = [];
  if (type === "indoor") tags.push("雨天");
  if (/親子餐廳/.test(text)) tags.push("餐飲");
  if (/遊戲場|遊具|共融|playground|park/.test(text)) tags.push("遊具");
  if (/沙坑|沙/.test(text)) tags.push("沙坑");
  if (/親子館|育兒|0-6/.test(text)) tags.push("0-6 歲");
  if (/圖書館|library/.test(text)) tags.push("閱讀");
  if (/博物館|美術館|科學|天文|museum/.test(text)) tags.push("展館");
  if (/河濱|草地|park/.test(text)) tags.push("推車");
  return tags;
}

function toddlerNote(type, category) {
  if (category === "公園遊具") return "先玩低滑梯、搖搖馬、沙坑等低挫折設施；大型攀爬架由大人近距離陪同。";
  if (category === "室內放電") return "出門前確認預約、身高限制、襪子規定與尖峰人潮；兩歲以 1-2 小時為上限。";
  if (category === "展館") return "兩歲寶寶以光影、互動裝置和短時間探索為主，不建議把展館排太滿。";
  if (category === "圖書館") return "適合安靜收尾和雨天備案，帶借書證或台北市圖 APP。";
  if (type === "indoor") return "雨天或太熱時可當備案，出門前看 Google Maps 當日營業和評論。";
  return "戶外點請避開正午曝曬，帶水、防蚊、帽子與替換衣物。";
}

function trafficNote(meters, distance) {
  if (distance === "near") return `距離中心約 ${meters} 公尺，多數情況開車/計程車 25 分鐘內；實際時間以 Google Maps 為準。`;
  if (distance === "mid") return `距離中心約 ${meters} 公尺，建議開車或捷運轉乘，抓 25-60 分鐘較保守。`;
  return `距離中心約 ${meters} 公尺，適合安排半日以上，不建議臨時短行程。`;
}

function timeLabel(meters, distance) {
  if (distance === "near") return "車程約 10-25 分鐘";
  if (distance === "mid") return "交通約 25-60 分鐘";
  return "交通約 60 分鐘以上";
}

function distanceLabel(distance) {
  return { near: "近", mid: "中", far: "遠" }[distance] || distance;
}

function simplifyArea(address) {
  const match = address.match(/台北市(.{2,3}區)([^,，]*)/);
  if (!match) return "台北市";
  return `${match[1]}${match[2]}`.replace(/\d+樓.*/, "").slice(0, 18);
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

function toRad(value) {
  return (value * Math.PI) / 180;
}

function renderJs(spots) {
  const lines = spots.map((item) => `  ${JSON.stringify(item)}`);
  return `const googleBabyPlaces = [\n${lines.join(",\n")}\n];\n`;
}

function exitWithUsage(message) {
  console.error(message);
  console.error("");
  console.error("Usage:");
  console.error("  GOOGLE_MAPS_API_KEY=... node scripts/import-google-baby-places.mjs");
  console.error("");
  console.error("Optional env:");
  console.error("  CENTER_LAT=25.x CENTER_LNG=121.x RADIUS_METERS=9000 MIN_RATING=4.1 MIN_REVIEWS=50 MAX_RESULTS=100");
  process.exit(1);
}
