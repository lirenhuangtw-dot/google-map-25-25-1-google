#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const API_KEY = process.env.GOOGLE_MAPS_API_KEY || process.env.GOOGLE_PLACES_API_KEY;
const CENTER = { lat: 25.05265, lng: 121.5444 };
const CENTER_LABEL = "台北市南京東路三段89巷附近";
const OUTPUT_FILE = path.join(repoRoot, "restaurant-threads.js");
const REPORT_FILE = path.join(repoRoot, "threads-import-report.json");
const START_RANK = 400;
const MAX_DISTANCE_METERS = 3200;

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

const candidates = [
  "種福園",
  "元記潤餅捲",
  "南香排骨飯",
  "京簡康",
  "TWAITUTIAN Coffee",
  "博多幸龍",
  "京都御握丸",
  "梁記火雞肉飯",
  "灰鍋",
  "東館牛肉麵",
  "帥哥滷肉飯",
  "富霸王豬腳",
  "發肉燒肉",
  "慶陳雞",
  "博多幸龍總本店",
  "野毛洋食屋",
  "Haritts 甜甜圈",
  "客家自製湯圓",
  "香港永興堂",
  "春美冰菓室",
  "火鍋106",
  "Milano Pizzeria",
  "麵大廚",
  "韓食村",
  "魯旦川鍋",
  "Sapori",
  "Give Me Pie",
  "萬花 One Flower",
  "台越越南美食",
  "伊通韓國料理館",
  "阿維麵線",
  "金仙排骨",
  "慶州館",
  "滿上仙草茶",
  "善果屋",
  "珍美味水餃",
  "蜀國麻辣鍋",
  "甲霸油飯",
  "花茶大師",
  "大叔炸雞",
  "鑫爺食堂",
  "驛老么牛肉麵",
  "普莉斯咖啡館",
  "食朝早午餐",
  "小巷子",
  "BANCO 棒可",
  "OLIA",
  "猩猩院",
  "北倉洞",
  "郭家川味牛肉麵",
  "薔薇廳",
  "陶然亭",
  "上福食所",
  "四平街番茄牛肉麵",
  "鬧蟬咖啡",
  "威爾貝克咖啡南方公園店",
  "泰滾",
  "石撈麻辣鴛鴦鍋",
  "勝利號蚵仔煎",
  "台中豬腳大王",
  "家鴻燒鵝",
  "大膽牛腩麵",
  "四平小館",
  "驛站慢功出好菜",
  "Tony's BBQ",
  "My灶",
  "巢鐵板燒",
  "東嘉祥丼飯",
  "豪記水餃",
  "男朋友家",
  "男朋友餐盒",
  "一味入魂鹹水雞",
  "刈包盧"
];

const aliases = new Map([
  ["博多幸龍總本店", "博多幸龍"],
  ["慶城海南雞飯", "慶城海南雞"],
  ["珍美味水餃", "珍美味水餃館"],
  ["男朋友家", "男朋友·家"],
  ["男朋友餐盒", "男朋友·家"],
  ["Tony's BBQ", "tony's bbq"],
  ["TWAITUTIAN Coffee", "TWAITUTIAN"],
  ["TWATUTIAN Coffee", "TWATUTIAN Coffee & Co. 建國北路一段136號"],
  ["TWAITUTIAN Coffee", "TWATUTIAN Coffee & Co. 建國北路一段136號"],
  ["BANCO 棒可", "BANCO 窯烤PIZZA 自製生麵"],
  ["普莉斯咖啡館", "Please Cafe"],
  ["京都御握丸", "京都御握丸 飯糰"],
  ["京簡康", "京簡康 雞胸肉"],
  ["慶陳雞", "慶陳雞 海南雞"],
  ["東館牛肉麵", "東館牛麵食館"],
  ["Milano Pizzeria", "義大利米蘭手工窯烤披薩 台北中山店"],
  ["滿上仙草茶", "滿上仙草茶飲專賣店 台北松江店"],
  ["花茶大師", "花茶大師 四平店"],
  ["善果屋", "善菓屋 Sharing Nature 台北松江店"],
  ["大叔炸雞", "炸雞大叔"],
  ["豪記水餃", "正豪季水餃專賣店 伊通店"],
  ["台中豬腳大王", "豬小寶台中可口豬腳大王 興安街118號"],
  ["刈包盧", "刈包盧 四平街64號"],
  ["梁記火雞肉飯", "梁記嘉義雞肉飯 松江路90巷19號"],
  ["灰鍋", "灰鍋 台北 長春路"],
  ["火鍋106", "火鍋106 台北"],
  ["Sapori", "Sapori 台北"],
  ["Give Me Pie", "Give me pie 台北"],
  ["OLIA", "OLIA 台北"],
  ["薔薇廳", "薔薇廳 台北"],
  ["陶然亭", "陶然亭 台北"],
  ["上福食所", "上福食所 南京東路 龍江路"],
  ["鬧蟬咖啡", "鬧蟬咖啡 台北"],
  ["威爾貝克咖啡南方公園店", "威爾貝克咖啡 南方公園店"],
  ["石撈麻辣鴛鴦鍋", "石撈麻辣鴛鴦鍋 台北"],
  ["驛站慢功出好菜", "驛站慢功出好菜 台北"],
  ["巢鐵板燒", "NEST 巢TEPPANYAKI 伊通街87巷10號"]
]);

if (!API_KEY) {
  console.error("Missing GOOGLE_MAPS_API_KEY.");
  process.exit(1);
}

const existing = await loadExistingRestaurants();
const existingIds = new Set(existing.map((item) => item.placeId).filter(Boolean));
const existingNames = existing.map((item) => item.name);
const results = [];
const report = [];
const seenIds = new Set(existingIds);
const seenNames = new Set(existingNames.map(normalizeName));

for (const candidate of candidates) {
  const already = findExisting(candidate, existingNames);
  if (already) {
    report.push({ input: candidate, status: "already_exists", matchedName: already });
    continue;
  }

  const place = await findPlace(candidate);
  if (!place) {
    report.push({ input: candidate, status: "not_found", reason: "Places Text Search 沒有回傳可信的附近餐廳結果。" });
    continue;
  }

  const meters = Math.round(distanceMeters(CENTER, place.location));
  if (meters > MAX_DISTANCE_METERS) {
    report.push({
      input: candidate,
      status: "too_far",
      matchedName: getName(place),
      address: place.formattedAddress || "",
      distanceMeters: meters,
      reason: `找到的地點距離中心約 ${meters} 公尺，超過本頁補強範圍。`
    });
    continue;
  }

  const id = place.id || `${getName(place)}|${place.formattedAddress}`;
  const normalized = normalizeName(getName(place));
  if (seenIds.has(id) || seenNames.has(normalized)) {
    report.push({ input: candidate, status: "duplicate_result", matchedName: getName(place) });
    continue;
  }

  seenIds.add(id);
  seenNames.add(normalized);
  results.push({ candidate, place });
  report.push({
    input: candidate,
    status: "added",
    matchedName: getName(place),
    rating: place.rating || null,
    reviews: place.userRatingCount || 0,
    address: place.formattedAddress || "",
    distanceMeters: meters
  });
}

const restaurants = results
  .map(({ candidate, place }, index) => toRestaurant(candidate, place, START_RANK + index))
  .sort((a, b) => {
    return (
      distanceRank(a.distance) - distanceRank(b.distance) ||
      a._meters - b._meters ||
      Number.parseFloat(b.googleRating || "0") - Number.parseFloat(a.googleRating || "0")
    );
  })
  .map((item, index) => {
    const { _meters, ...rest } = item;
    return { ...rest, rank: START_RANK + index };
  });

await fs.writeFile(OUTPUT_FILE, renderJs(restaurants), "utf8");
await fs.writeFile(REPORT_FILE, `${JSON.stringify(report, null, 2)}\n`, "utf8");

console.log(`added: ${restaurants.length}`);
console.log(`already: ${report.filter((item) => item.status === "already_exists").length}`);
console.log(`not_found: ${report.filter((item) => item.status === "not_found").length}`);
console.log(`too_far: ${report.filter((item) => item.status === "too_far").length}`);
console.log(`output: ${path.relative(repoRoot, OUTPUT_FILE)}`);
console.log(`report: ${path.relative(repoRoot, REPORT_FILE)}`);

async function findPlace(candidate) {
  const query = aliases.get(candidate) || candidate;
  const searches = [
    `${query} ${CENTER_LABEL}`,
    `${query} 松江南京 南京復興 台北`,
    `${query} 台北市中山區 松山區`
  ];

  for (const textQuery of searches) {
    const data = await googlePost("https://places.googleapis.com/v1/places:searchText", {
      textQuery,
      languageCode: "zh-TW",
      regionCode: "TW",
      pageSize: 5,
      locationBias: {
        circle: {
          center: { latitude: CENTER.lat, longitude: CENTER.lng },
          radius: MAX_DISTANCE_METERS
        }
      }
    });

    const places = (data.places || [])
      .filter(isOpenOrUnknown)
      .filter(isRestaurantLike)
      .map((place) => ({ place, score: matchScore(candidate, place) }))
      .filter(({ score }) => score >= 1)
      .sort((a, b) => b.score - a.score || distanceMeters(CENTER, a.place.location) - distanceMeters(CENTER, b.place.location));

    if (places[0]) return places[0].place;
  }

  return null;
}

async function googlePost(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Goog-Api-Key": API_KEY,
      "X-Goog-FieldMask": FIELD_MASK
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`${response.status} ${response.statusText}: ${text}`);
  }

  return response.json();
}

async function loadExistingRestaurants() {
  const files = [
    "restaurant-data.js",
    "restaurant-extra-near.js",
    "restaurant-more-local.js",
    "restaurant-google-places.js"
  ];
  const text = (await Promise.all(files.map((file) => fs.readFile(path.join(repoRoot, file), "utf8")))).join("\n");
  const entries = [];
  for (const regex of [/name:"([^"]+)"/g, /"name":"([^"]+)"/g]) {
    for (const match of text.matchAll(regex)) {
      entries.push({ name: match[1], placeId: "" });
    }
  }
  return entries.filter((item) => item.name);
}

function findExisting(candidate, existingNames) {
  const normalized = normalizeName(aliases.get(candidate) || candidate);
  const original = normalizeName(candidate);
  for (const name of existingNames) {
    const existing = normalizeName(name);
    if (existing === original) return name;
    if (original.length >= 4 && existing.includes(original)) return name;
    if (existing.length >= 4 && original.includes(existing)) return name;
    if (existing === normalized) return name;
    if (normalized.length >= 4 && existing.includes(normalized)) return name;
    if (existing.length >= 4 && normalized.includes(existing)) return name;
    const cjk = cjkCore(normalized);
    const existingCjk = cjkCore(existing);
    if (cjk.length >= 4 && existingCjk.length >= 4 && (cjk.includes(existingCjk) || existingCjk.includes(cjk))) return name;
  }
  return "";
}

function matchScore(candidate, place) {
  const candidateNorm = normalizeName(candidate);
  const nameNorm = normalizeName(getName(place));
  const aliasNorm = normalizeName(aliases.get(candidate) || candidate);
  const address = place.formattedAddress || "";
  let score = 0;
  const candidateCore = cjkCore(candidateNorm);
  const nameCore = cjkCore(nameNorm);
  const aliasCore = cjkCore(aliasNorm);
  const related =
    nameNorm === candidateNorm ||
    nameNorm === aliasNorm ||
    nameNorm.includes(candidateNorm) ||
    candidateNorm.includes(nameNorm) ||
    nameNorm.includes(aliasNorm) ||
    aliasNorm.includes(nameNorm) ||
    (candidateCore.length >= 3 && nameCore.includes(candidateCore)) ||
    (aliasCore.length >= 3 && nameCore.includes(aliasCore)) ||
    (candidateCore.length >= 4 && nameCore.length >= 4 && candidateCore.slice(0, 4) === nameCore.slice(0, 4)) ||
    (candidateCore.length === 3 && nameCore.length >= 3 && candidateCore.slice(0, 2) === nameCore.slice(0, 2));

  if (!related) return 0;

  if (nameNorm === candidateNorm || nameNorm === aliasNorm) score += 10;
  if (nameNorm.includes(candidateNorm) || candidateNorm.includes(nameNorm)) score += 7;
  if (nameNorm.includes(aliasNorm) || aliasNorm.includes(nameNorm)) score += 6;
  if (candidateCore.length >= 4 && nameCore.slice(0, 4) === candidateCore.slice(0, 4)) score += 3;
  if (candidateCore.length === 3 && nameCore.slice(0, 2) === candidateCore.slice(0, 2)) score += 2;
  if (/台北|臺北|中山區|松山區|南京|松江|遼寧|四平|長春|龍江|慶城|興安|伊通/.test(address)) score += 2;
  if (distanceMeters(CENTER, place.location) <= MAX_DISTANCE_METERS) score += 2;
  if ((place.rating || 0) >= 4) score += 1;
  return score;
}

function toRestaurant(candidate, place, rank) {
  const name = cleanDisplayName(getName(place));
  const straightLineMeters = Math.round(distanceMeters(CENTER, place.location));
  const meters = estimatedWalkingMeters(straightLineMeters);
  const distance = walkingUpperMinutes(meters) <= 15 ? "near" : "mid";
  const priceTag = priceLevelToTag(place.priceLevel);
  const cuisine = inferCuisine(place, name);
  const rating = place.rating ? Number(place.rating).toFixed(1) : "待查";
  const reviews = place.userRatingCount || 0;

  return {
    rank,
    name,
    area: simplifyArea(place.formattedAddress || ""),
    distance,
    time: walkingTimeLabel(meters),
    cuisine,
    price: tagLabel(priceTag),
    googleRating: place.rating ? `${rating} (${reviews} 則)` : "點 Google Maps 即時查看",
    tags: [...new Set([distance, ...inferTags(cuisine, name), "threads", priceTag])],
    why: `Threads 貼文留言推薦，已用 Google Places 對到店家；步行距離估約 ${meters} 公尺。`,
    order: orderHint(candidate, cuisine),
    booking: "營業時間、訂位、排隊與臨時店休以 Google Maps 或店家公告為準。",
    destination: `${name} ${place.formattedAddress || ""}`.trim(),
    mapUrl: place.googleMapsUri || "",
    _meters: meters
  };
}

function isOpenOrUnknown(place) {
  return !place.businessStatus || place.businessStatus === "OPERATIONAL";
}

function isRestaurantLike(place) {
  const types = new Set(place.types || []);
  if (types.has("lodging") || types.has("hotel")) return false;
  return ["restaurant", "cafe", "bar", "bakery", "meal_takeaway", "food", "store", "point_of_interest", "establishment"].some((type) => types.has(type));
}

function getName(place) {
  return place.displayName?.text || "";
}

function cleanDisplayName(name) {
  return name.split(/[|｜]/)[0].trim();
}

function normalizeName(name) {
  return cleanDisplayName(name)
    .toLowerCase()
    .replace(/台北|臺北|南京店|松江店|總本店|本店|分店|餐廳|小館|食堂|料理|咖啡館|coffee|cafe/g, "")
    .replace(/[^\p{Script=Han}a-z0-9]/gu, "");
}

function cjkCore(name) {
  return name.replace(/[^\u4e00-\u9fff]/g, "");
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
  const minutes = Math.max(3, Math.round(meters / 80));
  return `步行約 ${Math.max(3, minutes - 2)}-${walkingUpperMinutes(meters)} 分鐘`;
}

function walkingUpperMinutes(meters) {
  return Math.max(3, Math.round(meters / 80)) + 2;
}

function distanceRank(distance) {
  return { near: 0, mid: 1, far: 2 }[distance] ?? 3;
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

function inferCuisine(place, name) {
  const text = [...(place.types || []), place.primaryType || "", name].join(" ").toLowerCase();
  if (/coffee|cafe|咖啡/.test(text)) return "咖啡/輕食";
  if (/bar|pub|居酒|酒/.test(text)) return "餐酒/酒吧";
  if (/bakery|donut|甜點|冰|麻糬|湯圓|麵包|餅/.test(text)) return "甜點/小吃";
  if (/japanese|sushi|ramen|壽司|拉麵|日式|握|燒肉/.test(text)) return "日式料理";
  if (/hotpot|火鍋|麻辣|鍋/.test(text)) return "火鍋";
  if (/korean|韓/.test(text)) return "韓式料理";
  if (/thai|泰/.test(text)) return "泰式料理";
  if (/italian|pizza|pasta|義式|義大利|pizzeria/.test(text)) return "義式料理";
  if (/steak|grill|鐵板|牛排|bbq|燒烤/.test(text)) return "排餐/燒烤";
  if (/seafood|海鮮|鮨|魚/.test(text)) return "海鮮/熱炒";
  if (/水餃|麵|滷肉|豬腳|排骨|雞肉飯|海南雞|油飯|便當|豆漿|台菜/.test(text)) return "台式小吃";
  if (/中式|湯包|川|牛肉/.test(text)) return "中式料理";
  return "餐廳";
}

function inferTags(cuisine, name) {
  const tags = [];
  if (/日式|壽司|拉麵/.test(cuisine)) tags.push("jp");
  if (/中式/.test(cuisine)) tags.push("cn");
  if (/台式|海鮮|熱炒/.test(cuisine)) tags.push("tw");
  if (/咖啡|餐酒|甜點|義式|排餐/.test(cuisine)) tags.push("west");
  if (/餐酒/.test(cuisine)) tags.push("bistro");
  if (/火鍋/.test(cuisine)) tags.push("hotpot");
  if (/咖啡|水餃|麵|飯|便當|小吃|甜點|豆漿|雞肉飯|豬腳|排骨|油飯|潤餅/.test(`${cuisine} ${name}`)) tags.push("solo");
  if (/燒肉|火鍋|餐廳|居酒|鐵板|海鮮|台菜/.test(`${cuisine} ${name}`)) tags.push("booking");
  return tags;
}

function orderHint(candidate, cuisine) {
  if (/水餃/.test(candidate)) return "水餃、酸辣湯、乾麵或小菜。";
  if (/豬腳/.test(candidate)) return "豬腳飯、腿節、筍絲、滷肉飯。";
  if (/海南雞/.test(candidate)) return "海南雞飯、雞腿、辣醬與配菜。";
  if (/牛肉麵/.test(candidate)) return "牛肉麵、斤餅、小菜。";
  if (/咖啡|Coffee|Cafe/i.test(candidate)) return "咖啡、甜點、早午餐或輕食。";
  if (/火鍋|麻辣|鍋/.test(candidate)) return "鍋物、肉盤、招牌湯底。";
  if (/義式|Pizzeria|BANCO|Sapori/i.test(candidate)) return "披薩、義大利麵、燉飯或烤雞。";
  if (/甜|冰|麻糬|湯圓|Haritts|Give Me Pie/i.test(candidate)) return "招牌甜點、飲品，熱門品項可能售完。";
  if (/燒肉|鐵板|BBQ|炸雞/i.test(candidate)) return "招牌肉品、烤物、套餐或分享菜。";
  if (/小吃|台式/.test(cuisine)) return "招牌飯麵、小菜、湯品。";
  return "依 Google Maps 最新照片、菜單與熱門評論挑選。";
}

function simplifyArea(address) {
  const match = address.match(/(?:台北市|臺北市)(.{2,3}區)([^,，]*)/);
  if (!match) return CENTER_LABEL;
  return `${match[1]}${match[2]}`.replace(/\d+樓.*/, "").slice(0, 18);
}

function renderJs(restaurants) {
  const lines = restaurants.map((item) => `  ${JSON.stringify(item)}`);
  return `const threadsRestaurants = [\n${lines.join(",\n")}\n];\n`;
}
