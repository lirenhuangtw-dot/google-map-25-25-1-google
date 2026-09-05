const gourmetRecommendations = [
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
  return items.map(item => {
    const recommendations = gourmetRecommendations.filter(source => source.name === item.name);
    return recommendations.length ? {...item, tags:[...new Set([...item.tags,"gourmet"])], recommendations} : item;
  });
}
