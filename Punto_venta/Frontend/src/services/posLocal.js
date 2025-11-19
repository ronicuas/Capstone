// src/services/posLocal.js
const TZ = "America/Santiago";
const todayKey = () =>
  new Intl.DateTimeFormat("sv-SE", { timeZone: TZ }).format(new Date());

function loadStats() {
  try {
    const raw = localStorage.getItem("pos_stats_today");
    const def = { date: todayKey(), ordersCount: 0, cash: 0, card: 0, transfer: 0 };
    if (!raw) return def;
    const obj = JSON.parse(raw);
    if (!obj || obj.date !== todayKey()) return def;
    return { ...def, ...obj };
  } catch {
    return { date: todayKey(), ordersCount: 0, cash: 0, card: 0, transfer: 0 };
  }
}

export function bumpStatsForSale(method, amount) {
  const stats = loadStats();
  const amt = Number(amount || 0);

  if (method === "cash") stats.cash += amt;
  else if (method === "card") stats.card += amt;
  else if (method === "transfer") stats.transfer += amt;

  stats.ordersCount += 1;
  localStorage.setItem("pos_stats_today", JSON.stringify(stats));
}