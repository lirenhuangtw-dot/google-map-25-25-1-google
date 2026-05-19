const RESTAURANT_ORIGIN = "台北市南京東路三段89巷附近";
let selectedRestaurantFilters = new Set();
let restaurantQuery = "";
const restaurantList = [
  ...restaurants,
  ...(typeof extraNearRestaurants !== "undefined" ? extraNearRestaurants : []),
  ...(typeof moreLocalRestaurants !== "undefined" ? moreLocalRestaurants : [])
].map(normalizeRestaurant).sort((a, b) => a.rank - b.rank);

function normalizeRestaurant(item) {
  const priceTag = item.tags.find((tag) => /^p[1-4]$/.test(tag)) || inferPriceTag(item);
  const price = item.price || tagLabel(priceTag);
  return {
    ...item,
    price,
    tags: [...new Set([...item.tags, priceTag])]
  };
}

function inferPriceTag(item) {
  if (item.tags.includes("far") || item.rank <= 4 || item.tags.includes("michelin")) return "p4";
  if (item.tags.includes("hotpot") || item.cuisine.includes("燒肉") || item.cuisine.includes("牛排")) return "p3";
  if (item.tags.includes("solo") && !item.tags.includes("booking")) return "p1";
  return "p2";
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
  return { near: "近", mid: "中", far: "遠" }[value] || value;
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
  const filtered = restaurantList.filter((item) => {
    const filterMatch = [...selectedRestaurantFilters].every((filter) => {
      if (["near", "mid", "far"].includes(filter)) return item.distance === filter;
      return item.tags.includes(filter);
    });
    return filterMatch && matchesRestaurantQuery(item, restaurantQuery);
  });

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
      <div class="tips">
        <span class="tip-line"><strong>區域</strong><span>${item.area}</span></span>
        <span class="tip-line"><strong>評分</strong><span>${item.googleRating || "點 Google Maps 即時查看"}</span></span>
        <span class="tip-line"><strong>點法</strong><span>${item.order}</span></span>
        <span class="tip-line"><strong>提醒</strong><span>${item.booking}</span></span>
      </div>
      <div class="card__actions">
        <a href="${restaurantMapUrl(item.destination, "driving")}" target="_blank" rel="noreferrer">開車/計程車</a>
        <a class="secondary" href="${restaurantMapUrl(item.destination, "transit")}" target="_blank" rel="noreferrer">大眾運輸</a>
        <a class="secondary" href="${restaurantSearchUrl(item.destination)}" target="_blank" rel="noreferrer">Google Maps</a>
      </div>
    </article>
  `).join("");
}

function tagLabel(tag) {
  return {
    tw: "台菜",
    jp: "日式",
    cn: "中式",
    west: "西式",
    bistro: "餐酒",
    hotpot: "火鍋",
    michelin: "米其林/必比登",
    solo: "一人可",
    booking: "可訂位",
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

renderRestaurants();
