export const RECORDS_KEY = 'star-parallax.daily-top5.v2';
export function localDay(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}
export function readRecords(storage, date = new Date()) {
  try {
    const data = JSON.parse(storage.getItem(RECORDS_KEY));
    if (data?.day !== localDay(date) || !Array.isArray(data.records)) return [];
    return data.records.filter(r => Number.isSafeInteger(r.score) && r.score >= 0 &&
      Number.isFinite(r.at) && localDay(new Date(r.at)) === data.day)
      .sort((a, b) => b.score - a.score || a.at - b.at).slice(0, 5);
  } catch { return []; }
}
export function saveRecord(storage, score, date = new Date()) {
  const records = [...readRecords(storage, date), { score, at: date.getTime() }]
    .sort((a, b) => b.score - a.score || a.at - b.at).slice(0, 5);
  try {
    storage.setItem(RECORDS_KEY, JSON.stringify({ day: localDay(date), records }));
    return true;
  } catch { return false; }
}
