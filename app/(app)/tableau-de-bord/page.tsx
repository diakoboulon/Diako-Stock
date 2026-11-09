"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { infoAbonnement, InfoAbonnement } from "@/lib/plans";

function BottomNav() {
  const actif = "/tableau-de-bord";
  const items = [
    { href: "/tableau-de-bord", label: "Accueil", icone: "🏠" },
    { href: "/produits", label: "Produits", icone: "📦" },
    { href: "/ventes/nouvelle", label: "Vente", icone: "🛒" },
    { href: "/rapports", label: "Rapports", icone: "📊" },
    { href: "/clients", label: "Clients", icone: "👥" },
  ];
  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-ink/10">
      <div className="max-w-md mx-auto grid grid-cols-5">
        {items.map((item) => (
          <a
            key={item.href}
            href={item.href}
            className={`flex flex-col items-center gap-0.5 py-2.5 text-[11px] ${item.href === actif ? "font-bold text-indigo-deep" : "font-medium text-ink/40"}`}
          >
            <span className="text-lg leading-none">{item.icone}</span>
            {item.label}
          </a>
        ))}
      </div>
    </nav>
  );
}

type Resume = {
  prenom: string;
  commerce: string;
  ventesAujourdhui: number;
  nbVentes: number;
  nbProduits: number;
  produitsRupture: number;
  produitsFaibles: number;
};

export default function TableauDeBordPage() {
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [chargement, setChargement] = useState(true);
  const [abonnement, setAbonnement] = useState<InfoAbonnement | null>(null);

  useEffect(() => {
    async function charger() {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) {
        router.push("/connexion");
        return;
      }

      const { data: membre } = await supabase
        .from("business_members")
        .select("business_id, businesses(nom)")
        .eq("user_id", session.user.id)
        .eq("actif", true)
        .limit(1)
        .maybeSingle();

      if (!membre) {
        router.push("/connexion");
        return;
      }

      const { data: profil } = await supabase
        .from("profiles")
        .select("prenom")
        .eq("id", session.user.id)
        .maybeSingle();

      const businessId = membre.business_id as string;
      infoAbonnement(businessId).then(setAbonnement);
      const debutJour = new Date();
      debutJour.setHours(0, 0, 0, 0);

      const [{ data: ventesJour }, { data: produits }] = await Promise.all([
        supabase
          .from("sales")
          .select("total")
          .eq("business_id", businessId)
          .gte("created_at", debutJour.toISOString()),
        supabase
          .from("products")
          .select("quantite, seuil_alerte")
          .eq("business_id", businessId)
          .eq("actif", true),
      ]);

      const nbVentes = ventesJour?.length ?? 0;
      const ventesAujourdhui = (ventesJour ?? []).reduce(
        (s, v) => s + (v.total ?? 0),
        0
      );
      const nbProduits = produits?.length ?? 0;
      const produitsRupture =
        produits?.filter((p) => Number(p.quantite) === 0).length ?? 0;
      const produitsFaibles =
        produits?.filter(
          (p) =>
            Number(p.quantite) > 0 &&
            Number(p.quantite) <= Number(p.seuil_alerte)
        ).length ?? 0;

      setResume({
        prenom: profil?.prenom ?? "",
        commerce: (membre.businesses as any)?.nom ?? "",
        ventesAujourdhui,
        nbVentes,
        nbProduits,
        produitsRupture,
        produitsFaibles,
      });
      setChargement(false);
    }
    charger();
  }, [router]);

  if (chargement || !resume) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">
        Chargement...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-md mx-auto pb-28">
           <header className="mb-6 flex items-start justify-between">
        <div>
          <p className="text-ink/50 text-sm">{resume.commerce}</p>
          <h1 className="font-display text-2xl font-bold text-indigo-deep">
            Bonjour {resume.prenom} 👋
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

      <section className="mb-4">
        <div className="rounded-3xl p-5 mb-3 text-bone shadow-lg bg-gradient-to-br from-indigo-deep to-ink">
          <p className="text-bone/70 text-sm">Ventes aujourd&apos;hui</p>
          <p className="font-display text-4xl font-bold mt-1 mb-2">
            {resume.ventesAujourdhui.toLocaleString("fr-FR")} FCFA
          </p>
          <span className="inline-block bg-white/15 rounded-full text-xs px-3 py-1">
            🛒 {resume.nbVentes === 0 ? "Aucune vente pour l'instant" : `${resume.nbVentes} vente${resume.nbVentes > 1 ? "s" : ""} aujourd'hui`}
          </span>
        </div>

        <div className="grid grid-cols-3 gap-2.5">
          <div className="bg-white border border-ink/10 rounded-2xl p-3.5">
            <p className="text-xl">📦</p>
            <p className="font-display text-2xl font-bold mt-1">{resume.nbProduits}</p>
            <p className="text-xs text-ink/50">Produits</p>
          </div>
          <div className={`rounded-2xl p-3.5 border ${resume.produitsFaibles > 0 ? "bg-bronze/10 border-bronze/40" : "bg-white border-ink/10"}`}>
            <p className="text-xl">⚠️</p>
            <p className={`font-display text-2xl font-bold mt-1 ${resume.produitsFaibles > 0 ? "text-bronze" : ""}`}>{resume.produitsFaibles}</p>
            <p className="text-xs text-ink/50">Stock faible</p>
          </div>
          <div className={`rounded-2xl p-3.5 border ${resume.produitsRupture > 0 ? "bg-clay/10 border-clay/40" : "bg-white border-ink/10"}`}>
            <p className="text-xl">🚫</p>
            <p className={`font-display text-2xl font-bold mt-1 ${resume.produitsRupture > 0 ? "text-clay" : ""}`}>{resume.produitsRupture}</p>
            <p className="text-xs text-ink/50">Ruptures</p>
          </div>
        </div>
      </section>

      {resume.produitsFaibles + resume.produitsRupture > 0 && (
        <a href="/produits" className="flex items-center gap-2.5 bg-bronze/10 border border-bronze/40 rounded-2xl px-4 py-3 text-sm mb-4">
          <span>🔔</span>
          <span>
            <b className="text-bronze">{resume.produitsFaibles + resume.produitsRupture} produit{resume.produitsFaibles + resume.produitsRupture > 1 ? "s" : ""}</b> à réapprovisionner
          </span>
          <span className="ml-auto text-bronze font-semibold text-[13px]">Voir →</span>
        </a>
      )}

      {abonnement && (
        <a href="/abonnement" className="block bg-white border border-ink/10 rounded-3xl p-4 mb-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-ink/50 text-sm">Mon plan</p>
              <p className="font-display text-lg font-bold text-indigo-deep">{abonnement.plan.nom}</p>
            </div>
            <span className="text-sm font-semibold text-bronze">
              {abonnement.plan.id === "business" ? "Gérer" : "Améliorer →"}
            </span>
          </div>
          {abonnement.plan.limite !== null && (
            <>
              <div className="h-2 bg-bone rounded-full mt-3 overflow-hidden">
                <div
                  className="h-full bg-indigo-deep rounded-full"
                  style={{ width: `${Math.min(100, Math.round((abonnement.nbProduits / abonnement.plan.limite) * 100))}%` }}
                />
              </div>
              <p className="text-xs text-ink/50 mt-1.5">
                {abonnement.nbProduits} produit{abonnement.nbProduits > 1 ? "s" : ""} sur {abonnement.plan.limite} utilisés
              </p>
            </>
          )}
        </a>
      )}

      <a
        href="/ventes/nouvelle"
        className="bg-bronze text-white font-display font-semibold text-[17px] rounded-2xl px-5 py-4 w-full fixed bottom-20 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-2.5rem)] shadow-lg text-center block"
      >
        + Nouvelle vente
      </a>

      <BottomNav />
    </main>
  );
}
