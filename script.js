const ORIGIN = "台北市南京東路三段89巷附近";

const spots = [
  {
    rank: 1,
    name: "臺北市松山親子館",
    area: "松山區民生社區",
    type: "indoor",
    distance: "near",
    time: "約 10-15 分鐘",
    tags: ["免費/低成本", "雨天", "0-6 歲", "需預約"],
    why: "距離南京東路三段89巷非常近，館內分齡空間對兩歲寶寶最友善，是雨天、太熱、午睡前短行程的首選。",
    toddler: "優先預約場地開放；帶止滑襪、薄外套與水壺。",
    traffic: "開車/計程車最省力，也可搭公車到民生社區。",
    destination: "臺北市松山親子館 台北市民生東路5段163之1號3樓"
  },
  {
    rank: 2,
    name: "榮星花園公園",
    area: "中山區",
    type: "outdoor",
    distance: "near",
    time: "約 8-15 分鐘",
    tags: ["草地", "遊具", "推車", "遮蔭"],
    why: "平面大、撤退快、樹蔭與草地多，兩歲寶寶可以跑、看魚、玩遊具，照顧者壓力低。",
    toddler: "上午或傍晚最舒服；帶泡泡、球與防蚊。",
    traffic: "開車或計程車很快；附近餐飲補給方便。",
    destination: "榮星花園公園 台北市中山區"
  },
  {
    rank: 3,
    name: "花博公園共融遊戲場",
    area: "圓山/中山區",
    type: "outdoor",
    distance: "near",
    time: "約 12-20 分鐘",
    tags: ["共融遊具", "捷運", "推車", "可搭北美館"],
    why: "遊具豐富、捷運圓山站好到，能跟市集、花博園區、北美館組成室內外混搭。",
    toddler: "週末人多，兩歲寶寶建議避開尖峰，先玩低高度設施。",
    traffic: "捷運到圓山站最穩；開車需注意停車與活動人潮。",
    destination: "花博公園共融遊戲場 台北市中山區玉門街1號"
  },
  {
    rank: 4,
    name: "臺北市立美術館兒童藝術教育中心",
    area: "圓山/中山區",
    type: "indoor",
    distance: "near",
    time: "約 12-20 分鐘",
    tags: ["雨天", "美術館", "推車", "可搭花博"],
    why: "展覽空間、兒童教育計畫與花博公園距離近，適合不想只跑遊戲場的半日行程。",
    toddler: "先確認當期展覽與兒藝中心開放狀態；兩歲以短時間互動為主。",
    traffic: "捷運圓山站步行可達，推車動線相對友善。",
    destination: "臺北市立美術館 兒童藝術教育中心"
  },
  {
    rank: 5,
    name: "大安森林公園",
    area: "大安區",
    type: "outdoor",
    distance: "near",
    time: "約 10-20 分鐘",
    tags: ["大草地", "捷運", "推車", "遮蔭"],
    why: "大草地、步道、鳥類與遊戲區都有，寶寶可以自由走動，對大人也舒服。",
    toddler: "下午人多，建議早上去；帶野餐墊但不要把行程拉太長。",
    traffic: "捷運大安森林公園站或開車皆可。",
    destination: "大安森林公園"
  },
  {
    rank: 6,
    name: "臺北市中山親子館",
    area: "花博園區",
    type: "indoor",
    distance: "near",
    time: "約 12-20 分鐘",
    tags: ["雨天", "0-6 歲", "需預約", "可搭花博"],
    why: "位置接近圓山與花博，預約成功時是很穩的雨備，也能接戶外散步。",
    toddler: "確認預約時段與陪同成人規則；週末熱門時段很快滿。",
    traffic: "捷運圓山站加步行，或開車到花博周邊停車場。",
    destination: "臺北市中山親子館 臺北市玉門街1號"
  },
  {
    rank: 7,
    name: "大佳河濱公園",
    area: "中山區河濱",
    type: "outdoor",
    distance: "near",
    time: "約 12-22 分鐘",
    tags: ["大空間", "騎車", "野餐", "傍晚"],
    why: "空間開闊、視野好，適合滑步車、泡泡、球類與短野餐，寶寶跑動不容易受限。",
    toddler: "風大時要備外套；夏天選傍晚，注意河濱日曬。",
    traffic: "開車最方便；停車後仍需走一小段。",
    destination: "大佳河濱公園"
  },
  {
    rank: 8,
    name: "臺北市大安親子館",
    area: "大安區延吉街",
    type: "indoor",
    distance: "near",
    time: "約 12-22 分鐘",
    tags: ["雨天", "0-6 歲", "需預約", "市區補給"],
    why: "市中心室內放電選項，適合雨天或炎熱天氣；周邊餐飲與交通補給強。",
    toddler: "兩歲寶寶可選感統、律動、自由遊戲型活動。",
    traffic: "開車停車成本較高；計程車或捷運轉步行更穩。",
    destination: "臺北市大安親子館 臺北市延吉街246巷10號"
  },
  {
    rank: 9,
    name: "臺北探索館",
    area: "信義區市府",
    type: "indoor",
    distance: "near",
    time: "約 15-25 分鐘",
    tags: ["雨天", "免費", "捷運", "短行程"],
    why: "室內、免費、可搭信義商圈補給；對兩歲來說不是大型放電場，但很適合雨天短暫轉場。",
    toddler: "把它當 45-75 分鐘行程，不要期待玩整天。",
    traffic: "捷運市政府站或開車到信義區停車場。",
    destination: "台北探索館 臺北市市府路1號"
  },
  {
    rank: 10,
    name: "國父紀念館翠湖與廣場",
    area: "信義區",
    type: "outdoor",
    distance: "near",
    time: "約 10-20 分鐘",
    tags: ["捷運", "推車", "跑跳", "看魚"],
    why: "平坦好推、視野開闊，寶寶可以看鴨魚、跑廣場，旁邊餐飲與捷運都方便。",
    toddler: "廣場曝曬，夏天避開中午；湖邊牽好手。",
    traffic: "捷運國父紀念館站最簡單。",
    destination: "國父紀念館 翠湖"
  },
  {
    rank: 11,
    name: "臺北市信義親子館",
    area: "信義區",
    type: "indoor",
    distance: "near",
    time: "約 15-25 分鐘",
    tags: ["雨天", "0-6 歲", "需預約", "捷運"],
    why: "信義區穩定雨備，與台北探索館、信義商圈餐飲可組合。",
    toddler: "親子館是目的地，不是順路逛街附屬；先搶預約再排餐廳。",
    traffic: "捷運台北101/世貿或市政府站再步行。",
    destination: "臺北市信義親子館 臺北市松勤街50號A館"
  },
  {
    rank: 12,
    name: "松山文創園區與生態景觀池",
    area: "信義/松山交界",
    type: "outdoor",
    distance: "near",
    time: "約 10-20 分鐘",
    tags: ["散步", "推車", "室內展", "餐飲"],
    why: "不是純遊戲場，但散步、看水池、看展與餐飲整合方便，適合低強度週末。",
    toddler: "展覽需看主題，兩歲不一定買單；戶外水池旁注意安全。",
    traffic: "開車或捷運國父紀念館/市政府站步行。",
    destination: "松山文創園區"
  },
  {
    rank: 13,
    name: "永盛公園都市跳島遊戲場",
    area: "中山區",
    type: "outdoor",
    distance: "near",
    time: "約 10-18 分鐘",
    tags: ["特色遊具", "市區", "短行程"],
    why: "中山區特色遊戲場，適合短時間放電，離南京東路三段89巷不遠。",
    toddler: "部分設施對兩歲略有挑戰，照顧者需近距離陪同。",
    traffic: "開車、計程車或捷運中山站周邊步行。",
    destination: "永盛公園 都市跳島 台北市中山區"
  },
  {
    rank: 14,
    name: "和安公園共融遊戲場",
    area: "大安區復興南路",
    type: "outdoor",
    distance: "near",
    time: "約 10-18 分鐘",
    tags: ["共融遊具", "近距離", "短行程"],
    why: "離中心點近，適合不想開遠、只需要一段遊具時間的週末早晨。",
    toddler: "公園尺度較小，搭配附近咖啡/餐點更剛好。",
    traffic: "計程車或捷運大安站周邊步行。",
    destination: "和安公園 台北市大安區復興南路一段313巷"
  },
  {
    rank: 15,
    name: "迎風河濱公園",
    area: "松山區河濱",
    type: "outdoor",
    distance: "near",
    time: "約 12-25 分鐘",
    tags: ["大空間", "傍晚", "跑跳", "停車"],
    why: "空間大、人潮分散，適合滑步車、球與放風；比市區公園更能消耗體力。",
    toddler: "河濱遮蔭有限，避開正午；遇風大調整備品。",
    traffic: "開車較方便。",
    destination: "迎風河濱公園"
  },
  {
    rank: 16,
    name: "臺北市大同親子館",
    area: "大同區",
    type: "indoor",
    distance: "mid",
    time: "約 20-30 分鐘",
    tags: ["雨天", "0-6 歲", "需預約"],
    why: "親子館品質穩定，當松山/中山/大安沒名額時，是合理替代。",
    toddler: "確認場地開放時段；餐飲可接大稻埕但週末人多。",
    traffic: "捷運或開車皆可，路況好時接近近距離。",
    destination: "臺北市大同親子館 臺北市涼州街2-16號"
  },
  {
    rank: 17,
    name: "臺北市中正親子館",
    area: "中正區仁愛路",
    type: "indoor",
    distance: "mid",
    time: "約 20-30 分鐘",
    tags: ["雨天", "0-6 歲", "需預約", "市區"],
    why: "市中心親子館備案，雨天或熱天可優先考慮。",
    toddler: "適合 1.5-2 小時，不要排太滿。",
    traffic: "捷運善導寺/台大醫院周邊轉步行，或開車。",
    destination: "臺北市中正親子館 臺北市仁愛路1段17號3樓"
  },
  {
    rank: 18,
    name: "臺北市 131 FUN 心玩親子館",
    area: "中正區三元街",
    type: "indoor",
    distance: "mid",
    time: "約 20-35 分鐘",
    tags: ["雨天", "0-6 歲", "需預約"],
    why: "多一個公辦室內場館選擇，適合熱門親子館滿額時替補。",
    toddler: "先看活動類型，兩歲優先自由探索與感統活動。",
    traffic: "開車較直覺，停車需預留時間。",
    destination: "臺北市131FUN心玩親子館 臺北市三元街131號"
  },
  {
    rank: 19,
    name: "國立臺灣科學教育館",
    area: "士林區",
    type: "indoor",
    distance: "mid",
    time: "約 25-40 分鐘",
    tags: ["雨天", "展館", "可搭兒童新樂園", "推車"],
    why: "士林親子大點位，展館大、雨備強；兩歲可看互動展示、跑動轉換空間。",
    toddler: "不要每層都逛，先挑兒童友善展區；午餐與午睡時間要留白。",
    traffic: "開車或捷運劍潭/士林轉公車；週末周邊人潮多。",
    destination: "國立臺灣科學教育館 臺北市士商路189號"
  },
  {
    rank: 20,
    name: "臺北市兒童新樂園",
    area: "士林區",
    type: "outdoor",
    distance: "mid",
    time: "約 25-45 分鐘",
    tags: ["遊樂設施", "整天", "停車", "親子熱門"],
    why: "兩歲可玩的設施有限但氛圍強，搭配科教館/天文館可變整天行程。",
    toddler: "避開太刺激設施，先查身高限制；推車、帽子、水與替換衣物必備。",
    traffic: "開車方便但假日停車易滿；捷運轉公車也可。",
    destination: "臺北市兒童新樂園 臺北市承德路5段55號"
  },
  {
    rank: 21,
    name: "臺北市立天文科學教育館",
    area: "士林區",
    type: "indoor",
    distance: "mid",
    time: "約 25-45 分鐘",
    tags: ["雨天", "展館", "可搭科教館"],
    why: "室內展館、冷氣與士林園區組合方便；對兩歲主要是看光影與短暫探索。",
    toddler: "天文內容偏大童，兩歲行程要短，別排太多節目。",
    traffic: "與科教館/兒童新樂園同區，可一次停車移動。",
    destination: "臺北市立天文科學教育館 臺北市基河路363號"
  },
  {
    rank: 22,
    name: "士林官邸公園",
    area: "士林區",
    type: "outdoor",
    distance: "mid",
    time: "約 25-40 分鐘",
    tags: ["花園", "推車", "捷運", "可搭圖書館"],
    why: "環境漂亮、步道好推，適合慢走看花與拍照，附近可接李科永圖書館或福林公園。",
    toddler: "不是高強度遊戲場，適合需要低刺激散步的週末。",
    traffic: "捷運士林站步行，或開車。",
    destination: "士林官邸公園"
  },
  {
    rank: 23,
    name: "李科永紀念圖書館",
    area: "士林福林公園",
    type: "indoor",
    distance: "mid",
    time: "約 25-40 分鐘",
    tags: ["雨天", "閱讀", "推車", "可搭士林官邸"],
    why: "公園裡的圖書館，地下樓有親子及兒童閱讀區，適合把戶外散步切換成冷靜收尾。",
    toddler: "帶借書證或台北市圖 APP；館內以安靜閱讀為主。",
    traffic: "捷運士林站步行 7-8 分鐘左右。",
    destination: "臺北市立圖書館李科永紀念圖書館 臺北市中正路15號"
  },
  {
    rank: 24,
    name: "福林公園",
    area: "士林區",
    type: "outdoor",
    distance: "mid",
    time: "約 25-40 分鐘",
    tags: ["公園", "可搭圖書館", "捷運"],
    why: "和士林官邸、李科永圖書館連成一個低壓半日圈，適合推車與短遊戲。",
    toddler: "當作圖書館或士林官邸的戶外延伸，不建議單獨開很遠只去這裡。",
    traffic: "捷運士林站步行。",
    destination: "福林公園 台北市士林區"
  },
  {
    rank: 25,
    name: "碧湖公園",
    area: "內湖區",
    type: "outdoor",
    distance: "mid",
    time: "約 25-40 分鐘",
    tags: ["湖景", "推車", "捷運", "散步"],
    why: "湖邊步道、開闊景觀與內湖餐飲可組合，適合不想去人擠人的公園。",
    toddler: "湖邊牽手，夏天注意曝曬；可搭碧湖國小周邊活動但需確認開放。",
    traffic: "捷運文德站可到，開車也方便。",
    destination: "碧湖公園 台北市內湖區"
  },
  {
    rank: 26,
    name: "大湖公園",
    area: "內湖區",
    type: "outdoor",
    distance: "mid",
    time: "約 30-50 分鐘",
    tags: ["湖景", "捷運", "推車", "大空間"],
    why: "湖景、草地與捷運站整合，適合半日慢行，天氣好時很舒服。",
    toddler: "距離較遠，建議排半日；湖邊安全距離要顧好。",
    traffic: "捷運大湖公園站最簡單。",
    destination: "大湖公園 台北市內湖區"
  },
  {
    rank: 27,
    name: "臺北市內湖親子館",
    area: "內湖區",
    type: "indoor",
    distance: "mid",
    time: "約 25-45 分鐘",
    tags: ["雨天", "0-6 歲", "需預約"],
    why: "若要往內湖方向移動，這是穩定室內選項，可接碧湖/大湖公園。",
    toddler: "先預約再決定是否加戶外點；兩歲不適合硬排雙主菜。",
    traffic: "開車較方便，捷運文德/港墘周邊再步行。",
    destination: "臺北市內湖親子館 臺北市內湖路1段659號2樓"
  },
  {
    rank: 28,
    name: "青年公園",
    area: "萬華區",
    type: "outdoor",
    distance: "mid",
    time: "約 25-45 分鐘",
    tags: ["大公園", "遊具", "草地", "停車"],
    why: "大型公園、遊具與草地完整，適合想讓寶寶大量活動的半日。",
    toddler: "園區大，先鎖定遊戲場區域，避免推太久。",
    traffic: "開車方便，公車也可。",
    destination: "青年公園 台北市萬華區"
  },
  {
    rank: 29,
    name: "自來水園區",
    area: "公館/中正區",
    type: "outdoor",
    distance: "mid",
    time: "約 25-40 分鐘",
    tags: ["夏天", "玩水", "捷運", "季節性"],
    why: "夏天放電效率高，公館補給方便；非玩水季則推薦度下降。",
    toddler: "先查水鄉庭園開放與票價；兩歲要備泳尿布、防滑鞋、毛巾與換洗衣物。",
    traffic: "捷運公館站步行可達。",
    destination: "自來水園區 臺北市思源街1號"
  },
  {
    rank: 30,
    name: "臺北市立動物園",
    area: "文山區木柵",
    type: "outdoor",
    distance: "mid",
    time: "約 35-60 分鐘",
    tags: ["整天", "捷運", "推車", "大行程"],
    why: "動物對兩歲吸引力強，園區完善，但移動與體力成本高，適合天氣穩定時安排半天到一天。",
    toddler: "只選 2-3 區，不要從頭走到尾；推車與午睡安排很重要。",
    traffic: "捷運文湖線直達動物園站；開車假日停車需提早。",
    destination: "臺北市立動物園 臺北市新光路2段30號"
  },
  {
    rank: 31,
    name: "臺北市文山親子館",
    area: "文山區",
    type: "indoor",
    distance: "mid",
    time: "約 35-55 分鐘",
    tags: ["雨天", "0-6 歲", "需預約"],
    why: "往木柵方向的雨備，適合與動物園或文山親友行程搭配。",
    toddler: "單獨從南京東路三段89巷過去略遠，建議有其他文山行程再排。",
    traffic: "開車或捷運轉公車。",
    destination: "臺北市文山親子館 臺北市木柵路1段177號2樓"
  },
  {
    rank: 32,
    name: "臺北市南港親子館",
    area: "南港區",
    type: "indoor",
    distance: "mid",
    time: "約 30-50 分鐘",
    tags: ["雨天", "0-6 歲", "需預約"],
    why: "東區/南港方向室內備案，預約成功時很穩。",
    toddler: "若只是從南京東路三段89巷附近出發，優先度低於松山/信義/內湖。",
    traffic: "開車或捷運南港周邊再轉乘。",
    destination: "臺北市南港親子館 臺北市南港路1段287巷2弄15號"
  },
  {
    rank: 33,
    name: "新北大都會公園",
    area: "三重/新莊",
    type: "outdoor",
    distance: "mid",
    time: "約 35-60 分鐘",
    tags: ["大公園", "特色遊具", "捷運", "整天"],
    why: "大型特色遊戲場與河濱空間很強，適合想換城市尺度的大放電日。",
    toddler: "遊具熱門且區域大，兩歲需緊跟；夏天曝曬要避開中午。",
    traffic: "開車或捷運三重站/捷運先嗇宮站周邊轉入。",
    destination: "新北大都會公園"
  },
  {
    rank: 34,
    name: "板橋435藝文特區",
    area: "新北板橋",
    type: "outdoor",
    distance: "mid",
    time: "約 35-60 分鐘",
    tags: ["草地", "展覽", "親子", "半日"],
    why: "空間寬、活動多、可拍照與散步，適合不想只去公園的中距離半日。",
    toddler: "活動與展覽變動大，先查當週資訊；周邊停車預留時間。",
    traffic: "開車較方便，或捷運板橋站轉公車/計程車。",
    destination: "板橋435藝文特區"
  },
  {
    rank: 35,
    name: "陽明山前山公園",
    area: "北投/陽明山",
    type: "outdoor",
    distance: "far",
    time: "約 60-80 分鐘以上",
    tags: ["自然", "避暑", "半日", "遠"],
    why: "自然感與溫度舒適度高，但山路與交通成本明顯增加，適合精神體力都足的週末。",
    toddler: "帶外套、防蚊與簡單食物；不要排太多山上點。",
    traffic: "開車最方便，假日上山與停車需保守估算。",
    destination: "陽明山前山公園"
  },
  {
    rank: 36,
    name: "淡水河岸與海關碼頭周邊",
    area: "新北淡水",
    type: "outdoor",
    distance: "far",
    time: "約 60-90 分鐘以上",
    tags: ["河岸", "捷運", "散步", "遠"],
    why: "河岸散步、看船、吃點心對寶寶有吸引力，但人潮與距離讓它更適合當遠距離半日。",
    toddler: "假日人潮很重，推車動線要保守；傍晚回程塞車風險高。",
    traffic: "捷運淡水站可達；開車需估停車與塞車。",
    destination: "淡水海關碼頭"
  }
];

const allSpotsRaw = [
  ...spots,
  ...(typeof officialNearParks !== "undefined" ? officialNearParks : []),
  ...(typeof googleBabyPlaces !== "undefined" ? googleBabyPlaces : []),
  ...(typeof userRecommendedBabyPlaces !== "undefined" ? userRecommendedBabyPlaces : [])
];

const allSpots = mergeDuplicateSpots(allSpotsRaw);

let activeFilters = new Set();
let activeQuery = "";
let spotSortMode = "recommended";

function normalizeSpotName(name) {
  return String(name || "")
    .replace(/\s+/g, "")
    .replace(/[（(].*?[）)]/g, "")
    .toLowerCase();
}

function mergeDuplicateSpots(spotsList) {
  const merged = new Map();
  for (const spot of spotsList) {
    const key = normalizeSpotName(spot.name);
    if (!merged.has(key)) {
      merged.set(key, { ...spot, tags: [...(spot.tags || [])] });
      continue;
    }

    const existing = merged.get(key);
    existing.tags = [...new Set([...(existing.tags || []), ...(spot.tags || [])])];
    existing.mapUrl = existing.mapUrl || spot.mapUrl;
    existing.destination = existing.destination || spot.destination;
  }
  return [...merged.values()];
}

function mapUrl(destination, mode = "driving") {
  const params = new URLSearchParams({
    api: "1",
    origin: ORIGIN,
    destination,
    travelmode: mode
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

function searchUrl(destination) {
  const params = new URLSearchParams({
    api: "1",
    query: destination
  });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}

function labelDistance(value) {
  return { near: "近", mid: "中", far: "遠" }[value] || value;
}

function labelType(value) {
  return value === "indoor" ? "室內" : "室外";
}

function spotMatchesQuery(spot, query) {
  if (!query) return true;
  const haystack = [
    spot.name,
    spot.area,
    spot.type,
    spot.distance,
    spot.time,
    spot.why,
    spot.toddler,
    spot.traffic,
    spot.destination,
    ...(spot.tags || [])
  ].join(" ").toLowerCase();
  return haystack.includes(query.toLowerCase());
}

function spotDistanceRank(spot) {
  const categoryBase = { near: 0, mid: 100000, far: 200000 }[spot.distance] ?? 300000;
  const meterMatch = `${spot.why || ""} ${spot.traffic || ""}`.match(/距離中心約\s*([\d,.]+)\s*(公里|公尺)/);
  if (meterMatch) {
    const value = Number(meterMatch[1].replace(/,/g, ""));
    return categoryBase + (meterMatch[2] === "公里" ? value * 1000 : value);
  }

  const minutes = [...String(spot.time || "").matchAll(/\d+/g)].map((match) => Number(match[0]));
  if (minutes.length) return categoryBase + Math.max(...minutes) * 500;

  return categoryBase + spot.rank;
}

function sortSpots(items) {
  const sorted = [...items];
  if (spotSortMode === "distance") {
    return sorted.sort((a, b) => spotDistanceRank(a) - spotDistanceRank(b) || a.rank - b.rank);
  }
  return sorted.sort((a, b) => a.rank - b.rank);
}

function renderSpots() {
  const grid = document.querySelector("#spotGrid");
  const filtered = sortSpots(allSpots.filter((spot) => {
    const filterMatch = [...activeFilters].every((filter) => {
      if (filter === "rain") return spot.tags.includes("雨天");
      if (filter === "play") return spot.tags.includes("遊具") || spot.why.includes("遊樂設施");
      if (filter === "sand") return spot.tags.includes("沙坑") || spot.why.includes("沙坑") || spot.why.includes("戲沙");
      if (filter === "swing") return spot.tags.includes("鞦韆") || spot.why.includes("鞦");
      if (filter === "google") return spot.tags.includes("Google高評分");
      if (filter === "recommend") return spot.tags.includes("網友推薦");
      return spot.type === filter || spot.distance === filter;
    });
    return filterMatch && spotMatchesQuery(spot, activeQuery);
  }));

  document.querySelector("#resultCount").textContent =
    `目前顯示 ${filtered.length} 個點位；完整資料 ${allSpots.length} 個，其中近距離 ${allSpots.filter((spot) => spot.distance === "near").length} 個。`;

  grid.innerHTML = filtered.map((spot) => `
    <article class="spot-card" data-type="${spot.type}" data-distance="${spot.distance}">
      <div class="spot-card__top">
        <div>
          <h3>${spot.name}</h3>
          <div class="meta">
            <span class="pill pill--${spot.type}">${labelType(spot.type)}</span>
            <span class="pill pill--${spot.distance}">${labelDistance(spot.distance)}｜${spot.time}</span>
            ${spot.tags.map((tag) => `<span class="pill">${tag}</span>`).join("")}
          </div>
        </div>
        <span class="rank">${spot.rank}</span>
      </div>
      <p class="why">${spot.why}</p>
      <div class="tips">
        <span class="tip-line"><strong>區域</strong><span>${spot.area}</span></span>
        <span class="tip-line"><strong>寶寶</strong><span>${spot.toddler}</span></span>
        <span class="tip-line"><strong>交通</strong><span>${spot.traffic}</span></span>
      </div>
      <div class="card__actions">
        <a href="${mapUrl(spot.destination, "driving")}" target="_blank" rel="noreferrer">開車導航</a>
        <a class="secondary" href="${mapUrl(spot.destination, "transit")}" target="_blank" rel="noreferrer">大眾運輸</a>
        <a class="secondary" href="${spot.mapUrl || searchUrl(spot.destination)}" target="_blank" rel="noreferrer">Google Maps</a>
      </div>
    </article>
  `).join("");
}

document.querySelectorAll(".chip").forEach((button) => {
  button.addEventListener("click", () => {
    const filter = button.dataset.filter;
    if (filter === "all") {
      activeFilters.clear();
      document.querySelectorAll(".chip").forEach((item) => item.classList.remove("is-active"));
      button.classList.add("is-active");
    } else {
      document.querySelector('[data-filter="all"]').classList.remove("is-active");
      if (activeFilters.has(filter)) {
        activeFilters.delete(filter);
        button.classList.remove("is-active");
      } else {
        activeFilters.add(filter);
        button.classList.add("is-active");
      }
      if (activeFilters.size === 0) {
        document.querySelector('[data-filter="all"]').classList.add("is-active");
      }
    }
    renderSpots();
  });
});

document.querySelector("#spotSearch").addEventListener("input", (event) => {
  activeQuery = event.target.value.trim();
  renderSpots();
});

document.querySelector("#spotSort").addEventListener("change", (event) => {
  spotSortMode = event.target.value;
  renderSpots();
});

renderSpots();
