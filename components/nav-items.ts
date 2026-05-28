import { Home, ListChecks, Trophy, User, CalendarDays, type LucideIcon } from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/", label: "Início", icon: Home },
  { href: "/jogos", label: "Jogos", icon: CalendarDays },
  { href: "/palpites", label: "Palpites", icon: ListChecks },
  { href: "/ranking", label: "Ranking", icon: Trophy },
  { href: "/perfil", label: "Perfil", icon: User },
];
