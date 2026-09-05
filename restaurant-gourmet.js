const gourmetNewPlaces = [
  ["意麵王","台北市大同區歸綏街202號","乾意麵","jpicks","詹姆士推薦乾意麵，重點是麵條口感與油蔥香；屬長年回訪的懷舊口味。","https://www.corner.inc/place/pgTxPBhk5gC4"],
  ["六條家庭小吃","台北市中山區林森北路107巷53號","羊肉炒飯加辣","jpicks","詹姆士推薦羊肉炒飯加辣，著重鍋氣與飯粒口感，適合想吃巷弄家常熱炒的人。","https://taiwanfoodie.org/restaurants/liu_tiao_family_eatery/"],
  ["林家乾麵","台北市中正區泉州街11號","乾麵","jpicks","詹姆士推薦乾麵，喜歡其簡單醬料與麵條咬勁，不是靠豐富配料取勝。","https://news.ustv.com.tw/food/shop/3546"],
  ["正老牌魷魚平","台北市萬華區康定路2號","炒米粉","jpicks","詹姆士推薦炒米粉，重點是米粉口感、肉燥與豆芽的搭配。","https://bonie.tw/taipei-zheng-lao-pai-you-yu-ping-taiwanese-squid-thick-soup/"],
  ["古月芝麻蔥油餅","台北市北投區中央南路一段218號","韭菜盒","jpicks","詹姆士特別推薦韭菜盒，喜歡韭菜鮮脆、餡量與乾烙外皮。","https://taiwanfoodie.org/en/restaurants/guyue_sesame_scallion_cake/"],
  ["家鄉味水餃","台北市中山區中山北路二段96巷19號","薺菜水餃","wpicks","王瑞瑤推薦較少見的薺菜水餃，特色是野菜香氣與清爽風味。","https://www.youtube.com/watch?v=98TT0_mDvTo"],
  ["玉林雞腿大王（西門）","台北市萬華區中華路一段114巷9號","排骨酸菜麵","wpicks","王瑞瑤推薦排骨酸菜麵，著重厚切排骨與傳統炸衣；注意不是同名的信義區店。","https://www.319papago.idv.tw/SuperTaste/108-E.html"],
  ["墨西哥女婿燒餅","台北市松山區新東街6巷2號","手作燒餅、墨西哥捲餅","mexico","周花花的實吃食記推薦台墨混合風味；手作燒餅結合墨西哥料理是特色。","https://tenjo.tw/mexico-soninlaw/"],
  ["兔寶寶漢堡店","台北市中山區民生東路二段115巷9號","創意傳統早餐","rabbit","在地食客分享的創意早餐選擇；原文提及陪沈團，但此處僅歸為食客推薦，沒有冒充頻道背書。","https://www.dcard.tw/f/food/p/258455394"],
  ["Blind Pig by R.D.","台北市大安區文昌街241號2樓","招牌炸雞","blind","實吃文章推薦招牌炸雞與美式酒吧料理；適合想兼顧吃飯與喝酒的人，低消與服務費請先確認。","https://www.popdaily.com.tw/forum/food/1497907"]
];
const gourmetSourceGroups = {
  jpicks: {author:"詹姆士",kind:"廚師親選・500碗專訪",date:"2023-06-27",url:"https://500times.udn.com/wtimes/story/123497/7142862"},
  wpicks: {author:"王瑞瑤",kind:"美食作家親選・500碗專訪",date:"2023",url:"https://500times.udn.com/wtimes/amp/story/123497/7195797"},
  mexico: {author:"周花花",kind:"美食作者實吃",date:"2026-04-21",url:"https://tenjo.tw/mexico-soninlaw/"},
  rabbit: {author:"eatzhiju 一隻豬",kind:"Dcard 食客分享",date:"原文日期請見來源",url:"https://www.dcard.tw/f/food/p/258455394"},
  blind: {author:"PopDaily 食客分享",kind:"實吃食記",date:"原文日期請見來源",url:"https://www.popdaily.com.tw/forum/food/1497907"}
};
const gourmetRecommendations = [
  ...gourmetNewPlaces.map(([name,address,dish,group,summary,addressSource])=>({name,summary,...gourmetSourceGroups[group],note:"歷史推薦不代表現況；本批地址依公開資料核對，Google 營業狀態及交通時間待確認。",addressSource})),
  {name:"賣麵炎仔",author:"Nash，神之領域",kind:"美食作者食記",date:"2026-08-05",url:"https://nash.tw/selling20260805/",summary:"推薦傳統麵食與切仔料，適合喜歡台式早餐、老店口味的人；作者建議提早到店避開人潮。"},
  ...[
    ["種福園","在地食客推薦斤餅與合菜，適合想吃北方麵食、多人分食的一餐。"],
    ["元記潤餅捲","推薦潤餅與辣油，偏好南部風味、喜歡辣的人可參考。"],
    ["66巷鮮魚料理","推薦鮮魚與較少見的魚種，調味走簡單路線；不是以低價為主要賣點。"],
    ["南香排骨飯","推薦重點除了排骨，也特別提到白飯口感，適合日常便當。"],
    ["京簡康 台北伊通店","推薦雞胸肉的嫩度及配菜，偏向清爽日常餐。"],
    ["一隅 日式居酒屋","作者列為個人前三名居酒屋；屬個人口味推薦，不代表客觀排名。"],
    ["博多幸龍總本店","推薦拉麵與晚間用餐選擇；實際營業時間仍請看店家公告。"],
    ["京都御握丸ONIMARU 台北長春店","推薦飯糰口味，但也提醒價格比便利商店高。"]
  ].map(([name,summary])=>({name,summary,author:"mumusandiary",kind:"Threads 在地食客",date:"2026-05（使用者提供截圖）",url:"https://www.threads.com/@gr_66663/post/DXZdS5pj807",note:"推薦內容依提供的留言截圖整理；連結為原討論串，非單則留言。",}))
];

function applyGourmetRecommendations(items) {
  const combined = [...items];
  for (const [name,address,dish,group,summary] of gourmetNewPlaces) {
    if (items.some(item => item.name === name || item.destination === `${name} ${address}`)) continue;
    combined.push({name,rank:1200+gourmetNewPlaces.findIndex(p=>p[0]===name),area:address,destination:`${name} ${address}`,distance:"unknown",time:"交通時間待核對",priceUnknown:true,cuisine:group==='blind'?"餐酒/酒吧":"小吃",tags:group==='blind'?["bar","bistro"]:["tw"],why:summary,order:dish,booking:"Google 營業狀態尚未重新確認；出發前請確認店家公告。",mapUrl:`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name+' '+address)}`});
  }
  return combined.map(item => {
    const recommendations = gourmetRecommendations.filter(source => source.name === item.name);
    return recommendations.length ? {...item, tags:[...new Set([...item.tags,"gourmet"])], recommendations} : item;
  });
}
