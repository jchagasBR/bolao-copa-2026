// Ranking tie-break ordering (requirements.md §4.5):
//   1. Total points          (descending)
//   2. # exact scores        (descending)
//   3. # correct winners     (descending) — counted only when NOT exact
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
