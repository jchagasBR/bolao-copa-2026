"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { assertMember, readActivePoolId } from "@/lib/pool";

const GROUP_CODES = [
  "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K", "L",
] as const;

const Uuid = z.string().uuid();

export type SaveGroupBetsState = { error?: string; saved?: boolean };

export async function saveGroupBets(
  _prev: SaveGroupBetsState,
  formData: FormData,
): Promise<SaveGroupBetsState> {
  type Pick = { group: string; first: string; second: string };
  const picks: Pick[] = [];

  for (const g of GROUP_CODES) {
    const first = formData.get(`primeiro_${g}`);
    const second = formData.get(`segundo_${g}`);
    if (typeof first !== "string" || typeof second !== "string") {
      return { error: `Faltam picks no grupo ${g}.` };
    }
    if (!Uuid.safeParse(first).success || !Uuid.safeParse(second).success) {
      return { error: `Picks inválidos no grupo ${g}.` };
    }
    if (first === second) {
      return {
        error: `Os dois times do grupo ${g} precisam ser diferentes.`,
      };
    }
    picks.push({ group: g, first, second });
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

  const { error } = await supabase.from("bet_group").upsert(
    picks.map((p) => ({
      user_id: user.id,
      pool_id: poolId,
      group_code: p.group,
      first_team_id: p.first,
      second_team_id: p.second,
      updated_at: new Date().toISOString(),
    })),
    { onConflict: "user_id,pool_id,group_code" },
  );

  if (error) {
    if (error.message?.toLowerCase().includes("check") && error.message?.includes("first_team_id")) {
      return { error: "1º e 2º colocado precisam ser times diferentes." };
    }
    return {
      error:
        "Não foi possível salvar os palpites. Talvez o prazo (início do primeiro jogo) já tenha passado.",
    };
  }

  revalidatePath("/palpites");
  revalidatePath("/palpites/grupos");
  return { saved: true };
}
