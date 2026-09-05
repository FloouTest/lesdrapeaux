import { useEffect, useState } from "react";
import { mondayOfWeek, parisToday, readWeeklyStreak } from "./ranked";

const EMPTY = {
  division: 0,
  points: 0,
  streak: 0,
  gamesToday: 0,
  dailyLimit: 5,
};
export default function useHomeProgress(pseudo, category) {
  const [ranked, setRanked] = useState(EMPTY);
  const [weekly, setWeekly] = useState(() => readWeeklyStreak());
  useEffect(() => {
    let active = true;
    async function load() {
      let value;
      try {
        const response = await fetch(
          `/api/ranked/player?pseudo=${encodeURIComponent(pseudo || "Joueur")}&category=${encodeURIComponent(category)}`,
          { cache: "no-store" },
        );
        const json = await response.json();
        if (!response.ok || !json.ok) throw new Error();
        value = json;
      } catch {
        try {
          value = JSON.parse(
            localStorage.getItem(`local:ranked_local_${category}`),
          );
        } catch {
          /* empty fallback */
        }
      }
      if (!active) return;
      const today = parisToday();
      if (value?.gamesTodayDate && value.gamesTodayDate !== today)
        value = { ...value, gamesToday: 0, streak: 0 };
      setRanked({
        ...EMPTY,
        ...value,
        gamesToday: value?.games_today ?? value?.gamesToday ?? 0,
      });
      setWeekly(readWeeklyStreak());
    }
    load();
    return () => {
      active = false;
    };
  }, [pseudo, category]);
  return {
    ranked,
    weekly,
    todayIndex: (() => {
      const today = parisToday();
      return (new Date(`${today}T00:00:00Z`).getUTCDay() || 7) - 1;
    })(),
    weekStart: mondayOfWeek(parisToday()),
  };
}
