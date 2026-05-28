import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { LocalTime } from "@/components/local-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScoreForm } from "./score-form";
import { KickoffForm } from "./kickoff-form";

type Team = { id: string; name: string; iso_code: string };
type MatchRow = {
  id: string;
  stage: string;
  group_code: string | null;
  kickoff_at: string;
  status: string;
  home_score: number | null;
  away_score: number | null;
  winner_team_id: string | null;
  home_team: Team | null;
  away_team: Team | null;
};

export default async function AdminMatchPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const supabase = await createClient();

  const { data: match } = await supabase
    .from("match")
    .select(
      "id, stage, group_code, kickoff_at, status, home_score, away_score, winner_team_id, home_team:home_team_id (id, name, iso_code), away_team:away_team_id (id, name, iso_code)",
    )
    .eq("id", matchId)
    .maybeSingle<MatchRow>();

  if (!match) {
    notFound();
  }

  const homeName = match.home_team?.name ?? "A definir";
  const awayName = match.away_team?.name ?? "A definir";
  const isKnockout = ["r32", "r16", "qf", "sf", "third", "final"].includes(
    match.stage,
  );

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-6">
      <p className="text-sm">
        <Link
          href={`/jogos/${match.id}`}
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Voltar pro jogo
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
        <p className="text-xs text-muted-foreground">
          Status atual: <span className="font-medium">{statusLabel(match.status)}</span>
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Inserir / corrigir placar</CardTitle>
        </CardHeader>
        <CardContent>
          {match.home_team && match.away_team ? (
            <ScoreForm
              matchId={match.id}
              homeName={homeName}
              awayName={awayName}
              homeTeamId={match.home_team.id}
              awayTeamId={match.away_team.id}
              defaultHome={match.home_score ?? undefined}
              defaultAway={match.away_score ?? undefined}
              defaultWinnerTeamId={match.winner_team_id}
              isKnockout={isKnockout}
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              Os times deste jogo ainda não foram definidos. Volte quando a chave
              tiver avançado.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Reagendar jogo</CardTitle>
        </CardHeader>
        <CardContent>
          <KickoffForm matchId={match.id} currentKickoffUtc={match.kickoff_at} />
        </CardContent>
      </Card>
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

function statusLabel(status: string): string {
  return (
    {
      scheduled: "Agendado",
      live: "Ao vivo",
      finished: "Finalizado",
      postponed: "Adiado",
    }[status] ?? status
  );
}
