import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { LocalTime } from "@/components/local-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GroupBetsForm, type GroupTeam, type Existing } from "./form";

export const metadata = {
  title: "Palpites — Fase de grupos — Bolão Copa 2026",
};

export default async function PalpitesGruposPage() {
  const pools = await listMyPools();
  if (pools.length === 0) {
    redirect("/");
  }
  const activeId = (await readActivePoolId()) ?? pools[0].id;
  const supabase = await createClient();

  const [teamsResult, betsResult, kickoffResult] = await Promise.all([
    supabase
      .from("team")
      .select("id, name, group_code")
      .not("group_code", "is", null)
      .order("group_code")
      .order("name"),
    supabase
      .from("bet_group")
      .select("group_code, first_team_id, second_team_id")
      .eq("pool_id", activeId),
    supabase.from("first_kickoff").select("t").maybeSingle<{ t: string }>(),
  ]);

  const teams = (teamsResult.data ?? []) as Array<GroupTeam & { group_code: string }>;
  const teamsByGroup: Record<string, GroupTeam[]> = {};
  for (const t of teams) {
    (teamsByGroup[t.group_code] ??= []).push({ id: t.id, name: t.name });
  }

  const existing: Record<string, Existing> = {};
  for (const b of betsResult.data ?? []) {
    existing[b.group_code] = {
      first_team_id: b.first_team_id,
      second_team_id: b.second_team_id,
    };
  }

  const firstKickoff = kickoffResult.data?.t ?? null;
  // Dynamic Server Component; reading wall-clock time during render is the
  // simplest way to compute the deadline state.
  // eslint-disable-next-line react-hooks/purity
  const locked = !!firstKickoff && new Date(firstKickoff).getTime() <= Date.now();
  const filledCount = Object.keys(existing).length;

  return (
    <main className="mx-auto max-w-2xl px-4 py-6 space-y-6">
      <p className="text-sm">
        <Link
          href="/palpites"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Palpites
        </Link>
      </p>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Fase de grupos</h1>
        <p className="text-sm text-muted-foreground">
          Para cada grupo, escolha quem termina em 1º e 2º. Acertar o 1º vale
          +5 pts; o 2º vale +3 pts.
        </p>
        {firstKickoff && (
          <p className="text-xs text-muted-foreground">
            Prazo: até o início do primeiro jogo (
            <LocalTime utc={firstKickoff} options={{ day: "2-digit", month: "long", hour: "2-digit", minute: "2-digit" }} />
            ).
          </p>
        )}
      </header>

      {locked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palpites fechados</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {filledCount === 0
              ? "Você não palpitou na fase de grupos antes do início do primeiro jogo."
              : `Você palpitou em ${filledCount} de 12 grupos. Os palpites já não podem ser editados.`}
          </CardContent>
        </Card>
      )}

      <GroupBetsForm
        teamsByGroup={teamsByGroup}
        existing={existing}
        locked={locked}
      />
    </main>
  );
}
