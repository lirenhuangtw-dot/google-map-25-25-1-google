#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const CENTER = { lat: 25.052267, lng: 121.538824 };
const OUTPUT_FILE = process.env.OUTPUT_FILE || path.join(repoRoot, "restaurant-taipei-google.js");
const OUTPUT_VARIABLE = "taipeiGoogleRestaurants";
const START_RANK = Number(process.env.START_RANK || 600);
const MAX_RESULTS = Number(process.env.MAX_RESULTS || 120);
const MIN_RATING = Number(process.env.MIN_RATING || 4.5);
const MIN_REVIEWS = Number(process.env.MIN_REVIEWS || 300);

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
  "places.businessStatus",
  "places.reviews",
  "places.editorialSummary"
].join(",");

const TEXT_QUERIES = [
  "台北市 高評價 餐廳",
  "台北市 4.8 餐廳",
  "台北市 高評價 聚餐餐廳",
  "台北市 高評價 約會餐廳",
  "台北市 高評價 台菜",
  "台北市 高評價 日式料理",
  "台北市 高評價 韓式料理",
  "台北市 高評價 泰式料理",
  "台北市 高評價 印度餐廳",
  "台北市 高評價 義大利餐廳",
  "台北市 高評價 火鍋",
  "台北市 高評價 燒肉",
  "台北市 高評價 海鮮餐廳",
  "台北市 高評價 餐酒館",
  "台北市 高評價 咖啡廳",
  "台北市 高評價 甜點",
  "台北市 高評價 早午餐",
  "台北市 米其林 必比登 餐廳",
  "台北市 大安區 高評價 餐廳",
  "台北市 中山區 高評價 餐廳",
  "台北市 松山區 高評價 餐廳",
  "台北市 信義區 高評價 餐廳",
  "台北市 中正區 高評價 餐廳",
  "台北市 大同區 高評價 餐廳",
  "台北市 萬華區 高評價 餐廳",
  "台北市 內湖區 高評價 餐廳",
  "台北市 士林區 高評價 餐廳",
  "台北市 北投區 高評價 餐廳",
  "台北市 文山區 高評價 餐廳",
  "台北市 南港區 高評價 餐廳",
  "台北市 天母 高評價 餐廳",
  "台北市 大直 高評價 餐廳",
  "台北市 內湖 高評價 聚餐餐廳",
  "台北市 士林 高評價 火鍋",
  "台北市 北投 高評價 台菜",
  "台北市 文山 高評價 咖啡廳",
  "台北市 南港 高評價 餐酒館"
];

const ONLINE_RECOMMENDED = [
  { query: "竹苑 shabu 高級鍋物 台北", note: "東區網路推薦整理列為高級火鍋與約會聚餐選擇。" },
  { query: "Botega del Vin 台北", note: "東區網路推薦整理列為北義餐酒與約會聚餐選擇。" },
  { query: "杯子裡的貓 台北", note: "東區網路推薦整理列為貓咪咖啡與輕食選擇。" },
  { query: "ABV 地中海餐酒館 光復店", note: "東區網路推薦整理列為地中海餐酒與聚餐選擇。" },
  { query: "荷李活茶街 台北", note: "東區網路推薦整理列為港式茶餐廳選擇。" },
  { query: "醉好 台北 餐酒館", note: "東區網路推薦整理列為炸雞、義大利麵與調酒選擇。" },
  { query: "串燒殿 台北 東區", note: "東區網路推薦整理列為居酒屋與聚餐選擇。" },
  { query: "Waiting Bistro 台北", note: "東區網路推薦整理列為義大利麵與聚餐選擇。" },
  { query: "Ariel lee 李氏 Cafe 台北", note: "大安區 Dcard/PTT 整理文列為義大利麵熱門選擇。" },
  { query: "二本松涮涮屋 本館 台北", note: "大安區網路推薦整理列為高級鍋物選擇。" },
  { query: "小小樹食 0km 山物所 台北", note: "大安區網路推薦整理列為蔬食與特色空間選擇。" },
  { query: "Solo Pasta 台北", note: "大安區網路推薦整理列為義大利麵熱門選擇。" },
  { query: "竹苑 Shabu 台北 忠孝敦化", note: "大安區網路推薦整理列為高級海陸火鍋選擇。" },
  { query: "雙月食品社 森林公園店", note: "大安區網路推薦整理列為平價雞湯與小吃選擇。" },
  { query: "倉廩 CANG LIN 台北", note: "媒體近期推薦為東區低調台味餐酒與麵食選擇。" },
  { query: "燒鳥すみか 台北", note: "媒體近期推薦為東區燒鳥與板前料理選擇。" }
];

if (!API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY.");
  process.exit(1);
}

const existingNames = await loadExistingRestaurantNames();
const onlineNotes = new Map();
const results = new Map();

for (const query of TEXT_QUERIES) {
  await addTextResults(results, query);
}

for (const item of ONLINE_RECOMMENDED) {
  const places = await textSearch(item.query, 3);
  for (const place of places) {
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
  .filter(({ place }) => isRestaurantLike(place))
  .filter(({ place }) => isTaipeiCity(place))
  .filter(({ place }) => (place.rating || 0) >= MIN_RATING)
  .filter(({ place, onlineNote }) => onlineNote || (place.userRatingCount || 0) >= MIN_REVIEWS)
  .filter(({ place }) => !isExistingName(existingNames, getName(place)))
  .sort((a, b) => scorePlace(b.place, b.onlineNote) - scorePlace(a.place, a.onlineNote))
).map(({ place, onlineNote }) => toRestaurant(place, 0, onlineNote));

const restaurants = selectBalancedRestaurants(candidates, MAX_RESULTS).map((item, index) => ({
  ...item,
  rank: START_RANK + index
}));

await fs.writeFile(OUTPUT_FILE, renderJs(restaurants));
console.log(`fetched: ${results.size}`);
console.log(`candidates: ${candidates.length}`);
console.log(`written: ${restaurants.length}`);
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
        radius: 12000
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
    "restaurant-more-local.js",
    "restaurant-google-places.js",
    "restaurant-bars.js",
    "restaurant-threads.js"
  ];
  const names = new Set();
  for (const file of files) {
    const text = await fs.readFile(path.join(repoRoot, file), "utf8");
    for (const match of text.matchAll(/(?:name:|"name":)"([^"]+)"/g)) {
      names.add(normalizeName(match[1]));
    }
  }
  return names;
}

function uniqueByName(items) {
  const best = new Map();
  for (const item of items) {
    const key = normalizeName(getName(item.place));
    const current = best.get(key);
    if (!current || scorePlace(item.place, item.onlineNote) > scorePlace(current.place, current.onlineNote)) {
      best.set(key, item);
    }
  }
  return [...best.values()];
}

function selectBalancedRestaurants(candidates, maxResults) {
  const selected = [];
  const seen = new Set();
  const add = (item) => {
    const key = normalizeName(item.name);
    if (seen.has(key) || selected.length >= maxResults) return;
    seen.add(key);
    selected.push(item);
  };
  const sorted = [...candidates].sort((a, b) => restaurantSelectionScore(b) - restaurantSelectionScore(a));

  sorted.filter((item) => item.tags.includes("online")).forEach(add);
  sorted.filter((item) => item.distance === "near").slice(0, 45).forEach(add);
  sorted.filter((item) => item.distance === "mid").slice(0, 95).forEach(add);
  sorted.filter((item) => item.distance === "far").slice(0, 60).forEach(add);
  sorted.forEach(add);

  return selected.slice(0, maxResults);
}

function restaurantSelectionScore(item) {
  const rating = Number(String(item.googleRating || "").match(/^\d(?:\.\d)?/)?.[0] || 0);
  const reviewMatch = String(item.googleRating || "").match(/\(([\d,]+)/);
  const reviews = Number((reviewMatch?.[1] || "0").replace(/,/g, ""));
  return rating * 1000 + Math.log10(reviews + 1) * 160 + (item.tags.includes("online") ? 700 : 0);
}

function toRestaurant(place, rank, onlineNote) {
  const name = cleanDisplayName(getName(place));
  const straightLineMeters = Math.round(distanceMeters(CENTER, place.location));
  const routeMeters = estimatedRouteMeters(straightLineMeters);
  const distance = inferDistance(straightLineMeters, routeMeters);
  const cuisine = inferCuisine(place);
  const priceTag = priceLevelToTag(place.priceLevel, cuisine);
  const rating = Number(place.rating || 0).toFixed(1);
  const reviews = place.userRatingCount || 0;
  const tags = [...new Set([
    distance,
    ...inferTags(place, cuisine, rating, reviews, onlineNote),
    priceTag
  ].filter(Boolean))];
  const reviewSummary = summarizeReviews(place, cuisine, tags, onlineNote);
  const ratingText = `Google Maps 評分 ${rating}、評論 ${reviews.toLocaleString("zh-TW")} 則`;

  return {
    rank,
    name,
    area: simplifyArea(place.formattedAddress || ""),
    distance,
    time: timeLabel(distance, routeMeters),
    cuisine,
    price: tagLabel(priceTag),
    googleRating: `${rating} (${reviews} 則)`,
    tags,
    why: `${onlineNote ? `${onlineNote} ` : ""}${ratingText}；${reviewSummary}距離中心約 ${formatDistance(straightLineMeters)}，分類為${distanceLabel(distance)}。`,
    order: orderHint(cuisine, tags),
    booking: bookingHint(tags),
    destination: `${name} ${place.formattedAddress || ""}`.trim(),
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

function isTaipeiCity(place) {
  return /(?:台北市|臺北市)/.test(place.formattedAddress || "");
}

function scorePlace(place, onlineNote) {
  const rating = place.rating || 0;
  const reviews = place.userRatingCount || 0;
  return rating * 1000 + Math.log10(reviews + 1) * 180 + (onlineNote ? 700 : 0);
}

function getName(place) {
  return place.displayName?.text || "";
}

function cleanDisplayName(name) {
  let cleaned = name.split(/[|｜]/)[0].replace(/\s+/g, " ").trim();
  cleaned = cleaned.replace(/[（(][^）)]*(推薦|公休|售完|最後點菜|美食|餐廳|咖啡|下午茶|cafe|coffee)[^）)]*[）)]/gi, "").trim();
  cleaned = cleaned.replace(/[（(][^）)]{12,}[）)]/g, "").trim();
  cleaned = cleaned.split(/[／/]/)[0].trim();
  cleaned = cleaned.replace(/\s*[-－—]\s*(台北|臺北|大安|中山|信義|內湖|南港|北投|士林|文山|熱門|推薦|美食|餐廳|下午茶|cafe|coffee).*/i, "").trim();
  cleaned = cleaned.replace(/\s*[-－—]\s*.{8,}$/u, "").trim();
  cleaned = cleaned.replace(/\s+(懷舊|特色|創意|深夜|人氣|寵物|熱門|打卡|親子|來自).*/u, "").trim();
  return cleaned || name;
}

function normalizeName(name) {
  return cleanDisplayName(name)
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[｜|()（）店\-_－—・.．]/g, "");
}

function isExistingName(existingNames, name) {
  const normalized = normalizeName(name);
  if (existingNames.has(normalized)) return true;
  for (const existing of existingNames) {
    if (normalized.length >= 6 && existing.includes(normalized)) return true;
    if (existing.length >= 6 && normalized.includes(existing)) return true;
  }
  return false;
}

function distanceMeters(center, location) {
  if (!location) return Number.POSITIVE_INFINITY;
  const earth = 6371000;
  const dLat = toRad(location.latitude - center.lat);
  const dLng = toRad(location.longitude - center.lng);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(center.lat)) * Math.cos(toRad(location.latitude)) * Math.sin(dLng / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimatedRouteMeters(straightLineMeters) {
  return Math.round(straightLineMeters * 1.35 + 120);
}

function inferDistance(straightLineMeters, routeMeters) {
  if (walkingUpperMinutes(routeMeters) <= 15) return "near";
  if (straightLineMeters <= 6500) return "mid";
  return "far";
}

function timeLabel(distance, routeMeters) {
  if (distance === "near") return `步行約 ${Math.max(3, Math.round(routeMeters / 85) - 2)}-${walkingUpperMinutes(routeMeters)} 分鐘`;
  if (distance === "mid") return "交通約 15-30 分鐘";
  return "交通約 30-50 分鐘";
}

function walkingUpperMinutes(routeMeters) {
  return Math.max(5, Math.round(routeMeters / 80) + 2);
}

function toRad(value) {
  return (value * Math.PI) / 180;
}

function formatDistance(meters) {
  if (meters < 1000) return `${meters} 公尺`;
  return `${(meters / 1000).toFixed(1)} 公里`;
}

function distanceLabel(distance) {
  return { near: "近", mid: "中", far: "遠" }[distance] || distance;
}

function inferCuisine(place) {
  const text = `${getName(place)} ${(place.types || []).join(" ")} ${place.primaryType || ""}`.toLowerCase();
  if (/indian|印度|旁遮普|咖哩/.test(text)) return "印度料理";
  if (/korean|韓|韓式/.test(text)) return "韓式料理";
  if (/thai|泰|泰式/.test(text)) return "泰式料理";
  if (/hotpot|shabu|火鍋|鍋物|涮涮|麻辣/.test(text)) return "火鍋";
  if (/yakiniku|bbq|燒肉|烤肉/.test(text)) return "燒肉";
  if (/yakitori|燒鳥/.test(text)) return "燒鳥";
  if (/japanese|sushi|ramen|izakaya|日式|壽司|拉麵|居酒/.test(text)) return "日式料理";
  if (/seafood|海鮮|熱炒/.test(text)) return "海鮮/熱炒";
  if (/cafe|coffee|咖啡|早午餐|brunch/.test(text)) return "咖啡/早午餐";
  if (/dessert|bakery|甜點|冰|蛋糕|麵包|gelato/.test(text)) return "甜點/烘焙";
  if (/bar|bistro|pub|cocktail|餐酒|酒吧|小酒館/.test(text)) return "餐酒/酒吧";
  if (/italian|pizza|pasta|義式|義大利/.test(text)) return "義式料理";
  if (/vegetarian|vegan|蔬食|素食|不葷/.test(text)) return "蔬食";
  if (/noodle|ramen|麵|牛肉麵|拉麵/.test(text)) return "麵食";
  if (/chinese|中式|粵|港式|茶餐廳|江浙|川菜/.test(text)) return "中式料理";
  if (/taiwanese|台菜|小吃|魯肉|滷肉|雞肉飯|豆漿/.test(text)) return "台菜/小吃";
  if (/steak|grill|牛排|鐵板/.test(text)) return "排餐/鐵板燒";
  return "餐廳";
}

function inferTags(place, cuisine, rating, reviews, onlineNote) {
  const text = `${getName(place)} ${cuisine} ${(place.types || []).join(" ")}`;
  const tags = ["google"];
  if (onlineNote) tags.push("online");
  if (Number(rating) >= 4.6) tags.push("rating46");
  if (Number(rating) >= 4.8) tags.push("rating48");
  if (reviews >= 1000) tags.push("popular");
  if (/日式|壽司|拉麵/.test(cuisine)) tags.push("jp");
  if (/中式/.test(cuisine)) tags.push("cn");
  if (/台菜|小吃|海鮮|熱炒/.test(cuisine)) tags.push("tw");
  if (/義式|餐酒|酒吧|咖啡|甜點|排餐/.test(cuisine)) tags.push("west");
  if (/韓式/.test(cuisine)) tags.push("korean");
  if (/泰式/.test(cuisine)) tags.push("thai");
  if (/印度/.test(cuisine)) tags.push("indian");
  if (/蔬食/.test(cuisine)) tags.push("veggie");
  if (/甜點/.test(cuisine)) tags.push("dessert");
  if (/咖啡|早午餐/.test(cuisine)) tags.push("cafe", "breakfast");
  if (/餐酒|酒吧/.test(cuisine)) tags.push("bistro", "bar");
  if (/火鍋/.test(cuisine)) tags.push("hotpot", "group");
  if (/燒肉|燒鳥/.test(cuisine)) tags.push("yakiniku", "jp", "group");
  if (/海鮮/.test(cuisine)) tags.push("seafood", "group");
  if (/麵食|拉麵|牛肉麵/.test(cuisine)) tags.push("noodle", "solo");
  if (/bar|bistro|餐酒|酒吧|小酒館|燒鳥|壽司|牛排|義式|火鍋|燒肉|高級|約會/i.test(text)) tags.push("date");
  if (/餐廳|火鍋|燒肉|熱炒|合菜|聚餐|bbq/i.test(text)) tags.push("group");
  if (/咖啡|甜點|麵食|小吃/.test(cuisine) || /meal_takeaway|bakery|cafe/.test((place.types || []).join(" "))) tags.push("solo");
  if ((place.userRatingCount || 0) >= 1500 || /熱門|人氣|排隊/.test(text)) tags.push("queue");
  if (!tags.includes("solo") || tags.includes("date") || tags.includes("group")) tags.push("booking");
  return tags;
}

function priceLevelToTag(priceLevel, cuisine) {
  if (/燒肉|牛排|鐵板|高級|壽司|割烹/.test(cuisine)) return "p3";
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

function summarizeReviews(place, cuisine, tags, onlineNote) {
  const reviewText = (place.reviews || [])
    .map((review) => review.text?.text || "")
    .join(" ");
  const points = [];
  const add = (pattern, label) => {
    if (pattern.test(reviewText) && !points.includes(label)) points.push(label);
  };

  add(/服務|親切|熱情|介紹|招待/, "服務互動");
  add(/環境|氣氛|空間|乾淨|舒適|裝潢/, "環境氣氛");
  add(/份量|飽|CP|划算|價格|平價/, "份量與價格感");
  add(/排隊|候位|客滿|訂位/, "熱門時段人潮");
  add(/咖哩|烤餅|奶油雞|香料/, "咖哩與香料料理");
  add(/燒肉|和牛|牛肉|肉質|牛舌/, "肉品表現");
  add(/火鍋|湯頭|鍋底|海鮮|肉盤/, "鍋底與食材");
  add(/咖啡|甜點|蛋糕|冰|飲料/, "咖啡甜點");
  add(/拉麵|麵條|湯頭|牛肉麵|拌麵/, "麵體與湯頭");
  add(/調酒|酒|啤酒|餐酒/, "酒水搭餐");

  if (!points.length) {
    if (tags.includes("popular")) points.push("高討論度");
    if (tags.includes("date")) points.push("氣氛型用餐");
    if (tags.includes("group")) points.push("聚餐適合度");
    if (/咖啡|甜點/.test(cuisine)) points.push("下午茶與輕食");
  }

  const prefix = onlineNote ? "網路推薦與 Google 評論交叉看，" : "Google 評論摘要：";
  return `${prefix}${points.slice(0, 3).join("、") || "評分與評論數表現穩定"}是主要亮點。`;
}

function orderHint(cuisine, tags) {
  if (tags.includes("indian")) return "咖哩、烤餅、香料飯、優格飲可優先看。";
  if (tags.includes("hotpot")) return "鍋底、肉盤、海鮮與招牌熟食可優先看。";
  if (tags.includes("yakiniku")) return "牛舌、和牛、招牌肉盤與套餐可優先看。";
  if (tags.includes("cafe")) return "咖啡、甜點、早午餐或輕食可優先看。";
  if (tags.includes("bistro")) return "調酒、下酒菜、義大利麵或分享菜可優先看。";
  if (tags.includes("noodle")) return "招牌麵、湯頭、小菜與限定品項可優先看。";
  return "以 Google Maps 最新照片、菜單與熱門評論挑選。";
}

function bookingHint(tags) {
  if (tags.includes("queue")) return "評論數高或常見熱門店，尖峰建議訂位或錯峰。";
  if (tags.includes("booking")) return "出門前確認訂位、營業時間與臨時店休。";
  return "營業時間與臨時店休以 Google Maps 或店家公告為準。";
}

function simplifyArea(address) {
  const match = address.match(/(?:台北市|臺北市)(.{2,3}區)([^,，]*)/);
  if (!match) return "台北市";
  return `${match[1]}${match[2]}`.replace(/\d+樓.*/, "").slice(0, 20);
}

function renderJs(restaurants) {
  const lines = restaurants.map((item) => `  ${JSON.stringify(item)}`);
  return `const ${OUTPUT_VARIABLE} = [\n${lines.join(",\n")}\n];\n`;
}
