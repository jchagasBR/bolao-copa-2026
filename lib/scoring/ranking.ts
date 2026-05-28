// Ranking sort (requirements.md §4.5):
//
// Winner-determination criteria (1-3): if two users tie on all three, they
// share the title at end of tournament. We DO NOT break that tie for the
// purpose of awarding a champion.
//   1. Total points          (descending)
//   2. # exact scores        (descending)
//   3. # correct winners     (descending) — counted only when NOT exact
//
// Display-sort fallback (4): purely cosmetic — keeps the ranking page row
// order stable across re-renders so the UI doesn't shuffle on every realtime
// update. Tied users above this fallback are equally ranked; their alphabetic
// adjacency is not a ranking signal. Consumers showing "1º, 2º, 3º" position
// numbers should give tied rows the same position (e.g. "1º, 1º, 3º").
//   4. Display name          (ascending, locale-aware PT-BR)
//
// Shape matches the `pool_ranking` view defined in
// supabase/migrations/0001_init.sql.

export type RankingRow = {
  user_id: string;
  name: string;
  points: number;
  exact_count: number;
  correct_winner_count: number;
};

export function sortRanking(rows: readonly RankingRow[]): RankingRow[] {
  return [...rows].sort((a, b) => {
    if (a.points !== b.points) return b.points - a.points;
    if (a.exact_count !== b.exact_count) return b.exact_count - a.exact_count;
    if (a.correct_winner_count !== b.correct_winner_count) {
      return b.correct_winner_count - a.correct_winner_count;
    }
    return a.name.localeCompare(b.name, "pt-BR");
  });
}

export type RankingRowWithPosition = RankingRow & { position: number };

// Assigns 1-based positions that respect §4.5 winner-determination criteria:
// users tied on (points, exact_count, correct_winner_count) share the SAME
// position. After a tie, the next position skips ahead by the tie size, so
// the sequence might read 1º, 1º, 3º, 4º, 4º, 6º. Input must already be
// sorted by `sortRanking()`.
export function withSharedPositions(
  sorted: readonly RankingRow[],
): RankingRowWithPosition[] {
  const result: RankingRowWithPosition[] = [];
  for (let i = 0; i < sorted.length; i++) {
    const row = sorted[i];
    const prev = i > 0 ? sorted[i - 1] : null;
    const tied =
      prev !== null &&
      row.points === prev.points &&
      row.exact_count === prev.exact_count &&
      row.correct_winner_count === prev.correct_winner_count;
    const position = tied ? result[i - 1].position : i + 1;
    result.push({ ...row, position });
  }
  return result;
}
