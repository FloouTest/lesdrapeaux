import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";
import { markTodayPlayed, readWeeklyStreak, tierForDivision } from "./ranked";
import useHomeProgress from "./useHomeProgress";

describe("home progression", () => {
  beforeEach(() => localStorage.clear());

  it("uses the exact thirteen legacy divisions", () => {
    expect(tierForDivision(0).name).toBe("Explorateur 3");
    expect(tierForDivision(11).name).toBe("Vexillologue 1");
    expect(tierForDivision(12)).toEqual({
      name: "Vexillologue Suprême",
      icon: "👑",
    });
  });

  it("reads current week and marks today in local storage", () => {
    const date = new Date("2025-05-14T12:00:00Z");
    const state = markTodayPlayed(localStorage, date);
    expect(state.weekStart).toBe("2025-05-12");
    expect(state.days).toEqual([
      false,
      false,
      true,
      false,
      false,
      false,
      false,
    ]);
    expect(readWeeklyStreak(localStorage, date)).toEqual(state);
  });

  it("loads category-aware API progression", async () => {
    global.fetch = vi
      .fn()
      .mockResolvedValue({
        ok: true,
        json: async () => ({
          ok: true,
          division: 4,
          points: 37,
          streak: 2,
          gamesToday: 3,
          dailyLimit: 6,
        }),
      });
    const { result } = renderHook(() =>
      useHomeProgress("Ada Lovelace", "capitals"),
    );
    await waitFor(() => expect(result.current.ranked.points).toBe(37));
    expect(fetch).toHaveBeenCalledWith(
      "/api/ranked/player?pseudo=Ada%20Lovelace&category=capitals",
      { cache: "no-store" },
    );
    expect(result.current.ranked).toMatchObject({
      division: 4,
      streak: 2,
      gamesToday: 3,
      dailyLimit: 6,
    });
  });

  it("falls back to category-local storage when fetch fails", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("offline"));
    localStorage.setItem(
      "local:ranked_local_flags",
      JSON.stringify({ division: 2, points: 19, gamesToday: 1 }),
    );
    const { result } = renderHook(() => useHomeProgress("Ada", "flags"));
    await waitFor(() => expect(result.current.ranked.points).toBe(19));
    expect(result.current.ranked.division).toBe(2);
  });

  it("drops a stale stored week", () => {
    localStorage.setItem(
      "local:weekly_streak",
      JSON.stringify({ weekStart: "2020-01-06", days: Array(7).fill(true) }),
    );
    expect(
      readWeeklyStreak(localStorage, new Date("2025-05-14T12:00:00Z")).days,
    ).toEqual(Array(7).fill(false));
  });
});
