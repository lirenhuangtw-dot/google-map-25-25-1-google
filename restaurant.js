const RESTAURANT_ORIGIN = "台北市南京東路三段89巷附近";
let selectedRestaurantFilters = new Set();
let restaurantQuery = "";
let restaurantSortMode = "recommended";
const DISTANCE_ORDER = { near: 1, mid: 2, far: 3 };
const SOURCE_FILTERS = new Set(["google", "threads", "online", "gourmet"]);
const PRICE_OVERRIDES = [
  { pattern: /無一鮨/, tag: "p4" },
  { pattern: /兄弟大飯店\s*梅花廳|兄弟梅花廳/, tag: "p2" },
  { pattern: /頁小館|My灶|不葷主義茶餐廳|義大利米蘭手工窯烤披薩|333 Restaurant & Bar/, tag: "p2" },
  { pattern: /陽明春天/, tag: "p3" },
  { pattern: /慶城海南雞|雙月食品社|阜杭豆漿|富霸王|梁記嘉義雞肉飯|家鴻燒鵝|勝利號蚵仔煎|客家自製湯圓|福德涼麵|五湖豆漿/, tag: "p1" },
  { pattern: /四平街番茄牛肉麵|大膽牛腩麵|郭家川味牛肉麵|豬小寶台中可口豬腳大王|珍美味水餃|正豪季水餃|元記潤餅|南香排骨|甲霸油飯|阿維麵線|山內雞肉|賣麵炎仔/, tag: "p1" }
];
const BAR_EXCLUDE_PATTERNS = [/帥哥滷肉飯|Handsome Guy/i];
const restaurantList = applyGourmetRecommendations(applyPlaceAudit([
  ...restaurants,
  ...(typeof extraNearRestaurants !== "undefined" ? extraNearRestaurants : []),
  ...(typeof moreLocalRestaurants !== "undefined" ? moreLocalRestaurants : []),
  ...(typeof googlePlacesRestaurants !== "undefined" ? googlePlacesRestaurants : []),
  ...(typeof googleBarsRestaurants !== "undefined" ? googleBarsRestaurants : []),
  ...(typeof taipeiGoogleRestaurants !== "undefined" ? taipeiGoogleRestaurants : []),
  ...(typeof threadsRestaurants !== "undefined" ? threadsRestaurants : [])
])).map(normalizeRestaurant).sort((a, b) => restaurantSortRank(a) - restaurantSortRank(b) || a.rank - b.rank);

function normalizeRestaurant(item) {
  if (item.priceUnknown) return {...item,price:"價位待確認"};
  const priceTag = overridePriceTag(item) || item.tags.find((tag) => /^p[1-4]$/.test(tag)) || inferPriceTag(item);
  const price = tagLabel(priceTag);
  const tagsWithoutPrice = item.tags.filter((tag) => !/^p[1-4]$/.test(tag));
  const categoryTags = [
    ...(isCafeRestaurant(item) ? ["cafe"] : []),
    ...(isBarRestaurant(item) ? ["bar"] : [])
  ];
  return {
    ...item,
    price,
    tags: [...new Set([...tagsWithoutPrice, ...categoryTags, priceTag])]
  };
}

function overridePriceTag(item) {
  const text = `${item.name} ${item.destination || ""}`;
  return PRICE_OVERRIDES.find((rule) => rule.pattern.test(text))?.tag || "";
}

function isCafeRestaurant(item) {
  const text = `${item.name} ${item.cuisine || ""} ${item.destination || ""}`;
  return /咖啡|咖啡廳|Coffee|Cafe|Café|Kaffe|Roasting|Roasters|早午餐|輕食|brunch/i.test(text);
}

function isBarRestaurant(item) {
  const text = `${item.name} ${item.cuisine || ""} ${item.destination || ""}`;
  if (BAR_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return /酒吧|酒場|酒館|餐酒|小酒館|居酒|Bar|Bistro|Pub|Cocktail|Speakeasy/i.test(text);
}

function inferPriceTag(item) {
  if (item.tags.includes("far") || item.rank <= 4 || item.tags.includes("michelin")) return "p4";
  if (item.tags.includes("hotpot") || item.cuisine.includes("燒肉") || item.cuisine.includes("牛排")) return "p3";
  if (item.tags.includes("solo") && !item.tags.includes("booking")) return "p1";
  return "p2";
}

function restaurantSortRank(item) {
  if (item.tags.includes("threads")) return item.rank - 10000;
  if (item.tags.includes("wishlist")) return item.rank - 5000;
  return item.rank;
}

function restaurantDistanceRank(item) {
  const categoryBase = { near: 0, mid: 100000, far: 200000 }[item.distance] ?? 300000;
  const meterMatch = `${item.why || ""} ${item.destination || ""}`.match(/(?:距離中心約|步行距離估約)\s*([\d,]+)\s*公尺/);
  if (meterMatch) return categoryBase + Number(meterMatch[1].replace(/,/g, ""));

  const minutes = [...String(item.time || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (minutes.length) return categoryBase + Math.max(...minutes) * 80;

  return categoryBase + item.rank;
}

function sortRestaurants(items) {
  const sorted = [...items];
  if (restaurantSortMode === "distance") {
    return sorted.sort((a, b) => restaurantDistanceRank(a) - restaurantDistanceRank(b) || restaurantSortRank(a) - restaurantSortRank(b) || a.rank - b.rank);
  }
  return sorted.sort((a, b) => restaurantSortRank(a) - restaurantSortRank(b) || a.rank - b.rank);
}

function restaurantMapUrl(destination, mode = "driving") {
  const params = new URLSearchParams({
    api: "1",
    origin: RESTAURANT_ORIGIN,
    destination,
    travelmode: mode
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function restaurantSearchUrl(destination) {
  const params = new URLSearchParams({ api: "1", query: destination });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function restaurantDistanceLabel(value) {
  return { near: "近", mid: "中", far: "遠", unknown: "距離待確認" }[value] || value;
}

function matchesRestaurantQuery(item, query) {
  if (!query) return true;
  const haystack = [
    item.name,
    item.area,
    item.distance,
    item.time,
    item.cuisine,
    item.why,
    item.order,
    item.booking,
    item.destination,
    ...(item.tags || [])
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderRestaurants() {
  const grid = document.querySelector("#restaurantGrid");
  const filtered = sortRestaurants(restaurantList.filter((item) => {
    const filterMatch = restaurantMatchesFilters(item);
    return filterMatch && matchesRestaurantQuery(item, restaurantQuery);
  }));

  document.querySelector("#restaurantCount").textContent =
    `目前顯示 ${filtered.length} 間；完整資料 ${restaurantList.length} 間，其中近距離步行 ${restaurantList.filter((item) => item.distance === "near").length} 間。`;

  grid.innerHTML = filtered.map((item) => `
    <article class="spot-card">
      <div class="spot-card__top">
        <div>
          <h3>${item.name}</h3>
          <div class="meta">
            <span class="pill pill--${item.distance}">${restaurantDistanceLabel(item.distance)}｜${item.time}</span>
            <span class="pill">${item.cuisine}</span>
            <span class="pill">${item.price || "價位待查"}</span>
            ${item.tags.filter((tag) => !["near","mid","far","p1","p2","p3","p4"].includes(tag)).map((tag) => `<span class="pill">${tagLabel(tag)}</span>`).join("")}
          </div>
        </div>
        <span class="rank">${item.rank}</span>
      </div>
      <p class="why">${item.why}</p>
      ${(item.recommendations || []).map(source => `<div class="gourmet-note"><strong>${source.author} · ${source.kind}</strong><p>${source.summary}</p><a href="${source.url}" target="_blank" rel="noopener noreferrer">閱讀推薦來源</a><small>${source.date}${source.note ? `｜${source.note}` : ""}</small></div>`).join("")}
      <div class="tips">
        <span class="tip-line"><strong>區域</strong><span>${item.area}</span></span>
        <span class="tip-line"><strong>評分</strong><span>${item.googleRating || "點 Google Maps 即時查看"}</span></span>
        <span class="tip-line"><strong>點法</strong><span>${item.order}</span></span>
        <span class="tip-line"><strong>提醒</strong><span>${item.booking}</span></span>
      </div>
      <div class="card__actions">
        <a href="${restaurantMapUrl(item.destination, "driving")}" target="_blank" rel="noreferrer">開車/計程車</a>
        <a class="secondary" href="${restaurantMapUrl(item.destination, "transit")}" target="_blank" rel="noreferrer">大眾運輸</a>
        <a class="secondary" href="${item.mapUrl || restaurantSearchUrl(item.destination)}" target="_blank" rel="noreferrer">${item.distance === "unknown" ? "Google Maps 地址搜尋" : "Google Maps"}</a>
      </div>
    </article>
  `).join("");
}

function restaurantMatchesFilters(item) {
  const filters = [...selectedRestaurantFilters];
  const selectedDistances = filters.filter((filter) => filter in DISTANCE_ORDER);
  const selectedSources = filters.filter((filter) => SOURCE_FILTERS.has(filter));
  const otherFilters = filters.filter((filter) => !(filter in DISTANCE_ORDER) && !SOURCE_FILTERS.has(filter));

  if (selectedDistances.length) {
    const maxDistance = Math.max(...selectedDistances.map((filter) => DISTANCE_ORDER[filter]));
    if ((DISTANCE_ORDER[item.distance] || 99) > maxDistance) return false;
  }

  if (selectedSources.length && !selectedSources.some((filter) => item.tags.includes(filter))) return false;

  const prices = otherFilters.filter(filter => /^p[1-4]$/.test(filter));
  if (prices.length && !prices.some(filter => item.tags.includes(filter))) return false;
  return otherFilters.filter(filter => !/^p[1-4]$/.test(filter)).every(filter => {
    if (filter === "rating46" && item.rating != null) return item.rating >= 4.6;
    if (filter === "rating48" && item.rating != null) return item.rating >= 4.8;
    return item.tags.includes(filter);
  });
}

function tagLabel(tag) {
  return {
    tw: "台菜",
    jp: "日式",
    cn: "中式",
    west: "西式",
    cafe: "咖啡廳",
    bar: "酒吧",
    bistro: "餐酒",
    hotpot: "火鍋",
    michelin: "米其林/必比登",
    solo: "一人可",
    booking: "可訂位",
    wishlist: "想去",
    google: "Google高評分",
    threads: "Threads推薦",
    online: "網路推薦",
    gourmet: "網路老饕推薦",
    popular: "評論多",
    rating46: "4.6+",
    rating48: "4.8+",
    date: "約會",
    group: "聚餐",
    queue: "常排隊",
    korean: "韓式",
    thai: "泰式",
    indian: "印度",
    veggie: "蔬食",
    dessert: "甜點",
    breakfast: "早午餐",
    yakiniku: "燒肉",
    seafood: "海鮮",
    noodle: "麵食",
    p1: "$",
    p2: "$$",
    p3: "$$$",
    p4: "$$$$"
  }[tag] || tag;
}

document.querySelectorAll(".restaurant-page .chip").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    if (filter === "all") {
      selectedRestaurantFilters.clear();
      document.querySelectorAll(".restaurant-page .chip").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    } else {
      document.querySelector('.restaurant-page [data-filter="all"]').classList.remove("is-active");
      if (selectedRestaurantFilters.has(filter)) {
        selectedRestaurantFilters.delete(filter);
        button.classList.remove("is-active");
      } else {
        selectedRestaurantFilters.add(filter);
        button.classList.add("is-active");
      }
      if (selectedRestaurantFilters.size === 0) {
        document.querySelector('.restaurant-page [data-filter="all"]').classList.add("is-active");
      }
    }
    renderRestaurants();
  });
});

document.querySelector("#restaurantSearch").addEventListener("input", (event) => {
  restaurantQuery = event.target.value.trim();
  renderRestaurants();
});

document.querySelector("#restaurantSort").addEventListener("change", (event) => {
  restaurantSortMode = event.target.value;
  renderRestaurants();
});

renderRestaurants();
