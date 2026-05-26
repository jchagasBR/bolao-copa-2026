"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createPool, type CreatePoolState } from "./actions";

const initial: CreatePoolState = {};

export function CreatePoolForm() {
  const [state, action, pending] = useActionState(createPool, initial);

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="name">Nome do bolão</Label>
        <Input
          id="name"
          name="name"
          type="text"
          required
          minLength={3}
          maxLength={60}
          placeholder="Ex: Galera da firma"
        />
        <p className="text-xs text-muted-foreground">
          Esse nome aparece pros participantes no header e na lista de bolões.
        </p>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando..." : "Criar bolão"}
      </Button>
    </form>
  );
}
