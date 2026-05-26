import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { sortRanking, type RankingRow } from "@/lib/scoring/ranking";
import { RankingLive } from "./live";

export const metadata = {
  title: "Ranking — Bolão Copa 2026",
};

export default async function RankingPage() {
  const pools = await listMyPools();
  if (pools.length === 0) {
    redirect("/");
  }

  const activeId = (await readActivePoolId()) ?? pools[0].id;
  const activePool = pools.find((p) => p.id === activeId);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: rows } = await supabase
    .from("pool_ranking")
    .select("user_id, name, points, exact_count, correct_winner_count")
    .eq("pool_id", activeId)
    .returns<RankingRow[]>();

  const ranking = sortRanking(rows ?? []);

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Ranking</h1>
        <p className="text-sm text-muted-foreground">
          {activePool?.name ?? "Bolão"} · atualiza automaticamente quando uma
          pontuação é registrada.
        </p>
      </header>

      {ranking.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Ainda não há pontuação. O ranking começa a aparecer depois do primeiro
          jogo finalizado.
        </div>
      ) : (
        <ol className="rounded-lg border bg-card divide-y">
          {ranking.map((row, idx) => {
            const isMe = row.user_id === user?.id;
            return (
              <li
                key={row.user_id}
                className={
                  "flex items-center gap-3 px-4 py-3 " +
                  (isMe ? "bg-primary/5" : "")
                }
              >
                <span className="w-7 shrink-0 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                  {idx + 1}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {row.name}
                    {isMe && (
                      <span className="ml-2 text-xs text-muted-foreground">
                        (você)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {row.exact_count} cravado{row.exact_count === 1 ? "" : "s"}
                    {" · "}
                    {row.correct_winner_count} acerto
                    {row.correct_winner_count === 1 ? "" : "s"} de resultado
                  </p>
                </div>
                <span className="text-base font-bold tabular-nums">
                  {row.points}
                  <span className="text-xs font-normal text-muted-foreground"> pts</span>
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <RankingLive poolId={activeId} />
    </main>
  );
}
