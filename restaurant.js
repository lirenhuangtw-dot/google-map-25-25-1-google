const RESTAURANT_ORIGIN = "台北市南京東路三段89巷附近";
let selectedRestaurantFilters = new Set();
let restaurantQuery = "";
let restaurantSortMode = "recommended";
let restaurantVisibleLimit = 30;
const CUISINE_FILTERS = new Set(["tw","jp","cn","west","cafe","bar","bistro","hotpot","korean","thai","indian","veggie","dessert","yakiniku","seafood","noodle"]);
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
const restaurantList = applyPlaceAudit(applyGourmetRecommendations([
  ...restaurants,
  ...(typeof extraNearRestaurants !== "undefined" ? extraNearRestaurants : []),
  ...(typeof moreLocalRestaurants !== "undefined" ? moreLocalRestaurants : []),
  ...(typeof googlePlacesRestaurants !== "undefined" ? googlePlacesRestaurants : []),
  ...(typeof googleBarsRestaurants !== "undefined" ? googleBarsRestaurants : []),
  ...(typeof taipeiGoogleRestaurants !== "undefined" ? taipeiGoogleRestaurants : []),
  ...(typeof threadsRestaurants !== "undefined" ? threadsRestaurants : [])
])).filter(item=>!/(附近巷弄|小吃群$|熱炒群$|腰子湯群$|周邊店$)/.test(item.name)).map(normalizeRestaurant).sort((a, b) => restaurantSortRank(a) - restaurantSortRank(b) || a.rank - b.rank);

function normalizeRestaurant(item) {
  if (item.priceUnknown) return {...item,price:"價位待確認"};
  const priceTag = overridePriceTag(item) || item.tags.find((tag) => /^p[1-4]$/.test(tag)) || inferPriceTag(item);
  const price = priceTag ? tagLabel(priceTag) : "價位待確認";
  const tagsWithoutPrice = item.tags.filter((tag) => !/^p[1-4]$/.test(tag) && !(item.rating != null && /^rating4[68]$/.test(tag)));
  const categoryTags = [
    ...(isCafeRestaurant(item) ? ["cafe"] : []),
    ...(isBarRestaurant(item) ? ["bar"] : [])
  ];
  return {
    ...item,
    price,
    tags: [...new Set([...tagsWithoutPrice, ...categoryTags, ...(item.rating >= 4.6 ? ["rating46"] : []), ...(item.rating >= 4.8 ? ["rating48"] : []), ...(priceTag ? [priceTag] : [])])]
  };
}

function overridePriceTag(item) {
  const text = `${item.name} ${item.destination || ""}`;
  return PRICE_OVERRIDES.find((rule) => rule.pattern.test(text))?.tag || "";
}

function isCafeRestaurant(item) {
  const text = `${item.name} ${item.cuisine || ""} ${item.destination || ""}`;
  return /咖啡|Coffee|Cafe|Café|Kaffe|Roasting|Roasters/i.test(text);
}

function isBarRestaurant(item) {
  const text = `${item.name} ${item.cuisine || ""} ${item.destination || ""}`;
  if (BAR_EXCLUDE_PATTERNS.some((pattern) => pattern.test(text))) return false;
  return /酒吧|酒場|酒館|餐酒|小酒館|居酒|\b(?:Bar|Bistro|Pub|Cocktail|Speakeasy)\b/i.test(text);
}

function inferPriceTag(item) {
  return "";
}

function restaurantSortRank(item) {
  if (item.tags.includes("gourmet")) return item.rank - 20000;
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
  if (restaurantSortMode === "evidence") return sorted.sort((a,b)=>reviewWeightedScore(b)-reviewWeightedScore(a) || restaurantSortRank(a)-restaurantSortRank(b));
  if (restaurantSortMode === "distance") {
    return sorted.sort((a, b) => restaurantDistanceRank(a) - restaurantDistanceRank(b) || restaurantSortRank(a) - restaurantSortRank(b) || a.rank - b.rank);
  }
  return sorted.sort((a, b) => restaurantSortRank(a) - restaurantSortRank(b) || a.rank - b.rank);
}

function reviewWeightedScore(item) {
  if (!Number.isFinite(item.rating) || !Number.isFinite(item.reviewCount) || item.reviewCount <= 0) return -1;
  return (item.rating * item.reviewCount + 4.2 * 100) / (item.reviewCount + 100);
}

function reviewEvidence(item) {
  if (!item.checkedAt) return "商家尚未完成 API 對應；既有星等可能過時";
  if (!Number.isFinite(item.reviewCount)) return "評論數未確認";
  if (item.reviewCount < 100) return "樣本較少，星等容易波動";
  return `${item.reviewCount.toLocaleString()} 則評分；數量不代表真實性`;
}

function escapeRestaurantHtml(value) {
  return String(value).replace(/[&<>"']/g, char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
}

function reviewSampleHtml(item) {
  const sample = typeof reviewSignals !== 'undefined' ? reviewSignals.places[item.placeId] : null;
  if (!sample) return '';
  return `<details class="review-sample"><summary>評論樣本檢查（${sample.sampleCount} 則）</summary><p>${sample.shortCount} 則短評；${sample.repeatedCount} 則長文字完全重複。${sample.substantiveCount} 則達 10 字且未與其他長評完全重複，僅表示可閱讀資訊較多，不代表真實或正面。</p><p>Google 相關性選樣，非全店評論。檢查日期：${reviewSignals.checkedAt.slice(0,10)}。</p>${sample.references.map(ref=>`<a href="${escapeRestaurantHtml(ref.url)}" target="_blank" rel="noreferrer">查看 ${escapeRestaurantHtml(ref.author)} 的原始評論</a>`).join('<br>')}</details>`;
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
    ...(item.tags || []).map(tagLabel),
    ...(item.recommendations || []).flatMap(source => [source.author,source.summary])
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function renderRestaurants() {
  const grid = document.querySelector("#restaurantGrid");
  const filtered = sortRestaurants(restaurantList.filter((item) => {
    const filterMatch = restaurantMatchesFilters(item);
    const minimum = Number(document.querySelector("#reviewMinimum").value);
    return filterMatch && (!minimum || (item.reviewCount || 0) >= minimum) && (document.querySelector("#includeTemporarilyClosed").checked || item.businessStatus !== "CLOSED_TEMPORARILY") && matchesRestaurantQuery(item, restaurantQuery);
  }));
  window.restaurantMapView?.update(filtered);

  document.querySelectorAll(".restaurant-page .chip").forEach(button => button.setAttribute("aria-pressed",String(button.dataset.filter === "all" ? selectedRestaurantFilters.size === 0 : selectedRestaurantFilters.has(button.dataset.filter))));
  const loadMore = document.querySelector("#loadMoreRestaurants");
  loadMore.hidden = filtered.length <= restaurantVisibleLimit;
  loadMore.textContent = `顯示更多（還有 ${Math.max(0,filtered.length-restaurantVisibleLimit)} 間）`;

  document.querySelector("#restaurantCount").textContent =
    `目前顯示 ${filtered.length} 間；完整資料 ${restaurantList.length} 間，其中近距離步行 ${restaurantList.filter((item) => item.distance === "near").length} 間。`;

  if (!filtered.length) { grid.innerHTML = '<p class="empty-state">沒有符合條件的餐廳。可降低評論數門檻，或按「清除條件」重新選擇。</p>'; return; }
  grid.innerHTML = filtered.slice(0,restaurantVisibleLimit).map((item) => `
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
      </div>
      <p class="why">${item.why}</p>
      ${reviewSampleHtml(item)}
      ${(item.recommendations || []).map(source => `<div class="gourmet-note"><strong>${source.author} · ${source.kind}</strong><p>${source.summary}</p><a href="${source.url}" target="_blank" rel="noopener noreferrer">閱讀推薦來源</a><small>${source.date}${source.note ? `｜${source.note}` : ""}</small></div>`).join("")}
      <div class="tips">
        <span class="tip-line"><strong>區域</strong><span>${item.area}</span></span>
        <span class="tip-line"><strong>評分</strong><span>${item.googleRating || "點 Google Maps 即時查看"}</span></span>
        <span class="tip-line"><strong>參考性</strong><span>${reviewEvidence(item)}</span></span>
        <span class="tip-line"><strong>點法</strong><span>${item.order}</span></span>
        <span class="tip-line"><strong>提醒</strong><span>${item.booking}</span></span>
      </div>
      <div class="card__actions">
        <a class="secondary" href="${restaurantMapUrl(item.destination, "walking")}" target="_blank" rel="noreferrer">步行</a>
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

  if (selectedSources.length && !selectedSources.some((filter) => filter==='google' && item.rating != null ? item.rating >= 4.5 : item.tags.includes(filter))) return false;

  const prices = otherFilters.filter(filter => /^p[1-4]$/.test(filter));
  if (prices.length && !prices.some(filter => item.tags.includes(filter))) return false;
  const cuisines = otherFilters.filter(filter=>CUISINE_FILTERS.has(filter));
  if (cuisines.length && !cuisines.some(filter=>item.tags.includes(filter))) return false;
  return otherFilters.filter(filter => !/^p[1-4]$/.test(filter) && !CUISINE_FILTERS.has(filter)).every(filter => {
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

const filterContainer = document.querySelector(".restaurant-page .filters");
const filterGroups = [
  ["距離",filter=>filter==='all' || filter in DISTANCE_ORDER],
  ["推薦來源",filter=>SOURCE_FILTERS.has(filter) || filter==='michelin'],
  ["料理",filter=>CUISINE_FILTERS.has(filter)],
  ["價位",filter=>/^p[1-4]$/.test(filter)],
  ["其他",()=>true]
];
for (const [label,matches] of filterGroups) {
  const buttons = [...filterContainer.children].filter(button=>button.dataset.filter && matches(button.dataset.filter));
  if (!buttons.length) continue;
  const group=document.createElement('fieldset');
  const legend=document.createElement('legend'); legend.textContent=label; group.append(legend);
  for (const button of buttons) group.append(button);
  filterContainer.append(group);
}
const advancedFilters=document.createElement('details');
advancedFilters.className='advanced-filters';
advancedFilters.open=window.matchMedia('(min-width: 681px)').matches;
const advancedSummary=document.createElement('summary'); advancedSummary.textContent='料理、價位與其他條件';advancedFilters.append(advancedSummary);
for (const group of [...filterContainer.querySelectorAll('fieldset')].slice(2)) advancedFilters.append(group);
filterContainer.append(advancedFilters);
filterContainer.before(document.querySelector('.restaurant-page .search-box'));
document.querySelectorAll(".restaurant-page .chip").forEach((button) => {
  button.addEventListener("click", () => {
    restaurantVisibleLimit = 30;
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
  restaurantVisibleLimit = 30;
  restaurantQuery = event.target.value.trim();
  renderRestaurants();
});

document.querySelector("#restaurantSort").addEventListener("change", (event) => {
  restaurantVisibleLimit = 30;
  restaurantSortMode = event.target.value;
  renderRestaurants();
});

for (const id of ["reviewMinimum","includeTemporarilyClosed"]) document.querySelector(`#${id}`).addEventListener("change",()=>{restaurantVisibleLimit=30;renderRestaurants();});
document.querySelector("#loadMoreRestaurants").addEventListener("click",()=>{restaurantVisibleLimit+=30;renderRestaurants();});
document.querySelector("#clearRestaurantFilters").addEventListener("click",()=>{
  selectedRestaurantFilters.clear(); restaurantQuery=""; restaurantVisibleLimit=30;
  document.querySelector("#restaurantSearch").value="";
  document.querySelector("#reviewMinimum").value="0";
  document.querySelector("#includeTemporarilyClosed").checked=false;
  document.querySelectorAll(".restaurant-page .chip").forEach(button=>button.classList.toggle("is-active",button.dataset.filter==='all'));
  renderRestaurants();
});
renderRestaurants();
