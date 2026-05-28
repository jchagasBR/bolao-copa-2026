"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/service";

const KNOCKOUT_STAGES = ["r32", "r16", "qf", "sf", "third", "final"] as const;

const ScoreSchema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.coerce.number().int().min(0).max(20),
  awayScore: z.coerce.number().int().min(0).max(20),
  winnerTeamId: z
    .union([z.string().uuid(), z.literal(""), z.literal("none")])
    .optional()
    .transform((v) => (v === "" || v === "none" || v === undefined ? null : v)),
});

const KickoffSchema = z.object({
  matchId: z.string().uuid(),
  // datetime-local arrives as "YYYY-MM-DDTHH:mm"; parsed via new Date() in the
  // browser's TZ. Admin operates in their own TZ; we store UTC.
  kickoffLocal: z.string().min(1, "Informe um horário válido."),
});

export type AdminState = { error?: string; saved?: boolean };

async function assertAnyPoolAdmin(): Promise<string> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }
  const { data: ownsAnyPool } = await supabase
    .from("pool")
    .select("id")
    .eq("admin_id", user.id)
    .limit(1)
    .maybeSingle();
  if (!ownsAnyPool) {
    throw new Error("Acesso negado.");
  }
  return user.id;
}

export async function saveScore(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  try {
    await assertAnyPoolAdmin();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Acesso negado." };
  }

  const parsed = ScoreSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
    winnerTeamId: formData.get("winnerTeamId") ?? undefined,
  });

  if (!parsed.success) {
    return { error: "Placar inválido. Use números entre 0 e 20." };
  }

  const svc = createServiceClient();

  // Read the match so we can validate winner_team_id against the listed teams
  // and decide whether winner_team_id is required (knockout + level score).
  const { data: match, error: readError } = await svc
    .from("match")
    .select("id, stage, home_team_id, away_team_id")
    .eq("id", parsed.data.matchId)
    .maybeSingle();

  if (readError || !match) {
    return { error: "Jogo não encontrado." };
  }

  const isKnockout = (KNOCKOUT_STAGES as readonly string[]).includes(match.stage);
  const level = parsed.data.homeScore === parsed.data.awayScore;

  let winnerTeamId: string | null = parsed.data.winnerTeamId ?? null;

  if (isKnockout && level) {
    if (!winnerTeamId) {
      return {
        error:
          "Em jogos de mata-mata empatados no tempo regulamentar, escolha quem avançou (pênaltis).",
      };
    }
  }
  if (!isKnockout) {
    // Group matches can end in a draw; winner_team_id stays NULL.
    winnerTeamId = null;
  }
  if (winnerTeamId && winnerTeamId !== match.home_team_id && winnerTeamId !== match.away_team_id) {
    return { error: "O time vencedor precisa ser um dos dois times do jogo." };
  }

  const { error: updateError } = await svc
    .from("match")
    .update({
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      status: "finished",
      winner_team_id: winnerTeamId,
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.matchId);

  if (updateError) {
    return { error: "Não foi possível salvar o placar. Tente novamente." };
  }

  // Recompute per-user match points for this match (idempotent).
  const { error: rmErr } = await svc.rpc("recompute_match", {
    p_match_id: parsed.data.matchId,
  });
  if (rmErr) {
    return { error: "Placar salvo, mas a recomputação falhou. Reveja os pontos." };
  }

  // Recompute bonuses for every pool. The MVP caps pools at "≤30 users, each
  // in ≤10 pools" — fan-out is small. Function is idempotent and only does
  // work when the relevant deadline conditions are met (groups all finished,
  // final finished), so calling it after every match write is cheap.
  const { data: pools } = await svc.from("pool").select("id");
  for (const p of pools ?? []) {
    await svc.rpc("recompute_bonuses", { p_pool_id: p.id });
  }

  revalidatePath("/jogos");
  revalidatePath(`/jogos/${parsed.data.matchId}`);
  revalidatePath("/ranking");
  revalidatePath(`/admin/jogos/${parsed.data.matchId}`);
  return { saved: true };
}

export async function saveKickoff(
  _prev: AdminState,
  formData: FormData,
): Promise<AdminState> {
  try {
    await assertAnyPoolAdmin();
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Acesso negado." };
  }

  const parsed = KickoffSchema.safeParse({
    matchId: formData.get("matchId"),
    kickoffLocal: formData.get("kickoffLocal"),
  });

  if (!parsed.success) {
    return { error: "Horário inválido." };
  }

  // datetime-local has no zone; the admin enters it in their browser's TZ.
  // The hidden input "kickoffTzOffsetMinutes" carries the offset so we can
  // convert to UTC server-side without trusting the browser to do it.
  const offsetRaw = formData.get("kickoffTzOffsetMinutes");
  const offsetMinutes = Number.isFinite(Number(offsetRaw)) ? Number(offsetRaw) : 0;
  const localMs = new Date(parsed.data.kickoffLocal + "Z").getTime();
  if (!Number.isFinite(localMs)) {
    return { error: "Horário inválido." };
  }
  // datetime-local "2026-06-11T16:00" + "Z" parses as 16:00 UTC. The browser
  // intended 16:00 in its own TZ, which is (16:00 + offsetMinutes) UTC since
  // getTimezoneOffset() returns UTC-minus-local minutes.
  const utc = new Date(localMs + offsetMinutes * 60_000);

  const svc = createServiceClient();
  const { error } = await svc
    .from("match")
    .update({
      kickoff_at: utc.toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq("id", parsed.data.matchId);

  if (error) {
    return { error: "Não foi possível atualizar o horário." };
  }

  revalidatePath("/jogos");
  revalidatePath(`/jogos/${parsed.data.matchId}`);
  revalidatePath(`/admin/jogos/${parsed.data.matchId}`);
  return { saved: true };
}
