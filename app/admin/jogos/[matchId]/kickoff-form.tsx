"use client";

import { useActionState, useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { saveKickoff, type AdminState } from "./actions";

const initial: AdminState = {};

// Convert a UTC ISO string into the "YYYY-MM-DDTHH:mm" shape that
// <input type="datetime-local"> expects, expressed in the browser's TZ.
function utcToLocalInputValue(utc: string): string {
  const d = new Date(utc);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes())
  );
}

export function KickoffForm({
  matchId,
  currentKickoffUtc,
}: {
  matchId: string;
  currentKickoffUtc: string;
}) {
  const [state, action, pending] = useActionState(saveKickoff, initial);
  // Render an empty default on first paint to match the server, then hydrate
  // with the local value once we're in the browser. Avoids the SSR/browser TZ
  // hydration mismatch that <LocalTime /> handles for read-only displays.
  const [localValue, setLocalValue] = useState("");
  const [tzOffset, setTzOffset] = useState(0);

  useEffect(() => {
    // Intentional setState-in-effect: datetime-local needs a browser-TZ
    // string, which only exists on the client. SSR renders empty; this
    // effect fills both inputs once mounted. Same pattern as <LocalTime />.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLocalValue(utcToLocalInputValue(currentKickoffUtc));
    setTzOffset(new Date().getTimezoneOffset());
  }, [currentKickoffUtc]);

  return (
    <form action={action} className="space-y-5">
      <input type="hidden" name="matchId" value={matchId} />
      <input
        type="hidden"
        name="kickoffTzOffsetMinutes"
        value={tzOffset}
      />

      <div className="space-y-1">
        <Label htmlFor="kickoffLocal" className="text-xs">
          Novo horário (no seu fuso)
        </Label>
        <Input
          id="kickoffLocal"
          name="kickoffLocal"
          type="datetime-local"
          value={localValue}
          onChange={(e) => setLocalValue(e.target.value)}
          required
          className="h-10"
        />
      </div>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      {state.saved && !state.error && (
        <p className="text-sm text-emerald-600 dark:text-emerald-400" role="status">
          Horário atualizado.
        </p>
      )}

      <Button
        type="submit"
        variant="outline"
        className="w-full"
        disabled={pending}
      >
        {pending ? "Salvando..." : "Atualizar horário"}
      </Button>
    </form>
  );
}
