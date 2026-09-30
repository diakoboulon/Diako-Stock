"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/tableau-de-bord", label: "Accueil", icone: "🏠" },
  { href: "/produits", label: "Produits", icone: "📦" },
  { href: "/ventes/nouvelle", label: "Vente", icone: "🛒" },
  { href: "/rapports", label: "Rapports", icone: "📊" },
  { href: "/clients", label: "Clients", icone: "👥" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10 pb-safe">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => {
          const actif = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-medium ${
                actif ? "text-indigo-deep" : "text-ink/40"
              }`}
            >
              <span className="text-lg leading-none">{item.icone}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
