import Link from "next/link";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { listMyPools, readActivePoolId } from "@/lib/pool";
import { LocalTime } from "@/components/local-time";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChampionForm, type ChampionTeam } from "./form";

export const metadata = {
  title: "Palpites — Campeão — Bolão Copa 2026",
};

export default async function PalpitesCampeaoPage() {
  const pools = await listMyPools();
  if (pools.length === 0) {
    redirect("/");
  }
  const activeId = (await readActivePoolId()) ?? pools[0].id;
  const supabase = await createClient();

  const [teamsResult, betResult, kickoffResult] = await Promise.all([
    supabase
      .from("team")
      .select("id, name, group_code")
      .order("group_code", { nullsFirst: false })
      .order("name")
      .returns<ChampionTeam[]>(),
    supabase
      .from("bet_champion")
      .select("team_id")
      .eq("pool_id", activeId)
      .maybeSingle(),
    supabase.from("first_kickoff").select("t").maybeSingle<{ t: string }>(),
  ]);

  const teams = teamsResult.data ?? [];
  const defaultTeamId = betResult.data?.team_id ?? undefined;
  const firstKickoff = kickoffResult.data?.t ?? null;
  // eslint-disable-next-line react-hooks/purity
  const locked = !!firstKickoff && new Date(firstKickoff).getTime() <= Date.now();

  return (
    <main className="mx-auto max-w-md px-4 py-6 space-y-6">
      <p className="text-sm">
        <Link
          href="/palpites"
          className="text-muted-foreground underline-offset-4 hover:underline"
        >
          ← Palpites
        </Link>
      </p>

      <header className="space-y-1">
        <h1 className="text-2xl font-bold tracking-tight">Campeão da Copa</h1>
        <p className="text-sm text-muted-foreground">
          Quem vai levantar a taça? Acertar vale +20 pts.
        </p>
        {firstKickoff && (
          <p className="text-xs text-muted-foreground">
            Prazo: até o início do primeiro jogo (
            <LocalTime
              utc={firstKickoff}
              options={{
                day: "2-digit",
                month: "long",
                hour: "2-digit",
                minute: "2-digit",
              }}
            />
            ).
          </p>
        )}
      </header>

      {locked && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Palpite fechado</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground">
            {defaultTeamId
              ? "Seu palpite está registrado e já não pode ser editado."
              : "Você não escolheu um campeão antes do início do primeiro jogo."}
          </CardContent>
        </Card>
      )}

      <ChampionForm
        teams={teams}
        defaultTeamId={defaultTeamId}
        locked={locked}
      />
    </main>
  );
}
