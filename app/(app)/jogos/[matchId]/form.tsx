"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { savePrediction, type PredictionState } from "./actions";

const initial: PredictionState = {};

export function PredictionForm({
  matchId,
  homeName,
  awayName,
  defaultHome,
  defaultAway,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  defaultHome?: number;
  defaultAway?: number;
}) {
  const [state, action, pending] = useActionState(savePrediction, initial);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="matchId" value={matchId} />
      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="homeScore" className="text-xs">
            {homeName}
          </Label>
          <Input
            id="homeScore"
            name="homeScore"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            defaultValue={defaultHome ?? ""}
            placeholder="0"
            required
            className="h-12 text-center text-2xl tabular-nums"
          />
        </div>
        <span className="pb-3 text-xl text-muted-foreground">×</span>
        <div className="space-y-1">
          <Label htmlFor="awayScore" className="text-xs">
            {awayName}
          </Label>
          <Input
            id="awayScore"
            name="awayScore"
            type="number"
            inputMode="numeric"
            min={0}
            max={20}
            defaultValue={defaultAway ?? ""}
            placeholder="0"
            required
            className="h-12 text-center text-2xl tabular-nums"
          />
        </div>
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          Palpite salvo!
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : defaultHome !== undefined ? "Atualizar palpite" : "Salvar palpite"}
      </Button>
    </form>
  );
}
