"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertMember, readActivePoolId } from "@/lib/pool";

const Schema = z.object({
  teamId: z.string().uuid("Selecione um time"),
});

export type SaveChampionState = { error?: string; saved?: boolean };

export async function saveChampion(
  _prev: SaveChampionState,
  formData: FormData,
): Promise<SaveChampionState> {
  const parsed = Schema.safeParse({ teamId: formData.get("teamId") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Time inválido" };
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

  const { error } = await supabase.from("bet_champion").upsert(
    {
      user_id: user.id,
      pool_id: poolId,
      team_id: parsed.data.teamId,
      updated_at: new Date().toISOString(),
    },
    { onConflict: "user_id,pool_id" },
  );

  if (error) {
    return {
      error:
        "Não foi possível salvar o palpite. O prazo (início do primeiro jogo) pode já ter passado.",
    };
  }

  revalidatePath("/palpites");
  revalidatePath("/palpites/campeao");
  return { saved: true };
}
