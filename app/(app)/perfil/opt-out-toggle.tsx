"use client";

import { useActionState } from "react";
import { setEmailOptOut, type OptOutState } from "./actions";

const initial: OptOutState = {};

// A controlled checkbox-on-form pattern: clicking the checkbox auto-submits
// via `form.requestSubmit()`. Keeps the UI to a single tap without a "Salvar"
// button. State feedback is rendered inline on save / error.
export function OptOutToggle({ initialValue }: { initialValue: boolean }) {
  const [state, action, pending] = useActionState(setEmailOptOut, initial);

  return (
    <form
      action={action}
      className="flex items-start gap-3 rounded-lg border bg-card p-4"
    >
      <input
        id="opt_out"
        name="opt_out"
        type="checkbox"
        defaultChecked={initialValue}
        disabled={pending}
        onChange={(e) => e.currentTarget.form?.requestSubmit()}
        className="mt-0.5 h-4 w-4 accent-foreground"
      />
      <div className="flex-1 space-y-0.5">
        <label htmlFor="opt_out" className="text-sm font-medium leading-none">
          Não quero receber emails de lembrete
        </label>
        <p className="text-xs text-muted-foreground">
          Por padrão, mandamos um email no dia anterior a cada jogo que você
          ainda não palpitou. Marque essa opção pra parar de receber.
        </p>
        {pending && (
          <p className="text-xs text-muted-foreground">Salvando…</p>
        )}
        {state.error && (
          <p className="text-xs text-destructive" role="alert">
            {state.error}
          </p>
        )}
        {state.saved && !state.error && !pending && (
          <p className="text-xs text-emerald-600 dark:text-emerald-400" role="status">
            Preferência salva.
          </p>
        )}
      </div>
    </form>
  );
}
