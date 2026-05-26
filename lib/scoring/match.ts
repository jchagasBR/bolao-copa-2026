// Per-match scoring (requirements.md §4.1). Mirrors the SQL function
// public.compute_match_points in supabase/migrations/0003_scoring.sql so the
// UI can preview points before the admin enters the real score.
//
//   Exact score                             → 10 pts
//   Correct winner + correct goal diff      →  7 pts
//   Correct winner (or correct draw) only   →  5 pts
//   Wrong                                   →  0 pts

export type MatchScore = { home: number; away: number };

export type MatchOutcome = {
  points: 0 | 5 | 7 | 10;
  isExactScore: boolean;
  isCorrectWinner: boolean;
};

export function computeMatchPoints(
  predicted: MatchScore,
  actual: MatchScore,
): MatchOutcome {
  if (predicted.home === actual.home && predicted.away === actual.away) {
    return { points: 10, isExactScore: true, isCorrectWinner: true };
  }

  const predictedSign = Math.sign(predicted.home - predicted.away);
  const actualSign = Math.sign(actual.home - actual.away);

  if (predictedSign !== actualSign) {
    return { points: 0, isExactScore: false, isCorrectWinner: false };
  }

  const sameDiff = predicted.home - predicted.away === actual.home - actual.away;
  return sameDiff
    ? { points: 7, isExactScore: false, isCorrectWinner: true }
    : { points: 5, isExactScore: false, isCorrectWinner: true };
}
