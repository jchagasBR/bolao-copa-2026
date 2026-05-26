"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updatePassword, type UpdatePasswordState } from "./actions";

const initial: UpdatePasswordState = {};

export function UpdatePasswordForm() {
  const [state, action, pending] = useActionState(updatePassword, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="password">Nova senha</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
        <p className="text-xs text-muted-foreground">Mínimo de 8 caracteres.</p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="confirmPassword">Confirmar nova senha</Label>
        <Input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          autoComplete="new-password"
          required
          minLength={8}
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Atualizar senha"}
      </Button>
    </form>
  );
}
