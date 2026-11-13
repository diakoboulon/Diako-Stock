"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import { Facture, fcfa, dateFr } from "@/lib/facture";
import { BadgeStatut, BandeauEssai, EcranBloque, useContexteFacture } from "./commun";

type Filtre = "toutes" | "a_payer" | "payees" | "annulees";

export default function ListeFactures() {
  const router = useRouter();
  const ctx = useContexteFacture();
  const [factures, setFactures] = useState<Facture[]>([]);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);
  const [filtre, setFiltre] = useState<Filtre>("toutes");
  const [recherche, setRecherche] = useState("");

  useEffect(() => {
    if (!ctx || !ctx.estProprietaire || !ctx.active) return;
    async function charger() {
      const { data, error } = await supabase
        .from("factures")
        .select("*")
        .eq("business_id", ctx!.businessId)
        .order("created_at", { ascending: false });
      if (error) setErreur(enFrancais(error.message));
      setFactures((data ?? []) as Facture[]);
      setChargement(false);
    }
    charger();
  }, [ctx]);

  if (!ctx) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!ctx.estProprietaire) {
    return <EcranBloque titre="Réservé au propriétaire" texte="Seul le propriétaire du commerce peut gérer les factures." />;
  }
  if (!ctx.active) {
    return (
      <EcranBloque
        titre="Diako Facture n'est pas encore activé"
        texte="Ce module n'est pas encore ouvert pour votre commerce. Demandez son activation pour créer vos factures et vos devis."
        avecWhatsApp
      />
    );
  }

  const aEncaisser = factures
    .filter((f) => f.statut === "emise" || f.statut === "partielle")
    .reduce((s, f) => s + (f.total - f.montant_paye), 0);
  const nbAPayer = factures.filter((f) => f.statut === "emise" || f.statut === "partielle").length;

  const visibles = factures
    .filter((f) => {
      if (filtre === "a_payer") return f.statut === "emise" || f.statut === "partielle";
      if (filtre === "payees") return f.statut === "payee";
      if (filtre === "annulees") return f.statut === "annulee";
      return true;
    })
    .filter((f) => `${f.numero} ${f.client_nom}`.toLowerCase().includes(recherche.toLowerCase()));

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-2xl mx-auto pb-24">
      <header className="mb-5 flex items-start justify-between gap-3">
        <div>
          <a href="/modules" className="inline-block py-1.5 text-xs font-semibold text-bronze">← Mes modules</a>
          <h1 className="font-display text-2xl font-bold text-indigo-deep">Mes factures</h1>
          <p className="text-sm text-ink/50">{ctx.nomCommerce}</p>
        </div>
        {ctx.moduleActif && (
          <button
            onClick={() => router.push("/facture/nouvelle")}
            className="flex-none bg-bronze text-white text-[13px] font-semibold px-3.5 py-3 rounded-2xl shadow-md"
          >
            + Nouvelle facture
          </button>
        )}
      </header>

      <BandeauEssai ctx={ctx} />

      {erreur && <p className="text-clay text-sm font-medium mb-3">{erreur}</p>}

      {nbAPayer > 0 && (
        <div className="bg-white border border-clay/30 rounded-2xl p-4 mb-4">
          <p className="text-sm text-ink/60">Reste à encaisser</p>
          <p className="font-display text-2xl font-bold text-clay">{fcfa(aEncaisser)} FCFA</p>
          <p className="text-sm text-ink/50">
            sur {nbAPayer} facture{nbAPayer > 1 ? "s" : ""} non soldée{nbAPayer > 1 ? "s" : ""}
          </p>
        </div>
      )}

      <input
        className="input-field mb-3"
        placeholder="Rechercher (numéro ou client)..."
        value={recherche}
        onChange={(e) => setRecherche(e.target.value)}
      />

      <div className="grid grid-cols-4 gap-2 mb-5">
        {(
          [
            ["toutes", "Toutes"],
            ["a_payer", "À payer"],
            ["payees", "Payées"],
            ["annulees", "Annulées"],
          ] as const
        ).map(([valeur, libelle]) => (
          <button
            key={valeur}
            onClick={() => setFiltre(valeur)}
            className={`py-2 rounded-xl text-[13px] font-medium border ${filtre === valeur ? "bg-indigo-deep text-bone border-indigo-deep" : "bg-white text-ink/60 border-ink/15"}`}
          >
            {libelle}
          </button>
        ))}
      </div>

      {chargement ? (
        <p className="text-ink/50 text-center mt-10">Chargement...</p>
      ) : visibles.length === 0 ? (
        <div className="bg-white border border-ink/10 rounded-3xl text-center py-10 px-6">
          <p className="text-4xl mb-2">🧾</p>
          <p className="text-ink/60">
            {factures.length === 0 ? "Vous n'avez pas encore de facture." : "Aucune facture ne correspond."}
          </p>
          {factures.length === 0 && ctx.moduleActif && (
            <button
              onClick={() => router.push("/facture/nouvelle")}
              className="mt-4 bg-bronze text-white font-display font-semibold rounded-2xl px-6 py-3"
            >
              Créer ma première facture
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visibles.map((f) => {
            const reste = f.total - f.montant_paye;
            return (
              <a
                key={f.id}
                href={`/facture/${f.id}`}
                className="block bg-white border border-ink/10 rounded-2xl p-4 active:scale-[0.99] transition-transform"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-ink truncate">{f.client_nom}</p>
                    <p className="text-sm text-ink/50">{f.numero} · {dateFr(f.date_facture)}</p>
                  </div>
                  <BadgeStatut statut={f.statut} />
                </div>
                <div className="flex items-end justify-between mt-3">
                  <p className="font-display text-lg font-bold text-indigo-deep">{fcfa(f.total)} FCFA</p>
                  {(f.statut === "emise" || f.statut === "partielle") && (
                    <p className="text-sm font-semibold text-clay">Reste {fcfa(reste)} FCFA</p>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}
    </main>
  );
}
