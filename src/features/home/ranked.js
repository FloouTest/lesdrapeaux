export const RANKED_TIERS = [
  { name: "Explorateur 3", icon: "🧭" },
  { name: "Explorateur 2", icon: "🧭" },
  { name: "Explorateur 1", icon: "🧭" },
  { name: "Géographe 3", icon: "🗺️" },
  { name: "Géographe 2", icon: "🗺️" },
  { name: "Géographe 1", icon: "🗺️" },
  { name: "Cartographe 3", icon: "🖋️" },
  { name: "Cartographe 2", icon: "🖋️" },
  { name: "Cartographe 1", icon: "🖋️" },
  { name: "Vexillologue 3", icon: "🏳️" },
  { name: "Vexillologue 2", icon: "🏳️" },
  { name: "Vexillologue 1", icon: "🏳️" },
  { name: "Vexillologue Suprême", icon: "👑" },
];

export const tierForDivision = (division = 0) =>
  RANKED_TIERS[
    Math.max(0, Math.min(RANKED_TIERS.length - 1, Number(division) || 0))
  ];

export function parisToday(date = new Date()) {
  return date.toLocaleDateString("en-CA", { timeZone: "Europe/Paris" });
}
export function mondayOfWeek(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  const weekday = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() - weekday + 1);
  return date.toISOString().slice(0, 10);
}
export function dayIndex(dateString) {
  const [year, month, day] = dateString.split("-").map(Number);
  return (new Date(Date.UTC(year, month - 1, day)).getUTCDay() || 7) - 1;
}
export function readWeeklyStreak(storage = localStorage, date = new Date()) {
  const today = parisToday(date),
    weekStart = mondayOfWeek(today);
  const empty = { weekStart, days: Array(7).fill(false) };
  try {
    const value = JSON.parse(storage.getItem("local:weekly_streak"));
    return value?.weekStart === weekStart && value.days?.length === 7
      ? value
      : empty;
  } catch {
    return empty;
  }
}
export function markTodayPlayed(storage = localStorage, date = new Date()) {
  const state = readWeeklyStreak(storage, date);
  state.days[dayIndex(parisToday(date))] = true;
  storage.setItem("local:weekly_streak", JSON.stringify(state));
  return state;
}
