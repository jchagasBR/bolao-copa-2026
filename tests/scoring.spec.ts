import { describe, it, expect } from "vitest";
import { computeMatchPoints } from "@/lib/scoring/match";
import { sortRanking, withSharedPositions, type RankingRow } from "@/lib/scoring/ranking";

describe("computeMatchPoints — requirements §4.1", () => {
  it("awards 10 points for an exact score (home win)", () => {
    expect(computeMatchPoints({ home: 2, away: 1 }, { home: 2, away: 1 })).toEqual({
      points: 10,
      isExactScore: true,
      isCorrectWinner: true,
    });
  });

  it("awards 10 points for an exact score (draw)", () => {
    expect(computeMatchPoints({ home: 1, away: 1 }, { home: 1, away: 1 })).toEqual({
      points: 10,
      isExactScore: true,
      isCorrectWinner: true,
    });
  });

  it("awards 7 points for correct winner with matching goal difference", () => {
    // Real 2-1, predicted 3-2 → both home wins by 1 goal
    expect(computeMatchPoints({ home: 3, away: 2 }, { home: 2, away: 1 })).toEqual({
      points: 7,
      isExactScore: false,
      isCorrectWinner: true,
    });
  });

  it("awards 5 points for correct winner with wrong goal difference", () => {
    // Real 2-1, predicted 3-0 → home win, diff 3 vs 1
    expect(computeMatchPoints({ home: 3, away: 0 }, { home: 2, away: 1 })).toEqual({
      points: 5,
      isExactScore: false,
      isCorrectWinner: true,
    });
  });

  it("awards 5 points for a correct away win with different goal difference", () => {
    // Real 0-2 (diff -2), predicted 0-3 (diff -3) — same winner, different diff
    expect(computeMatchPoints({ home: 0, away: 3 }, { home: 0, away: 2 })).toEqual({
      points: 5,
      isExactScore: false,
      isCorrectWinner: true,
    });
  });

  it("awards 7 points for any non-exact predicted draw vs an actual draw (diff is always 0)", () => {
    // Real 0-0, predicted 2-2 — both diffs are 0, so 'correct diff' is automatic for draws
    expect(computeMatchPoints({ home: 2, away: 2 }, { home: 0, away: 0 })).toEqual({
      points: 7,
      isExactScore: false,
      isCorrectWinner: true,
    });
  });

  it("awards 0 points when predicting the wrong winner (home vs away)", () => {
    expect(computeMatchPoints({ home: 0, away: 1 }, { home: 2, away: 1 })).toEqual({
      points: 0,
      isExactScore: false,
      isCorrectWinner: false,
    });
  });

  it("awards 0 points when predicting a draw and the match was decided", () => {
    expect(computeMatchPoints({ home: 1, away: 1 }, { home: 2, away: 1 })).toEqual({
      points: 0,
      isExactScore: false,
      isCorrectWinner: false,
    });
  });

  it("awards 0 points when predicting a winner and the match was a draw", () => {
    expect(computeMatchPoints({ home: 2, away: 1 }, { home: 1, away: 1 })).toEqual({
      points: 0,
      isExactScore: false,
      isCorrectWinner: false,
    });
  });

  it("treats every non-exact draw-vs-draw prediction as 7 pts (high-scoring case)", () => {
    expect(computeMatchPoints({ home: 1, away: 1 }, { home: 4, away: 4 })).toEqual({
      points: 7,
      isExactScore: false,
      isCorrectWinner: true,
    });
  });
});

describe("sortRanking — requirements §4.5", () => {
  const baseRow = (
    overrides: Partial<RankingRow> & { user_id: string },
  ): RankingRow => ({
    name: overrides.name ?? "Anônimo",
    points: 0,
    exact_count: 0,
    correct_winner_count: 0,
    ...overrides,
  });

  it("sorts by points descending", () => {
    const rows = [
      baseRow({ user_id: "u1", name: "Ana", points: 5 }),
      baseRow({ user_id: "u2", name: "Bia", points: 12 }),
      baseRow({ user_id: "u3", name: "Caio", points: 8 }),
    ];
    expect(sortRanking(rows).map((r) => r.user_id)).toEqual(["u2", "u3", "u1"]);
  });

  it("breaks ties on points using exact_count desc", () => {
    const rows = [
      baseRow({ user_id: "u1", name: "Ana", points: 10, exact_count: 1 }),
      baseRow({ user_id: "u2", name: "Bia", points: 10, exact_count: 3 }),
      baseRow({ user_id: "u3", name: "Caio", points: 10, exact_count: 2 }),
    ];
    expect(sortRanking(rows).map((r) => r.user_id)).toEqual(["u2", "u3", "u1"]);
  });

  it("breaks ties on points+exact_count using correct_winner_count desc", () => {
    const rows = [
      baseRow({
        user_id: "u1",
        name: "Ana",
        points: 10,
        exact_count: 1,
        correct_winner_count: 2,
      }),
      baseRow({
        user_id: "u2",
        name: "Bia",
        points: 10,
        exact_count: 1,
        correct_winner_count: 5,
      }),
    ];
    expect(sortRanking(rows).map((r) => r.user_id)).toEqual(["u2", "u1"]);
  });

  it("falls back to alphabetical name order for stable display only (not a winner-determination criterion — see §4.5)", () => {
    // Users tied on points + exact_count + correct_winner_count share the
    // title at end of tournament. The alphabetical sort here is purely
    // cosmetic — it keeps the ranking page row order stable across realtime
    // re-renders. UI consumers showing "1º, 2º" position numbers should
    // assign equal positions to all rows above this fallback.
    const rows = [
      baseRow({ user_id: "u1", name: "Zé" }),
      baseRow({ user_id: "u2", name: "Ana" }),
      baseRow({ user_id: "u3", name: "Álvaro" }),
    ];
    expect(sortRanking(rows).map((r) => r.user_id)).toEqual(["u3", "u2", "u1"]);
  });

  it("does not mutate the input array", () => {
    const rows: RankingRow[] = [
      baseRow({ user_id: "u1", name: "Ana", points: 5 }),
      baseRow({ user_id: "u2", name: "Bia", points: 12 }),
    ];
    const snapshot = JSON.stringify(rows);
    sortRanking(rows);
    expect(JSON.stringify(rows)).toBe(snapshot);
  });
});

describe("withSharedPositions — requirements §4.5 (tied users share a position)", () => {
  const baseRow = (
    overrides: Partial<RankingRow> & { user_id: string },
  ): RankingRow => ({
    name: overrides.name ?? "Anônimo",
    points: 0,
    exact_count: 0,
    correct_winner_count: 0,
    ...overrides,
  });

  it("assigns 1, 2, 3, … when there are no ties", () => {
    const sorted = sortRanking([
      baseRow({ user_id: "u1", name: "Ana", points: 30 }),
      baseRow({ user_id: "u2", name: "Bia", points: 20 }),
      baseRow({ user_id: "u3", name: "Caio", points: 10 }),
    ]);
    expect(withSharedPositions(sorted).map((r) => [r.user_id, r.position])).toEqual([
      ["u1", 1],
      ["u2", 2],
      ["u3", 3],
    ]);
  });

  it("shares 1st place when two users tie on all winner criteria (1, 1, 3)", () => {
    const sorted = sortRanking([
      baseRow({
        user_id: "u1",
        name: "Ana",
        points: 30,
        exact_count: 3,
        correct_winner_count: 5,
      }),
      baseRow({
        user_id: "u2",
        name: "Bia",
        points: 30,
        exact_count: 3,
        correct_winner_count: 5,
      }),
      baseRow({ user_id: "u3", name: "Caio", points: 20 }),
    ]);
    // Even though sortRanking puts Ana before Bia alphabetically, both share 1st.
    expect(withSharedPositions(sorted).map((r) => [r.user_id, r.position])).toEqual([
      ["u1", 1],
      ["u2", 1],
      ["u3", 3],
    ]);
  });

  it("does NOT share position when the tie is broken by exact_count or correct_winner_count", () => {
    const sorted = sortRanking([
      baseRow({
        user_id: "u1",
        name: "Ana",
        points: 30,
        exact_count: 3,
        correct_winner_count: 5,
      }),
      baseRow({
        user_id: "u2",
        name: "Bia",
        points: 30,
        exact_count: 2,
        correct_winner_count: 5,
      }),
    ]);
    expect(withSharedPositions(sorted).map((r) => [r.user_id, r.position])).toEqual([
      ["u1", 1],
      ["u2", 2],
    ]);
  });

  it("handles a mid-pack tie correctly (1, 2, 2, 4)", () => {
    const sorted = sortRanking([
      baseRow({ user_id: "u1", name: "Ana", points: 40 }),
      baseRow({
        user_id: "u2",
        name: "Bia",
        points: 30,
        exact_count: 1,
        correct_winner_count: 2,
      }),
      baseRow({
        user_id: "u3",
        name: "Caio",
        points: 30,
        exact_count: 1,
        correct_winner_count: 2,
      }),
      baseRow({ user_id: "u4", name: "Duda", points: 10 }),
    ]);
    expect(withSharedPositions(sorted).map((r) => [r.user_id, r.position])).toEqual([
      ["u1", 1],
      ["u2", 2],
      ["u3", 2],
      ["u4", 4],
    ]);
  });
});
