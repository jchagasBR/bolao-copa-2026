"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

export type OptOutState = { error?: string; saved?: boolean };

export async function setEmailOptOut(
  _prev: OptOutState,
  formData: FormData,
): Promise<OptOutState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect("/entrar");
  }

  const next = formData.get("opt_out") === "on";

  const { error } = await supabase
    .from("profile")
    .update({ email_opt_out: next })
    .eq("id", user.id);

  if (error) {
    return { error: "Não foi possível salvar a preferência. Tente novamente." };
  }

  revalidatePath("/perfil");
  return { saved: true };
}
