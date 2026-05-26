import { Button } from "@/components/ui/button";

export function UserMenu({ name }: { name: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground hidden sm:inline">{name}</span>
      <form action="/auth/signout" method="post">
        <Button type="submit" variant="ghost" size="sm">
          Sair
        </Button>
      </form>
    </div>
  );
}
