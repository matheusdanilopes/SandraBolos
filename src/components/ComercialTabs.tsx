"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShoppingBag, Users, Package, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

const TABS = [
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/clientes", label: "Clientes", icon: Users },
  { href: "/produtos", label: "Produtos", icon: Package },
  { href: "/toppers", label: "Toppers", icon: Sparkles },
];

const COMERCIAL_PREFIXES = ["/pedidos", "/clientes", "/produtos", "/toppers"];

export function ComercialTabs() {
  const pathname = usePathname();

  const isComercial = COMERCIAL_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(p + "/")
  );

  if (!isComercial) return null;

  return (
    <div className="sticky top-[52px] z-30 bg-white border-b border-gray-200 shadow-sm">
      <div className="max-w-2xl mx-auto flex">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href || pathname.startsWith(href + "/");
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 py-2.5",
                "text-[10px] font-medium transition-colors min-h-[48px]",
                "border-b-2 -mb-px",
                active
                  ? "border-brand-600 text-brand-600"
                  : "border-transparent text-gray-400 hover:text-gray-600"
              )}
            >
              <Icon size={15} strokeWidth={active ? 2.5 : 1.75} />
              <span>{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
