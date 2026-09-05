import { describe, expect, it } from "vitest";
import { answerMatches, normalize } from "./game.js";

describe("answer matching", () => {
  it("normalizes French accents and punctuation", () => {
    expect(normalize("  États-Unis! ")).toBe("etats unis");
  });

  it("accepts typo tolerance, transpositions, and aliases", () => {
    expect(answerMatches("Frnace", "France")).toBe(true);
    expect(answerMatches("Kiev", "Kyiv", ["Kiev"])).toBe(true);
  });

  it("rejects unrelated and empty values", () => {
    expect(answerMatches("", "France")).toBe(false);
    expect(answerMatches("Japon", "France")).toBe(false);
  });
});
