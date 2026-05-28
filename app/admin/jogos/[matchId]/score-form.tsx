"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveScore, type AdminState } from "./actions";

const initial: AdminState = {};

export function ScoreForm({
  matchId,
  homeName,
  awayName,
  homeTeamId,
  awayTeamId,
  defaultHome,
  defaultAway,
  defaultWinnerTeamId,
  isKnockout,
}: {
  matchId: string;
  homeName: string;
  awayName: string;
  homeTeamId: string;
  awayTeamId: string;
  defaultHome?: number;
  defaultAway?: number;
  defaultWinnerTeamId: string | null;
  isKnockout: boolean;
}) {
  const [state, action, pending] = useActionState(saveScore, initial);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="matchId" value={matchId} />

      <div className="grid grid-cols-[1fr_auto_1fr] items-end gap-3">
        <div className="space-y-1">
          <Label htmlFor="homeScore" className="text-xs">{homeName}</Label>
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
          <Label htmlFor="awayScore" className="text-xs">{awayName}</Label>
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

      {isKnockout && (
        <div className="space-y-1">
          <Label htmlFor="winnerTeamId" className="text-xs">
            Vencedor (em caso de empate / pênaltis)
          </Label>
          <select
            id="winnerTeamId"
            name="winnerTeamId"
            defaultValue={defaultWinnerTeamId ?? "none"}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 text-sm shadow-xs focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-hidden"
          >
            <option value="none">— (decidido pelo placar)</option>
            <option value={homeTeamId}>{homeName} avançou</option>
            <option value={awayTeamId}>{awayName} avançou</option>
          </select>
          <p className="text-xs text-muted-foreground">
            Obrigatório quando o jogo termina empatado no tempo regulamentar.
          </p>
        </div>
      )}

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          Placar salvo. Pontos recomputados.
        </p>
      )}

      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Salvando..." : "Salvar placar"}
      </Button>
    </form>
  );
}
