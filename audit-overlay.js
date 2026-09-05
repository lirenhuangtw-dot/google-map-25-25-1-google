function applyPlaceAudit(items) {
  if (typeof placeAudit === "undefined") return items;
  return items.flatMap(item => {
    item = { ...item, why: String(item.why || "").replace(/Google Maps 評分[^。]*是主要亮點。/g, "評論重點待人工核對；最新評分請見 Google Maps。") };
    const update = placeAudit.updates[item.destination];
    if (!update) return [item];
    if (update.status === "CLOSED_PERMANENTLY") return [];
    return [{ ...item, mapUrl: update.mapUrl, placeId: update.placeId,
      rating: update.rating, reviewCount: update.reviewCount,
      googleRating: update.rating == null ? "Google 尚無評分" : `${update.rating} / 5（${update.reviewCount || 0} 則；${placeAudit.checkedAt.slice(0, 10)} 查核）`,
      booking: update.status === "CLOSED_TEMPORARILY" ? "Google 標示暫時停業，請確認恢復營業再出發。" : item.booking,
      businessStatus: update.status, checkedAt: placeAudit.checkedAt }];
  });
}
