"use client";

import { useEffect, useState } from "react";

type Props = {
  utc: string;
  options?: Intl.DateTimeFormatOptions;
  fallback?: string;
};

const DEFAULT_OPTIONS: Intl.DateTimeFormatOptions = {
  hour: "2-digit",
  minute: "2-digit",
};

// Renders a UTC ISO timestamp in the browser's local time zone. Falls back to
// the explicit fallback prop on first server paint (avoids hydration mismatch
// because Intl.DateTimeFormat output depends on the client TZ).
export function LocalTime({ utc, options, fallback }: Props) {
  const [text, setText] = useState<string | null>(null);

  useEffect(() => {
    const formatter = new Intl.DateTimeFormat(
      "pt-BR",
      options ?? DEFAULT_OPTIONS,
    );
    // Intentional setState-in-effect: Intl.DateTimeFormat depends on the
    // browser TZ, so the value only exists on the client. Initial render is
    // null (matches SSR); this effect fills in the localized text. The lint
    // rule is too strict for this hydration-deferral pattern.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setText(formatter.format(new Date(utc)));
  }, [utc, options]);

  return (
    <time dateTime={utc} suppressHydrationWarning>
      {text ?? fallback ?? ""}
    </time>
  );
}
