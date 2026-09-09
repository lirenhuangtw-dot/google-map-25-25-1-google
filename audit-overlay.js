function applyPlaceAudit(items) {
  if (typeof placeAudit === "undefined") return items;
  return items.flatMap(item => {
    item = { ...item, why: String(item.why || "").replace(/Google Maps 評分[^。]*是主要亮點。/g, "評論重點待人工核對；最新評分請見 Google Maps。") };
    const update = placeAudit.updates[item.destination];
    if (!update) return [item];
    if (update.status === "CLOSED_PERMANENTLY") return [];
    return [{ ...item, mapUrl: update.mapUrl, placeId: update.placeId, location: update.location,
      rating: update.rating, reviewCount: update.reviewCount,
      googleRating: update.rating == null ? "Google 尚無評分" : `${update.rating} / 5（${update.reviewCount || 0} 則；${(update.checkedAt || placeAudit.checkedAt).slice(0, 10)} 查核）`,
      booking: update.status === "CLOSED_TEMPORARILY" ? "Google 標示暫時停業，請確認恢復營業再出發。" : item.priceUnknown ? "Google 商家已對應；價格、營業時段與實際路線請在出發前確認。" : item.booking,
      recommendations: item.recommendations?.map(source=>source.addressSource ? {...source,note:"歷史推薦不代表現況；Google 商家查核日期見評分，交通時間仍待確認。"} : source),
      businessStatus: update.status, checkedAt: update.checkedAt || placeAudit.checkedAt }];
  });
}
