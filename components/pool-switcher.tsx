"use client";

import Link from "next/link";
import { useTransition } from "react";
import { ChevronDown, Check, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { switchPool } from "./pool-switcher.actions";

export type PoolSwitcherItem = { id: string; name: string };

export function PoolSwitcher({
  pools,
  activeId,
}: {
  pools: PoolSwitcherItem[];
  activeId: string | null;
}) {
  const [pending, startTransition] = useTransition();
  const active = pools.find((p) => p.id === activeId) ?? null;
  const label = active?.name ?? (pools.length === 0 ? "Sem bolões" : "Selecione um bolão");

  if (pools.length === 0) {
    return (
      <Button variant="outline" size="sm" disabled className="text-xs">
        Sem bolões
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        render={(props) => (
          <Button
            {...props}
            variant="outline"
            size="sm"
            disabled={pending}
            className="max-w-[180px]"
          >
            <span className="truncate">{label}</span>
            <ChevronDown className="ml-1 h-3.5 w-3.5 shrink-0" aria-hidden />
          </Button>
        )}
      />
      <DropdownMenuContent align="end" className="min-w-[220px]">
        {pools.map((pool) => {
          const isActive = pool.id === activeId;
          return (
            <DropdownMenuItem
              key={pool.id}
              disabled={pending || isActive}
              onClick={() => startTransition(() => void switchPool(pool.id))}
            >
              <span className="flex w-4 shrink-0 items-center justify-center">
                {isActive ? <Check className="h-3.5 w-3.5" aria-hidden /> : null}
              </span>
              <span className="truncate">{pool.name}</span>
            </DropdownMenuItem>
          );
        })}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          render={(props) => (
            <Link {...props} href="/boloes/criar">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>Criar bolão</span>
            </Link>
          )}
        />
        <DropdownMenuItem
          render={(props) => (
            <Link {...props} href="/boloes/entrar">
              <Plus className="h-3.5 w-3.5" aria-hidden />
              <span>Entrar em bolão</span>
            </Link>
          )}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
