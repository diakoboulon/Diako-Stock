"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";

type Module = {
  code: string;
  nom: string;
  icone: string;
  description: string;
  href: string;
};

// Modules du client. Les autres modules n'apparaissent jamais ici :
// ils seront ajoutés seulement quand le client s'y est inscrit.
const MODULES: Module[] = [
  {
    code: "stock",
    nom: "Diako Stock",
    icone: "📦",
    description: "Produits, stock, ventes, clients à crédit et rapports.",
    href: "/tableau-de-bord",
  },
];

export default function ModulesPage() {
  const router = useRouter();
  const [prenom, setPrenom] = useState("");
  const [commerce, setCommerce] = useState("");
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    async function init() {
      const c = await commerceActuel();
      if (!c) {
        router.push("/connexion");
        return;
      }
      // Un seul module : on entre directement dedans, sans écran intermédiaire.
      if (MODULES.length === 1) {
        router.replace(MODULES[0].href);
        return;
      }
      setCommerce(c.nom ?? "");
      const { data: session } = await supabase.auth.getUser();
      if (session.user) {
        const { data: profil } = await supabase
          .from("profiles")
          .select("prenom")
          .eq("id", session.user.id)
          .maybeSingle();
        setPrenom(profil?.prenom ?? "");
      }
      setChargement(false);
    }
    init();
  }, [router]);

  if (chargement) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-16">
      <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-ink/50 text-sm">{commerce}</p>
          <h1 className="font-display text-2xl font-bold text-indigo-deep">
            Bonjour {prenom} 👋
          </h1>
        </div>
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            router.push("/connexion");
          }}
          className="text-xs text-ink/40 border border-ink/15 rounded-full px-3 py-1.5 mt-1"
        >
          Déconnexion
        </button>
      </header>

      <h2 className="font-display font-bold text-indigo-deep mb-3">Mes modules</h2>
      <div className="space-y-3">
        {MODULES.map((m) => (
          <a
            key={m.code}
            href={m.href}
            className="flex items-center gap-4 bg-white border border-bronze/50 rounded-2xl p-4 shadow-sm"
          >
            <span className="flex-none w-12 h-12 rounded-xl bg-bone flex items-center justify-center text-2xl">
              {m.icone}
            </span>
            <div className="flex-1 min-w-0">
              <p className="font-display font-bold text-ink">{m.nom}</p>
              <p className="text-sm text-ink/60">{m.description}</p>
            </div>
            <span className="flex-none bg-bronze text-white text-sm font-semibold rounded-xl px-4 py-2">
              Ouvrir
            </span>
          </a>
        ))}
      </div>
    </main>
  );
}
