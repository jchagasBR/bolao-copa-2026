"use client";

import { Button } from "@/components/ui/button";

type Pool = { id: string; name: string };

export function PoolSwitcher({ pools: _pools }: { pools: Pool[] }) {
  // Stub — Phase 3 (pool create/join) will populate this. For now we show a
  // simple "no pools" badge so the layout is complete.
  return (
    <Button variant="outline" size="sm" disabled className="text-xs">
      Sem bolões
    </Button>
  );
}
