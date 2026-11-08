"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { commerceActuel } from "@/lib/business";
import { WHATSAPP_ABONNEMENT } from "@/lib/plans";

type Module = {
  code: string;
  nom: string;
  icone: string;
  description: string;
  href: string | null; // null = pas encore disponible
};

// Seul Diako Stock est ouvert pour l'instant. Les autres modules arriveront un par un.
const MODULES: Module[] = [
  { code: "stock", nom: "Diako Stock", icone: "📦", description: "Produits, stock, ventes, clients à crédit et rapports.", href: "/tableau-de-bord" },
  { code: "facture", nom: "Diako Facture", icone: "🧾", description: "Factures et devis.", href: null },
  { code: "commande", nom: "Diako Commande", icone: "🛍️", description: "Commandes de vos clients.", href: null },
  { code: "garage", nom: "Diako Garage", icone: "🔧", description: "Garages et ateliers.", href: null },
  { code: "restaurant", nom: "Diako Restaurant", icone: "🍽️", description: "Restaurants et maquis.", href: null },
  { code: "pharmacie", nom: "Diako Pharmacie", icone: "💊", description: "Pharmacies.", href: null },
  { code: "sante", nom: "Diako Santé", icone: "🩺", description: "Cliniques et cabinets.", href: null },
  { code: "sav", nom: "Diako SAV Pro", icone: "📞", description: "Service après-vente.", href: null },
  { code: "distribution", nom: "Diako Distribution", icone: "🚚", description: "Grossistes et livraisons.", href: null },
  { code: "chantier", nom: "Diako Chantier", icone: "🏗️", description: "Chantiers et bâtiment.", href: null },
];

const LIEN_DEMANDE = `https://wa.me/${WHATSAPP_ABONNEMENT}?text=${encodeURIComponent(
  "Bonjour, je suis intéressé par un module Diako Business : "
)}`;

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

  const ouverts = MODULES.filter((m) => m.href);
  const bientot = MODULES.filter((m) => !m.href);

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

      <section className="bg-indigo-deep rounded-3xl p-5 mb-6 text-bone">
        <p className="font-display text-xl font-bold">Diako Business</p>
        <p className="text-sm text-bone/70 mt-1">
          Tous les outils de votre entreprise au même endroit, depuis votre téléphone.
        </p>
      </section>

      <h2 className="font-display font-bold text-indigo-deep mb-3">Mes modules</h2>
      <div className="space-y-3 mb-8">
        {ouverts.map((m) => (
          <a
            key={m.code}
            href={m.href!}
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

      <h2 className="font-display font-bold text-indigo-deep mb-3">Bientôt disponibles</h2>
      <div className="grid grid-cols-2 gap-3 mb-6">
        {bientot.map((m) => (
          <div key={m.code} className="bg-white border border-ink/10 rounded-2xl p-4 opacity-80">
            <span className="text-2xl">{m.icone}</span>
            <p className="font-semibold text-ink mt-2 leading-tight">{m.nom}</p>
            <p className="text-xs text-ink/50 mt-1">{m.description}</p>
            <p className="text-xs font-medium text-bronze mt-2">Bientôt</p>
          </div>
        ))}
      </div>

      <a
        href={LIEN_DEMANDE}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center border border-ink/15 text-ink/70 text-sm font-medium rounded-xl py-3"
      >
        Quel module vous intéresse ? Dites-le-nous sur WhatsApp
      </a>
    </main>
  );
}
