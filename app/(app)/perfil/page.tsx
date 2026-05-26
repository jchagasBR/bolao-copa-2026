import Link from "next/link";
import { redirect } from "next/navigation";
import { Crown, Trophy } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { sortRanking, type RankingRow } from "@/lib/scoring/ranking";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata = {
  title: "Perfil — Bolão Copa 2026",
};

type PoolStats = {
  pool_id: string;
  name: string;
  is_admin: boolean;
  member_count: number;
  position: number | null;
  points: number;
  exact_count: number;
  correct_winner_count: number;
};

export default async function PerfilPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const pools = await listMyPools();
  const activeId = await readActivePoolId();

  const { data: profile } = await supabase
    .from("profile")
    .select("name")
    .eq("id", user.id)
    .maybeSingle();
  const displayName = profile?.name ?? user.email ?? "Você";

  // For each pool, read the full ranking, sort, find this user's row.
  // N small queries (one per pool, capped at 10). Acceptable for the MVP.
  const stats: PoolStats[] = await Promise.all(
    pools.map(async (pool) => {
      const { data: rows } = await supabase
        .from("pool_ranking")
        .select("user_id, name, points, exact_count, correct_winner_count")
        .eq("pool_id", pool.id)
        .returns<RankingRow[]>();
      const ranking = sortRanking(rows ?? []);
      const myIdx = ranking.findIndex((r) => r.user_id === user.id);
      const mine = myIdx >= 0 ? ranking[myIdx] : null;
      return {
        pool_id: pool.id,
        name: pool.name,
        is_admin: pool.is_admin,
        member_count: pool.member_count,
        position: myIdx >= 0 ? myIdx + 1 : null,
        points: mine?.points ?? 0,
        exact_count: mine?.exact_count ?? 0,
        correct_winner_count: mine?.correct_winner_count ?? 0,
      };
    }),
  );

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">{displayName}</h1>
        <p className="text-sm text-muted-foreground">{user.email}</p>
      </header>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Meus bolões
        </h2>

        {stats.length === 0 ? (
          <Card>
            <CardContent className="py-4 text-sm text-muted-foreground">
              Você ainda não está em nenhum bolão.{" "}
              <Link
                href="/"
                className="font-medium text-foreground underline-offset-4 hover:underline"
              >
                Criar ou entrar em um →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {stats.map((s) => {
              const isActive = s.pool_id === activeId;
              return (
                <li key={s.pool_id}>
                  <Card
                    className={isActive ? "border-primary/40 bg-primary/5" : ""}
                  >
                    <CardHeader className="pb-2">
                      <CardTitle className="flex items-center gap-2 text-base">
                        <span className="truncate">{s.name}</span>
                        {s.is_admin && (
                          <Crown
                            className="h-4 w-4 text-amber-600 dark:text-amber-400"
                            aria-hidden
                          />
                        )}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-1 text-sm">
                      <p className="flex items-center justify-between">
                        <span className="text-muted-foreground">Pontos</span>
                        <span className="font-semibold tabular-nums">{s.points}</span>
                      </p>
                      <p className="flex items-center justify-between">
                        <span className="text-muted-foreground">Posição</span>
                        <span className="font-medium tabular-nums">
                          {s.position
                            ? `${s.position}º de ${s.member_count}`
                            : "—"}
                        </span>
                      </p>
                      <p className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Placares cravados</span>
                        <span className="tabular-nums">{s.exact_count}</span>
                      </p>
                      <p className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Resultados certos</span>
                        <span className="tabular-nums">
                          {s.correct_winner_count}
                        </span>
                      </p>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          Atalhos
        </h2>
        <ul className="space-y-2">
          <li>
            <Link
              href="/palpites"
              className="flex items-center gap-3 rounded-lg border bg-card p-4 hover:bg-muted/40"
            >
              <Trophy className="h-5 w-5 shrink-0 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm font-medium">Ver meus palpites</span>
              <span className="text-xs text-muted-foreground">No bolão ativo →</span>
            </Link>
          </li>
        </ul>
      </section>
    </main>
  );
}
