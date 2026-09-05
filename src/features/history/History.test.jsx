import { describe, expect, it } from "vitest";
import { formatHistoryDate, historyAccuracy } from "./History";

describe("history presentation", () => {
  it("calculates a rounded success percentage", () => {
    expect(historyAccuracy({ score: 7, total: 9 })).toBe(78);
    expect(historyAccuracy({ score: 0, total: 0 })).toBe(0);
  });

  it("keeps an invalid server date readable", () => {
    expect(formatHistoryDate("ancienne partie")).toBe("ancienne partie");
  });
});
