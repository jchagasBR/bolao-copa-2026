"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { joinPool, type JoinPoolState } from "./actions";

const initial: JoinPoolState = {};

export function JoinPoolForm() {
  const [state, action, pending] = useActionState(joinPool, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="code">Código de convite</Label>
        <Input
          id="code"
          name="code"
          type="text"
          required
          placeholder="COPA-XXXX"
          autoCapitalize="characters"
          spellCheck={false}
          className="uppercase"
          pattern="^COPA-[A-Z0-9]{4}$"
          title="Formato: COPA-XXXX"
        />
        <p className="text-xs text-muted-foreground">
          O admin do bolão te passa o código (formato COPA-XXXX).
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Entrando..." : "Entrar"}
      </Button>
    </form>
  );
}
