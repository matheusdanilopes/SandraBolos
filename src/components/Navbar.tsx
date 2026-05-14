"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users, TrendingUp, Settings, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Início", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/toppers", label: "Toppers", icon: Sparkles },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/financeiro", label: "Finanças", icon: TrendingUp },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-40 shadow-sm">
        <span className="text-xl">🎂</span>
        <span className="font-semibold text-lg flex-1">Sandra Bolos</span>
        <Link
          href="/configuracoes"
          className={cn(
            "p-2 rounded-lg transition-colors min-h-[40px] min-w-[40px] flex items-center justify-center",
            pathname.startsWith("/configuracoes")
              ? "bg-brand-800 text-white"
              : "text-brand-200 hover:bg-brand-700 hover:text-white"
          )}
          aria-label="Configurações"
        >
          <Settings size={20} />
        </Link>
      </header>

      <nav
        className="fixed bottom-0 left-0 right-0 z-40 bg-white border-t border-gray-200 shadow-[0_-1px_3px_rgba(0,0,0,0.06)]"
        style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}
      >
        <div className="max-w-2xl mx-auto flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center justify-center gap-0.5 py-2.5 text-[10px] font-medium transition-colors min-h-[52px]",
                  active ? "text-brand-600" : "text-gray-400 hover:text-gray-600"
                )}
              >
                <Icon size={20} strokeWidth={active ? 2.5 : 1.75} />
                <span>{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
