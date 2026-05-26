"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

// Subscribes to Postgres changes on score + bonus for the given pool and
// calls router.refresh() on each event — Next 16 re-runs the server component
// and the page re-renders with fresh aggregate points.
//
// One channel per pool keeps the subscription scoped — Supabase Realtime
// filter takes the form `<column>=eq.<value>` directly in the on() options.
export function RankingLive({ poolId }: { poolId: string }) {
  const router = useRouter();

  useEffect(() => {
    const supabase = createClient();
    const channel = supabase
      .channel(`ranking-${poolId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "score",
          filter: `pool_id=eq.${poolId}`,
        },
        () => router.refresh(),
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "bonus",
          filter: `pool_id=eq.${poolId}`,
        },
        () => router.refresh(),
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [poolId, router]);

  return null;
}
