# Google Places 餐廳匯入

這個專案可以用 Google Places API 自動抓南京東路三段 89 巷附近的高評分餐廳，輸出到 `restaurant-google-places.js`，網站會自動載入。

## 使用方式

```bash
GOOGLE_MAPS_API_KEY="你的 API key" node scripts/import-google-places-restaurants.mjs
```

預設條件：

- 中心：`台北市南京東路三段89巷附近`
- 半徑：`1200` 公尺
- 最低評分：`4.2`
- 最少評論：`100`
- 最多輸出：`80` 間

## 可調整參數

```bash
GOOGLE_MAPS_API_KEY="你的 API key" \
RADIUS_METERS=1200 \
MIN_RATING=4.2 \
MIN_REVIEWS=100 \
MAX_RESULTS=80 \
node scripts/import-google-places-restaurants.mjs
```

如果想避免用文字定位中心點，可以明確提供座標：

```bash
GOOGLE_MAPS_API_KEY="你的 API key" \
CENTER_LAT="25.xxxxxx" \
CENTER_LNG="121.xxxxxx" \
node scripts/import-google-places-restaurants.mjs
```

## 匯入邏輯

- 會用 Nearby Search 和多組 Text Search 查附近餐廳。
- 會排除已存在於手工清單的餐廳名稱。
- 會排除評分低於門檻、評論數低於門檻、已停業或超出半徑的店。
- 會把 Google 評分、評論數、價位和 Google Maps 連結寫入資料檔。
- 輸出資料會加上 `Google高評分` 篩選標籤。
