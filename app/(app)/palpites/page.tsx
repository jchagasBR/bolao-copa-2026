import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { LocalTime } from "@/components/local-time";

export const metadata = {
  title: "Meus palpites — Bolão Copa 2026",
};

type Team = { name: string };
type Row = {
  home_score: number;
  away_score: number;
  match: {
    id: string;
    stage: string;
    group_code: string | null;
    kickoff_at: string;
    home_team: Team | null;
    away_team: Team | null;
  } | null;
};

const STAGE_ORDER: Record<string, number> = {
  group: 0,
  r32: 1,
  r16: 2,
  qf: 3,
  sf: 4,
  third: 5,
  final: 6,
};

const STAGE_TITLE: Record<string, string> = {
  group: "Fase de grupos",
  r32: "Oitavas (R32)",
  r16: "16-avos (R16)",
  qf: "Quartas de final",
  sf: "Semifinais",
  third: "Disputa de 3º",
  final: "Final",
};

export default async function PalpitesPage() {
  const pools = await listMyPools();
  if (pools.length === 0) {
    redirect("/");
  }

  const activeId = (await readActivePoolId()) ?? pools[0].id;
  const supabase = await createClient();

  const { data: rows } = await supabase
    .from("bet_match")
    .select(
      "home_score, away_score, match:match_id (id, stage, group_code, kickoff_at, home_team:home_team_id (name), away_team:away_team_id (name))",
    )
    .eq("pool_id", activeId)
    .returns<Row[]>();

  const items = (rows ?? []).filter(
    (r): r is Row & { match: NonNullable<Row["match"]> } => r.match !== null,
  );

  const byStage = new Map<string, typeof items>();
  for (const row of items) {
    const list = byStage.get(row.match.stage) ?? [];
    list.push(row);
    byStage.set(row.match.stage, list);
  }
  for (const list of byStage.values()) {
    list.sort(
      (a, b) =>
        new Date(a.match.kickoff_at).getTime() -
        new Date(b.match.kickoff_at).getTime(),
    );
  }
  const sortedStages = Array.from(byStage.keys()).sort(
    (a, b) => (STAGE_ORDER[a] ?? 99) - (STAGE_ORDER[b] ?? 99),
  );

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Meus palpites</h1>
        <p className="text-sm text-muted-foreground">
          Todos os seus palpites no bolão ativo. Clique pra editar (até o início
          do jogo).
        </p>
      </header>

      {items.length === 0 ? (
        <div className="rounded-lg border bg-card p-6 text-sm text-muted-foreground">
          Você ainda não palpitou nenhum jogo neste bolão.{" "}
          <Link href="/jogos" className="font-medium text-foreground underline-offset-4 hover:underline">
            Ver jogos →
          </Link>
        </div>
      ) : (
        sortedStages.map((stage) => (
          <section key={stage} className="space-y-2">
            <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              {STAGE_TITLE[stage] ?? stage}
            </h2>
            <ul className="divide-y rounded-lg border bg-card">
              {byStage.get(stage)!.map((row) => (
                <li key={row.match.id}>
                  <Link
                    href={`/jogos/${row.match.id}`}
                    className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                  >
                    <div className="flex-1 min-w-0 space-y-1">
                      <p className="text-xs text-muted-foreground">
                        <LocalTime utc={row.match.kickoff_at} />
                        {row.match.group_code ? ` · Grupo ${row.match.group_code}` : ""}
                      </p>
                      <p className="text-sm font-medium truncate">
                        {row.match.home_team?.name ?? "?"}{" "}
                        <span className="text-muted-foreground">×</span>{" "}
                        {row.match.away_team?.name ?? "?"}
                      </p>
                    </div>
                    <span className="text-base font-semibold tabular-nums">
                      {row.home_score} – {row.away_score}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
