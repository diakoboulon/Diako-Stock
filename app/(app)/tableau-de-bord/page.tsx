"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Resume = {
  prenom: string;
  commerce: string;
  ventesAujourdhui: number;
  nbProduits: number;
  produitsRupture: number;
  produitsFaibles: number;
};

export default function TableauDeBordPage() {
  const router = useRouter();
  const [resume, setResume] = useState<Resume | null>(null);
  const [chargement, setChargement] = useState(true);

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
      <header className="mb-6">
        <p className="text-ink/50 text-sm">{resume.commerce}</p>
        <h1 className="font-display text-2xl font-bold text-indigo-deep">
          Bonjour {resume.prenom} 👋
        </h1>
      </header>

      <section className="grid grid-cols-2 gap-3 mb-4">
        <div className="card col-span-2 bg-indigo-deep text-bone">
          <p className="text-bone/70 text-sm">Ventes aujourd&apos;hui</p>
          <p className="font-display text-3xl font-bold mt-1">
            {resume.ventesAujourdhui.toLocaleString("fr-FR")} FCFA
          </p>
        </div>

        <div className="card">
          <p className="text-ink/50 text-sm">Produits</p>
          <p className="font-display text-2xl font-bold mt-1">
            {resume.nbProduits}
          </p>
        </div>

        <div className="card">
          <p className="text-ink/50 text-sm">Stock faible</p>
          <p className="font-display text-2xl font-bold mt-1 text-bronze">
            {resume.produitsFaibles}
          </p>
        </div>

        <div className="card col-span-2">
          <p className="text-ink/50 text-sm">Ruptures de stock</p>
          <p className="font-display text-2xl font-bold mt-1 text-clay">
            {resume.produitsRupture}
          </p>
        </div>
      </section>

      <button className="btn-primary w-full fixed bottom-6 left-1/2 -translate-x-1/2 max-w-md w-[calc(100%-2.5rem)] shadow-lg">
        + Nouvelle vente
      </button>
    </main>
  );
}
