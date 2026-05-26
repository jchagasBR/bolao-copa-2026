import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { LocalTime } from "@/components/local-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PredictionForm } from "./form";

type Team = { id: string; name: string; iso_code: string };
type MatchRow = {
  id: string;
  stage: string;
  group_code: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  home_team: Team | null;
  away_team: Team | null;
};

export default async function MatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;

  const pools = await listMyPools();
  if (pools.length === 0) {
    redirect("/");
  }

  const activeId = (await readActivePoolId()) ?? pools[0].id;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("match")
    .select(
      "id, stage, group_code, kickoff_at, status, home_score, away_score, home_team:home_team_id (id, name, iso_code), away_team:away_team_id (id, name, iso_code)",
    )
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (!match) {
    notFound();
  }

  const { data: ownBet } = await supabase
    .from("bet_match")
    .select("home_score, away_score")
    .eq("match_id", match.id)
    .eq("pool_id", activeId)
    .maybeSingle();

  // Dynamic Server Component; wall-clock time read during render is the
  // simplest lock check.
  // eslint-disable-next-line react-hooks/purity
  const locked = new Date(match.kickoff_at).getTime() <= Date.now();
  const teamsReady = match.home_team && match.away_team;
  const homeName = match.home_team?.name ?? "A definir";
  const awayName = match.away_team?.name ?? "A definir";

  type PeerRow = {
    user_id: string;
    home_score: number;
    away_score: number;
    profile: { name: string } | null;
  };
  type ScoreRow = {
    user_id: string;
    points: number;
    is_exact_score: boolean;
    is_correct_winner: boolean;
  };

  let peerBets: PeerRow[] = [];
  let scoreByUser = new Map<string, ScoreRow>();
  const {
    data: { user: me },
  } = await supabase.auth.getUser();

  if (locked) {
    const [peerResult, scoreResult] = await Promise.all([
      supabase
        .from("bet_match")
        .select("user_id, home_score, away_score, profile:user_id (name)")
        .eq("match_id", match.id)
        .eq("pool_id", activeId)
        .returns<PeerRow[]>(),
      supabase
        .from("score")
        .select("user_id, points, is_exact_score, is_correct_winner")
        .eq("match_id", match.id)
        .eq("pool_id", activeId)
        .returns<ScoreRow[]>(),
    ]);
    peerBets = peerResult.data ?? [];
    scoreByUser = new Map(
      (scoreResult.data ?? []).map((s) => [s.user_id, s]),
    );
    // sort: highest points first, then alphabetical
    peerBets.sort((a, b) => {
      const pa = scoreByUser.get(a.user_id)?.points ?? -1;
      const pb = scoreByUser.get(b.user_id)?.points ?? -1;
      if (pa !== pb) return pb - pa;
      return (a.profile?.name ?? "").localeCompare(b.profile?.name ?? "", "pt-BR");
    });
  }

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-6">
      <p className="text-sm">
        <Link
          href="/jogos"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Voltar pra lista de jogos
        </Link>
      </p>

      <header className="space-y-1">
        <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {stageLabel(match.stage, match.group_code)}
        </p>
        <h1 className="text-2xl font-bold tracking-tight">
          {homeName} <span className="text-muted-foreground">×</span> {awayName}
        </h1>
        <p className="text-sm text-muted-foreground">
          <LocalTime
            utc={match.kickoff_at}
            options={{
              weekday: "long",
              day: "2-digit",
              month: "long",
              hour: "2-digit",
              minute: "2-digit",
            }}
          />
        </p>
      </header>

      {match.status === "finished" &&
      match.home_score !== null &&
      match.away_score !== null ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Resultado oficial</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold tabular-nums">
              {match.home_score} – {match.away_score}
            </p>
          </CardContent>
        </Card>
      ) : locked ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Aguardando placar</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              O jogo já começou. O admin vai inserir o resultado em breve.
            </p>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {locked ? "Seu palpite" : ownBet ? "Editar palpite" : "Fazer palpite"}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!teamsReady ? (
            <p className="text-sm text-muted-foreground">
              Os times deste jogo serão definidos quando a chave avançar.
            </p>
          ) : locked ? (
            ownBet ? (
              <p className="text-3xl font-semibold tabular-nums">
                {ownBet.home_score} – {ownBet.away_score}
              </p>
            ) : (
              <p className="text-sm text-muted-foreground">
                Você não palpitou nesse jogo. Vai zerar essa rodada.
              </p>
            )
          ) : (
            <PredictionForm
              matchId={match.id}
              homeName={homeName}
              awayName={awayName}
              defaultHome={ownBet?.home_score}
              defaultAway={ownBet?.away_score}
            />
          )}
        </CardContent>
      </Card>

      {locked && peerBets.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palpites do bolão</CardTitle>
          </CardHeader>
          <CardContent className="px-0">
            <ul className="divide-y">
              {peerBets.map((row) => {
                const sc = scoreByUser.get(row.user_id);
                const isMe = row.user_id === me?.id;
                return (
                  <li
                    key={row.user_id}
                    className={
                      "flex items-center gap-3 px-4 py-2 " +
                      (isMe ? "bg-primary/5" : "")
                    }
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">
                        {row.profile?.name ?? "—"}
                        {isMe && (
                          <span className="ml-2 text-xs text-muted-foreground">
                            (você)
                          </span>
                        )}
                      </p>
                      {sc && (
                        <p className="text-xs text-muted-foreground">
                          {sc.is_exact_score
                            ? "Cravou!"
                            : sc.is_correct_winner
                              ? "Acertou o vencedor"
                              : "Errou"}
                        </p>
                      )}
                    </div>
                    <span className="text-sm font-semibold tabular-nums">
                      {row.home_score} – {row.away_score}
                    </span>
                    <span className="w-12 text-right text-sm font-bold tabular-nums">
                      {sc ? `${sc.points} pts` : "—"}
                    </span>
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </main>
  );
}

function stageLabel(stage: string, group_code: string | null): string {
  if (stage === "group") return `Grupo ${group_code ?? ""}`.trim();
  return (
    {
      r32: "Oitavas (R32)",
      r16: "16-avos (R16)",
      qf: "Quartas",
      sf: "Semi",
      third: "Disputa de 3º",
      final: "Final",
    }[stage] ?? stage
  );
}
