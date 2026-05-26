"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { requestPasswordReset, type RequestResetState } from "./actions";

const initial: RequestResetState = {};

export function RequestResetForm() {
  const [state, action, pending] = useActionState(requestPasswordReset, initial);

  if (state.sent) {
    return (
      <div className="space-y-3 rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900 dark:border-emerald-900/40 dark:bg-emerald-950/40 dark:text-emerald-100">
        <p className="font-medium">Confira sua caixa de entrada.</p>
        <p>
          Se o email estiver cadastrado, você vai receber um link pra redefinir a
          senha. Verifique também o spam.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="voce@exemplo.com"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
