"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingBag, Users } from "lucide-react";
import { cn } from "@/lib/utils";

const links = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/pedidos", label: "Pedidos", icon: ShoppingBag },
  { href: "/clientes", label: "Clientes", icon: Users },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <>
      <header className="bg-brand-600 text-white px-4 py-3 flex items-center gap-2 sticky top-0 z-40 shadow-sm">
        <span className="text-xl">🎂</span>
        <span className="font-semibold text-lg">Sandra Bolos</span>
      </header>

      <nav className="bg-white border-b border-gray-200 sticky top-12 z-30">
        <div className="max-w-2xl mx-auto flex">
          {links.map(({ href, label, icon: Icon }) => {
            const active = href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex-1 flex flex-col items-center gap-0.5 py-2 text-xs font-medium transition-colors",
                  active ? "text-brand-600 border-b-2 border-brand-600" : "text-gray-500 hover:text-gray-700"
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
