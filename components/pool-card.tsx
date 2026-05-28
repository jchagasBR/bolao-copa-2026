"use client";

import { useTransition } from "react";
import { Users, Crown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { switchPool } from "./pool-switcher.actions";
import { cn } from "@/lib/utils";

export type PoolCardData = {
  id: string;
  name: string;
  invite_code: string;
  is_admin: boolean;
  member_count: number;
};

// Clickable pool card on the "Meus bolões" dashboard. Calls the same
// switchPool server action as the header PoolSwitcher dropdown — sets the
// active_pool_id cookie and redirects to /jogos. The whole card is the
// click surface; admins also see the invite code below.
export function PoolCard({
  pool,
  isActive,
}: {
  pool: PoolCardData;
  isActive: boolean;
}) {
  const [pending, startTransition] = useTransition();

  return (
    <button
      type="button"
      disabled={pending}
      onClick={() => startTransition(() => void switchPool(pool.id))}
      className={cn(
        "block w-full text-left transition disabled:opacity-60",
        "rounded-xl focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-ring",
      )}
      aria-label={`Abrir ${pool.name}${isActive ? " (bolão ativo)" : ""}`}
    >
      <Card
        className={cn(
          "h-full transition hover:bg-muted/40",
          isActive ? "border-primary/40 bg-primary/5" : "",
        )}
      >
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <span className="truncate">{pool.name}</span>
            {pool.is_admin && (
              <span
                title="Você é o admin"
                className="inline-flex items-center text-amber-600 dark:text-amber-400"
              >
                <Crown className="h-4 w-4" aria-hidden />
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p className="flex items-center gap-1.5 text-muted-foreground">
            <Users className="h-3.5 w-3.5" aria-hidden />
            {pool.member_count} participante
            {pool.member_count === 1 ? "" : "s"}
          </p>
          {pool.is_admin && (
            <p className="text-xs text-muted-foreground">
              Código: <code className="font-mono">{pool.invite_code}</code>
            </p>
          )}
          <p className="pt-1 text-xs font-medium text-primary">
            {pending ? "Abrindo…" : isActive ? "Bolão ativo · Ver jogos →" : "Abrir →"}
          </p>
        </CardContent>
      </Card>
    </button>
  );
}
