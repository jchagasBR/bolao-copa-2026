"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const RequestSchema = z.object({
  email: z.string().email("Email inválido"),
});

export type RequestResetState = { error?: string; sent?: boolean };

export async function requestPasswordReset(
  _prev: RequestResetState,
  formData: FormData,
): Promise<RequestResetState> {
  const parsed = RequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Email inválido" };
  }

  const supabase = await createClient();
  const appUrl = process.env.APP_URL ?? "http://localhost:3000";
  // Always succeed from the user's POV — we don't want to leak whether the
  // email is registered. resetPasswordForEmail returns a generic OK either way
  // unless there's a transport-level failure; treat all non-success as a
  // generic retry message rather than echoing the underlying error.
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${appUrl}/auth/confirm?next=/recuperar/redefinir`,
  });

  if (error) {
    return { error: "Não foi possível enviar o email agora. Tente novamente em instantes." };
  }

  return { sent: true };
}
