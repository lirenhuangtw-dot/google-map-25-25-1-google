#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const CENTER = { lat: 25.052267, lng: 121.538824 };
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(repoRoot, "baby-taipei-google.js");
const OUTPUT_VARIABLE = "taipeiGoogleBabyPlaces";
const START_RANK = Number(process.env.START_RANK || 800);
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 120);
const MIN_RATING = Number(process.env.MIN_RATING || 4.2);
const MIN_REVIEWS = Number(process.env.MIN_REVIEWS || 40);

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
  "places.businessStatus",
  "places.reviews",
  "places.editorialSummary"
].join(",");

const TEXT_QUERIES = [
  "台北市 親子景點",
  "台北市 兩歲 親子景點",
  "台北市 室內 親子景點",
  "台北市 雨天 親子景點",
  "台北市 親子館",
  "台北市 室內遊樂場 兒童",
  "台北市 兒童遊戲場",
  "台北市 共融遊戲場",
  "台北市 沙坑 公園",
  "台北市 鞦韆 公園",
  "台北市 大草地 公園",
  "台北市 河濱公園 親子",
  "台北市 博物館 兒童",
  "台北市 美術館 兒童",
  "台北市 科學教育 兒童",
  "台北市 兒童圖書館",
  "台北市 動物 親子景點",
  "台北市 親子餐廳 遊戲區",
  "台北市 北投 親子景點",
  "台北市 士林 親子景點",
  "台北市 內湖 親子景點",
  "台北市 文山 親子景點",
  "台北市 南港 親子景點"
];

const ONLINE_RECOMMENDED = [
  { query: "國立臺灣科學教育館 台北 親子", note: "2026 親子景點整理常列為台北室內雨備與科學互動重點。" },
  { query: "臺北市立兒童新樂園 台北 親子", note: "2026 親子景點整理常列為台北主題樂園與戶外放電重點。" },
  { query: "臺北典藏植物園 親子", note: "2026 室內景點整理常列為花博周邊雨天備案。" },
  { query: "國家鐵道博物館 台北 親子", note: "2026 室內景點整理常列為火車主題親子點。" },
  { query: "臺北市立天文科學教育館 親子", note: "2026 親子景點整理常列為雨天展館備案。" },
  { query: "台北市立動物園 親子", note: "2026 親子景點整理常列為台北大型戶外親子點。" },
  { query: "花博公園 舞蝶共融遊戲場", note: "親子公園整理常列為交通方便的戶外遊具點。" },
  { query: "大安森林公園 兒童遊戲場", note: "親子公園整理常列為市區大草地與推車友善點。" }
];

if (!API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY.");
  process.exit(1);
}

const existingNames = await loadExistingSpotNames();
const onlineNotes = new Map();
const results = new Map();

for (const query of TEXT_QUERIES) {
  await addTextResults(results, query);
}

for (const item of ONLINE_RECOMMENDED) {
  for (const place of await textSearch(item.query, 3)) {
    const id = place.id || `${getName(place)}|${place.formattedAddress}`;
    if (!id) continue;
    results.set(id, place);
    onlineNotes.set(id, item.note);
    break;
  }
}

const candidates = uniqueByName([...results.entries()]
  .map(([id, place]) => ({ id, place, onlineNote: onlineNotes.get(id) || "" }))
  .filter(({ place }) => isOpenOrUnknown(place))
  .filter(({ place }) => isTaipeiCity(place))
  .filter(({ place }) => isKidPlaceLike(place))
  .filter(({ place }) => (place.rating || 0) >= MIN_RATING)
  .filter(({ place, onlineNote }) => onlineNote || (place.userRatingCount || 0) >= MIN_REVIEWS)
  .filter(({ place }) => !isExistingName(existingNames, getName(place)))
  .sort((a, b) => scorePlace(b.place, b.onlineNote) - scorePlace(a.place, a.onlineNote))
).map(({ place, onlineNote }) => toSpot(place, 0, onlineNote));

const imported = selectBalanced(candidates, MAX_RESULTS).map((item, index) => ({
  ...item,
  rank: START_RANK + index
}));

await fs.writeFile(OUTPUT_FILE, renderJs(imported));
console.log(`fetched: ${results.size}`);
console.log(`candidates: ${candidates.length}`);
console.log(`written: ${imported.length}`);
console.log(`output: ${path.relative(repoRoot, OUTPUT_FILE)}`);

async function addTextResults(results, query) {
  for (const place of await textSearch(query, 20)) {
    const id = place.id || `${getName(place)}|${place.formattedAddress}`;
    if (id) results.set(id, place);
  }
}

async function textSearch(query, pageSize) {
  const body = {
    textQuery: query,
    languageCode: "zh-TW",
    regionCode: "TW",
    pageSize,
    locationBias: {
      circle: {
        center: { latitude: CENTER.lat, longitude: CENTER.lng },
        radius: 18000
      }
    }
  };
  const data = await googlePost("https://places.googleapis.com/v1/places:searchText", body, FIELD_MASK);
  return data.places || [];
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
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}: ${await response.text()}`);
  return response.json();
}

async function loadExistingSpotNames() {
  const files = ["google-baby-places.js", "baby-user-recommended.js", "official-near-parks.js"];
  const names = new Set();
  for (const file of files) {
    const text = await fs.readFile(path.join(repoRoot, file), "utf8");
    for (const match of text.matchAll(/(?:name:|"name":)\s*"([^"]+)"/g)) names.add(normalizeName(match[1]));
  }
  return names;
}

function toSpot(place, rank, onlineNote) {
  const name = cleanDisplayName(getName(place));
  const meters = Math.round(distanceMeters(CENTER, place.location));
  const type = inferType(place);
  const category = inferCategory(place);
  const distance = inferDistance(meters);
  const rating = Number(place.rating || 0).toFixed(1);
  const reviews = place.userRatingCount || 0;
  const tags = [...new Set([
    type === "indoor" ? "室內" : "室外",
    "Google高評分",
    onlineNote ? "網路推薦" : "",
    ...inferTags(place, type, category, rating, reviews),
    distanceLabel(distance)
  ].filter(Boolean))];
  const summary = summarizeReviews(place, category, tags, onlineNote);

  return {
    rank,
    name,
    area: simplifyArea(place.formattedAddress || ""),
    type,
    distance,
    time: timeLabel(distance),
    tags,
    why: `${onlineNote ? `${onlineNote} ` : ""}Google Maps 評分 ${rating}、評論 ${reviews.toLocaleString("zh-TW")} 則；${summary}距離中心約 ${formatDistance(meters)}，分類為${distanceLabel(distance)}。`,
    toddler: toddlerTip(type, category, tags),
    traffic: trafficTip(distance, meters),
    destination: `${name} ${place.formattedAddress || ""}`.trim(),
    mapUrl: place.googleMapsUri || ""
  };
}

function isOpenOrUnknown(place) {
  return !place.businessStatus || place.businessStatus === "OPERATIONAL";
}

function isTaipeiCity(place) {
  return /(?:台北市|臺北市)/.test(place.formattedAddress || "");
}

function isKidPlaceLike(place) {
  const types = new Set(place.types || []);
  const text = `${getName(place)} ${(place.types || []).join(" ")} ${place.primaryType || ""}`;
  if (types.has("lodging") || types.has("hotel") || types.has("night_club") || types.has("bar")) return false;
  if ((types.has("restaurant") || types.has("cafe")) && !/親子|兒童|遊戲|樂園/.test(text)) return false;
  if (/成人|夜店|酒店|旅館|汽車旅館|補習|托嬰|月中|停車|郵筒|市場/.test(text)) return false;
  if (/親子|兒童|遊戲場|公園|博物館|美術館|圖書館|樂園|科學|天文|河濱|草地|沙坑|共融|育兒|動物園|植物園|鐵道|水族|自然/.test(text)) return true;
  return ["park", "museum", "library", "tourist_attraction", "amusement_park", "zoo", "aquarium"].some((type) => types.has(type));
}

function inferType(place) {
  const text = `${getName(place)} ${(place.types || []).join(" ")} ${place.primaryType || ""}`;
  if (/親子館|室內|Play Center|遊戲愛樂園|卡通尼|大魯閣|PaPark|樂米|SNOOPY|FUN星球|球池/i.test(text)) return "indoor";
  if (/博物館|美術館|科學|天文|圖書館|鐵道|植物園|水族|museum|library|aquarium/i.test(text)) return "indoor";
  if (/動物園|公園|遊戲場|共融|河濱|草地|自然|森林|park|zoo/i.test(text)) return "outdoor";
  return "outdoor";
}

function inferCategory(place) {
  const text = `${getName(place)} ${(place.types || []).join(" ")} ${place.primaryType || ""}`;
  if (/親子館|育兒|0-6/.test(text)) return "親子館";
  if (/室內|Play|樂園|遊戲愛樂園/i.test(text)) return "室內放電";
  if (/圖書館|library/.test(text)) return "圖書館";
  if (/博物館|美術館|科學|天文|鐵道|museum/.test(text)) return "展館";
  if (/動物園|zoo|動物/.test(text)) return "動物";
  if (/河濱|草地|大湖|森林/.test(text)) return "大空間";
  if (/公園|遊戲場|park/.test(text)) return "公園遊具";
  if (/親子餐廳/.test(text)) return "親子餐廳";
  return "親子景點";
}

function inferTags(place, type, category, rating, reviews) {
  const text = `${getName(place)} ${(place.types || []).join(" ")} ${place.primaryType || ""}`;
  const tags = [];
  if (type === "indoor") tags.push("雨天");
  if (/公園遊具|室內放電|親子館|遊戲場|遊具|共融|playground|park/.test(`${category} ${text}`)) tags.push("遊具");
  if (/沙坑|戲沙|砂坑|沙灘/.test(text)) tags.push("沙坑");
  if (/鞦韆|秋千/.test(text)) tags.push("鞦韆");
  if (/親子館|育兒|0-6/.test(text)) tags.push("0-6 歲");
  if (/圖書館|library/.test(text)) tags.push("閱讀");
  if (/博物館|美術館|科學|天文|鐵道|museum/.test(text)) tags.push("展館");
  if (/動物|zoo|aquarium|水族/.test(text)) tags.push("動物/農場");
  if (/河濱|草地|森林|大湖|park/.test(text)) tags.push("推車", "大草地");
  if (/捷運|車站|station/.test(text)) tags.push("捷運");
  if (Number(rating) >= 4.5) tags.push("4.5+");
  if (reviews >= 500) tags.push("評論多");
  return tags;
}

function summarizeReviews(place, category, tags, onlineNote) {
  const text = (place.reviews || []).map((review) => review.text?.text || "").join(" ");
  const points = [];
  const add = (pattern, label) => pattern.test(text) && !points.includes(label) && points.push(label);
  add(/小孩|孩子|小朋友|親子|寶寶|幼兒/, "親子友善");
  add(/遊戲|溜滑梯|攀爬|球池|沙坑|鞦韆|放電/, "放電效率");
  add(/室內|冷氣|下雨|雨天|遮蔭|太陽/, "天氣備案");
  add(/乾淨|舒服|空間|環境|寬敞/, "環境舒適度");
  add(/停車|捷運|交通|方便/, "交通便利度");
  add(/動物|魚|鳥|生態|植物|自然/, "觀察體驗");
  if (!points.length) {
    if (tags.includes("遊具")) points.push("遊具放電");
    if (tags.includes("雨天")) points.push("雨天備案");
    if (tags.includes("大草地")) points.push("戶外跑跳");
    if (tags.includes("展館")) points.push("展館互動");
  }
  return `${onlineNote ? "網路推薦與 Google 評論交叉看，" : "Google 評論摘要："}${points.slice(0, 3).join("、") || category}是主要亮點。`;
}

function toddlerTip(type, category, tags) {
  if (tags.includes("0-6 歲")) return "適合兩歲寶寶短時間放電，先確認預約、入場時段與襪子規定。";
  if (type === "indoor") return "雨天或太熱時可當備案，兩歲寶寶抓 1-2 小時，不要排太滿。";
  if (tags.includes("沙坑")) return "帶挖沙工具、濕紙巾與替換衣物，避開正午曝曬。";
  if (category === "大空間") return "適合推車散步和跑跳，帶水、防蚊、帽子與野餐墊。";
  return "戶外點請避開正午曝曬，先玩低挫折遊具，大型攀爬架由大人近距離陪同。";
}

function trafficTip(distance, meters) {
  if (distance === "near") return `距離中心約 ${formatDistance(meters)}，通常可列入近距離備案；實際時間以 Google Maps 為準。`;
  if (distance === "mid") return `距離中心約 ${formatDistance(meters)}，建議開車或捷運/公車簡單轉乘，抓 25-60 分鐘較保守。`;
  return `距離中心約 ${formatDistance(meters)}，適合完整半日或一日行程；出發前先看路況。`;
}

function inferDistance(meters) {
  if (meters <= 6500) return "near";
  if (meters <= 18000) return "mid";
  return "far";
}

function timeLabel(distance) {
  if (distance === "near") return "車程約 10-25 分鐘";
  if (distance === "mid") return "交通約 25-60 分鐘";
  return "約 60-90 分鐘以上";
}

function distanceLabel(distance) {
  return { near: "近", mid: "中", far: "遠" }[distance] || distance;
}

function formatDistance(meters) {
  if (meters < 1000) return `${meters} 公尺`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

function simplifyArea(address) {
  const match = address.match(/(?:台北市|臺北市)(.{2,3}區)/);
  return match ? `臺北市${match[1]}` : "臺北市";
}

function scorePlace(place, onlineNote) {
  const rating = place.rating || 0;
  const reviews = place.userRatingCount || 0;
  return rating * 1000 + Math.log10(reviews + 1) * 160 + (onlineNote ? 700 : 0);
}

function uniqueByName(items) {
  const best = new Map();
  for (const item of items) {
    const key = normalizeName(getName(item.place));
    const current = best.get(key);
    if (!current || scorePlace(item.place, item.onlineNote) > scorePlace(current.place, current.onlineNote)) best.set(key, item);
  }
  return [...best.values()];
}

function selectBalanced(candidates, maxResults) {
  const selected = [];
  const seen = new Set();
  const add = (item) => {
    const key = normalizeName(item.name);
    if (seen.has(key) || selected.length >= maxResults) return;
    seen.add(key);
    selected.push(item);
  };
  const sorted = [...candidates].sort((a, b) => spotSelectionScore(b) - spotSelectionScore(a));
  sorted.filter((item) => item.tags.includes("網路推薦")).forEach(add);
  sorted.filter((item) => item.type === "indoor").slice(0, 45).forEach(add);
  sorted.filter((item) => item.type === "outdoor").slice(0, 75).forEach(add);
  sorted.forEach(add);
  return selected.slice(0, maxResults);
}

function spotSelectionScore(item) {
  const rating = Number(String(item.why || "").match(/評分 (\d(?:\.\d)?)/)?.[1] || 0);
  const reviewText = String(item.why || "").match(/評論 ([\d,]+)/)?.[1] || "0";
  const reviews = Number(reviewText.replace(/,/g, ""));
  return rating * 1000 + Math.log10(reviews + 1) * 140 + (item.tags.includes("網路推薦") ? 700 : 0);
}

function getName(place) {
  return place.displayName?.text || "";
}

function cleanDisplayName(name) {
  let cleaned = name.split(/[|｜]/)[0].replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/[（(][^）)]{14,}[）)]/g, "").trim();
  cleaned = cleaned.replace(/\s*[-－—]\s*(台北|親子|兒童|景點|推薦|熱門).*/u, "").trim();
  return cleaned || name;
}

function normalizeName(name) {
  return cleanDisplayName(name).toLowerCase().replace(/\s+/g, "").replace(/[｜|()（）\-_－—・.．]/g, "");
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

function distanceMeters(center, location) {
  if (!location) return Number.POSITIVE_INFINITY;
  const earth = 6371000;
  const dLat = toRad(location.latitude - center.lat);
  const dLng = toRad(location.longitude - center.lng);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(center.lat)) * Math.cos(toRad(location.latitude)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function renderJs(spots) {
  const lines = spots.map((item) => `  ${JSON.stringify(item)}`);
  return `const ${OUTPUT_VARIABLE} = [\n${lines.join(",\n")}\n];\n`;
}
