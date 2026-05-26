import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { LocalTime } from "@/components/local-time";

export const metadata = {
  title: "Jogos — Bolão Copa 2026",
};

type Team = { id: string; name: string; iso_code: string };
type MatchRow = {
  id: string;
  external_id: number | null;
  stage: string;
  group_code: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: Team | null;
  away_team: Team | null;
};
type BetRow = { match_id: string; home_score: number; away_score: number };

const BRT_FORMATTER = new Intl.DateTimeFormat("pt-BR", {
  timeZone: "America/Sao_Paulo",
  weekday: "short",
  day: "2-digit",
  month: "short",
});

const SAME_DAY_KEY = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

export default async function JogosPage() {
  const pools = await listMyPools();
  if (pools.length === 0) {
    redirect("/");
  }

  const activeId = (await readActivePoolId()) ?? pools[0].id;
  const supabase = await createClient();

  const [matchesResult, betsResult] = await Promise.all([
    supabase
      .from("match")
      .select(
        "id, external_id, stage, group_code, kickoff_at, status, home_score, away_score, home_team:home_team_id (id, name, iso_code), away_team:away_team_id (id, name, iso_code)",
      )
      .order("kickoff_at", { ascending: true })
      .returns<MatchRow[]>(),
    supabase
      .from("bet_match")
      .select("match_id, home_score, away_score")
      .eq("pool_id", activeId)
      .returns<BetRow[]>(),
  ]);

  const matches = matchesResult.data ?? [];
  const bets = new Map(
    (betsResult.data ?? []).map((b) => [b.match_id, b]),
  );

  // Group by São Paulo calendar date.
  const groups = new Map<string, MatchRow[]>();
  for (const m of matches) {
    const key = SAME_DAY_KEY.format(new Date(m.kickoff_at));
    const arr = groups.get(key) ?? [];
    arr.push(m);
    groups.set(key, arr);
  }

  // This Server Component is intentionally dynamic; "now" is the page's
  // snapshot of wall-clock time used to compute the locked state.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

  return (
    <main className="mx-auto max-w-3xl px-4 py-6 space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Jogos</h1>
        <p className="text-sm text-muted-foreground">
          Horários no fuso do seu navegador. Clique em um jogo pra palpitar.
        </p>
      </header>

      <ol className="space-y-6">
        {Array.from(groups.entries()).map(([dateKey, dayMatches]) => {
          const label = capitaliseFirst(
            BRT_FORMATTER.format(new Date(dayMatches[0].kickoff_at)),
          );
          return (
            <li key={dateKey} className="space-y-2">
              <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {label}
              </h2>
              <ul className="divide-y rounded-lg border bg-card">
                {dayMatches.map((m) => {
                  const locked = new Date(m.kickoff_at).getTime() <= now;
                  const bet = bets.get(m.id);
                  return (
                    <li key={m.id}>
                      <Link
                        href={`/jogos/${m.id}`}
                        className="flex items-center justify-between gap-3 px-4 py-3 hover:bg-muted/40"
                      >
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <LocalTime utc={m.kickoff_at} />
                            <span>·</span>
                            <span>{stageLabel(m.stage, m.group_code)}</span>
                          </div>
                          <div className="text-sm font-medium truncate">
                            {teamLabel(m.home_team)} <span className="text-muted-foreground">×</span>{" "}
                            {teamLabel(m.away_team)}
                          </div>
                        </div>
                        <BetStatus locked={locked} bet={bet} match={m} />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </li>
          );
        })}
      </ol>
    </main>
  );
}

function teamLabel(team: Team | null): string {
  return team ? team.name : "A definir";
}

function stageLabel(stage: string, group_code: string | null): string {
  if (stage === "group") return `Grupo ${group_code ?? ""}`.trim();
  return (
    {
      r32: "Oitavas (R32)",
      r16: "16-avos (R16)",
      qf: "Quartas",
      sf: "Semi",
      third: "3º lugar",
      final: "Final",
    }[stage] ?? stage
  );
}

function capitaliseFirst(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function BetStatus({
  locked,
  bet,
  match,
}: {
  locked: boolean;
  bet: BetRow | undefined;
  match: MatchRow;
}) {
  if (match.status === "finished" && match.home_score !== null && match.away_score !== null) {
    return (
      <span className="text-sm font-semibold tabular-nums">
        {match.home_score} – {match.away_score}
      </span>
    );
  }
  if (locked) {
    return (
      <span className="text-xs text-muted-foreground">Aguardando placar</span>
    );
  }
  if (bet) {
    return (
      <span className="text-sm tabular-nums">
        Palpite: <strong>{bet.home_score} – {bet.away_score}</strong>
      </span>
    );
  }
  return (
    <span className="text-xs font-medium text-primary">Palpitar →</span>
  );
}
