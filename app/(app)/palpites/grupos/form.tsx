"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { saveGroupBets, type SaveGroupBetsState } from "./actions";

export type GroupTeam = { id: string; name: string };
export type Existing = { first_team_id: string; second_team_id: string };

const initial: SaveGroupBetsState = {};

const SELECT_CLASS =
  "h-10 w-full rounded-md border border-input bg-background px-2 text-sm shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50";

export function GroupBetsForm({
  teamsByGroup,
  existing,
  locked,
}: {
  teamsByGroup: Record<string, GroupTeam[]>;
  existing: Record<string, Existing>;
  locked: boolean;
}) {
  const [state, action, pending] = useActionState(saveGroupBets, initial);
  const groups = Object.keys(teamsByGroup).sort();

  return (
    <form action={action} className="space-y-6">
      {groups.map((g) => {
        const teams = teamsByGroup[g];
        const ex = existing[g];
        return (
          <fieldset
            key={g}
            disabled={locked || pending}
            className="space-y-3 rounded-lg border bg-card p-4"
          >
            <legend className="-mb-1 px-1 text-sm font-semibold">
              Grupo {g}
            </legend>
            <p className="text-xs text-muted-foreground">
              {teams.map((t) => t.name).join(" · ")}
            </p>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor={`primeiro_${g}`} className="text-xs">
                  1º colocado <span className="text-emerald-600">+5 pts</span>
                </Label>
                <select
                  id={`primeiro_${g}`}
                  name={`primeiro_${g}`}
                  defaultValue={ex?.first_team_id ?? ""}
                  required
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-1">
                <Label htmlFor={`segundo_${g}`} className="text-xs">
                  2º colocado <span className="text-emerald-600">+3 pts</span>
                </Label>
                <select
                  id={`segundo_${g}`}
                  name={`segundo_${g}`}
                  defaultValue={ex?.second_team_id ?? ""}
                  required
                  className={SELECT_CLASS}
                >
                  <option value="" disabled>
                    Selecione…
                  </option>
                  {teams.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </fieldset>
        );
      })}

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          Palpites de grupos salvos!
        </p>
      )}

      {!locked && (
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? "Salvando..." : "Salvar palpites"}
        </Button>
      )}
    </form>
  );
}
