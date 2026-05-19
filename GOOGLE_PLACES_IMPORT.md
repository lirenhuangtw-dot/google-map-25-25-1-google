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

## 寶寶景點匯入

```bash
GOOGLE_MAPS_API_KEY="你的 API key" node scripts/import-google-baby-places.mjs
```

預設會抓中心點 9000 公尺內的親子景點、公園、遊戲場、親子館、圖書館、展館與雨天備案，門檻是評分 `4.1+`、評論 `50+`，最多輸出 `100` 個點位到 `google-baby-places.js`。

## 一鍵更新餐廳與寶寶景點

```bash
GOOGLE_MAPS_API_KEY="你的 API key" node scripts/update-all-google-places.mjs
```

跑完後檢查 `restaurant-google-places.js` 與 `google-baby-places.js` 的 diff，確認資料合理再 commit/push。
