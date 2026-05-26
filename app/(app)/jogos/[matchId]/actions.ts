"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertMember, readActivePoolId } from "@/lib/pool";

const PredictionSchema = z.object({
  matchId: z.string().uuid(),
  homeScore: z.coerce.number().int().min(0).max(20),
  awayScore: z.coerce.number().int().min(0).max(20),
});

export type PredictionState = { error?: string; saved?: boolean };

export async function savePrediction(
  _prev: PredictionState,
  formData: FormData,
): Promise<PredictionState> {
  const parsed = PredictionSchema.safeParse({
    matchId: formData.get("matchId"),
    homeScore: formData.get("homeScore"),
    awayScore: formData.get("awayScore"),
  });

  if (!parsed.success) {
    return { error: "Placar inválido. Use números entre 0 e 20." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const poolId = await readActivePoolId();
  if (!poolId) {
    return { error: "Nenhum bolão ativo selecionado." };
  }

  try {
    await assertMember(poolId, user.id);
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Acesso negado." };
  }

  const { data: match, error: matchError } = await supabase
    .from("match")
    .select("kickoff_at")
    .eq("id", parsed.data.matchId)
    .maybeSingle();

  if (matchError || !match) {
    return { error: "Jogo não encontrado." };
  }
  if (new Date(match.kickoff_at).getTime() <= Date.now()) {
    return { error: "O palpite não pode mais ser editado após o início do jogo." };
  }

  const { error } = await supabase.from("bet_match").upsert(
    {
      user_id: user.id,
      pool_id: poolId,
      match_id: parsed.data.matchId,
      home_score: parsed.data.homeScore,
      away_score: parsed.data.awayScore,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,pool_id,match_id" },
  );

  if (error) {
    if (error.message?.includes("bet_match_locked")) {
      return { error: "O palpite não pode mais ser editado após o início do jogo." };
    }
    return { error: "Não foi possível salvar o palpite. Tente novamente." };
  }

  revalidatePath("/jogos");
  revalidatePath(`/jogos/${parsed.data.matchId}`);
  revalidatePath("/palpites");
  return { saved: true };
}
