"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveChampion, type SaveChampionState } from "./actions";

export type ChampionTeam = { id: string; name: string; group_code: string | null };

const initial: SaveChampionState = {};

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function ChampionForm({
  teams,
  defaultTeamId,
  locked,
}: {
  teams: ChampionTeam[];
  defaultTeamId: string | undefined;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(saveChampion, initial);

  const byGroup = new Map<string, ChampionTeam[]>();
  for (const t of teams) {
    const key = t.group_code ?? "?";
    (byGroup.get(key) ?? byGroup.set(key, []).get(key)!).push(t);
  }
  const groupKeys = Array.from(byGroup.keys()).sort();

  return (
    <form action={action} className="space-y-4">
      <fieldset disabled={locked || pending} className="space-y-2">
        <Label htmlFor="teamId">Campeão da Copa</Label>
        <select
          id="teamId"
          name="teamId"
          defaultValue={defaultTeamId ?? ""}
          required
          className={SELECT_CLASS}
        >
          <option value="" disabled>
            Selecione um time…
          </option>
          {groupKeys.map((g) => (
            <optgroup key={g} label={`Grupo ${g}`}>
              {byGroup.get(g)!.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <p className="text-xs text-muted-foreground">Acertar o campeão vale +20 pts.</p>
      </fieldset>

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

      {!locked && (
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Salvando..." : defaultTeamId ? "Atualizar palpite" : "Salvar palpite"}
        </Button>
      )}
    </form>
  );
}
