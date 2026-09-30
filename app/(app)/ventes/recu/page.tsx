"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Ligne = { nom_produit: string; quantite: number; prix_unitaire: number; total_ligne: number };
type Recu = {
  numero: number;
  created_at: string;
  total: number;
  montant_paye: number;
  statut_paiement: string;
  commerceNom: string;
  commerceTelephone: string | null;
  clientNom: string | null;
  lignes: Ligne[];
};

export default function RecuPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const saleId = searchParams.get("id") ?? "";
  const [recu, setRecu] = useState<Recu | null>(null);
  const [chargement, setChargement] = useState(true);
  const [erreur, setErreur] = useState<string | null>(null);

  useEffect(() => {
    if (!saleId) {
      setErreur("Reçu introuvable.");
      setChargement(false);
      return;
    }

    async function charger() {
      const { data: session } = await supabase.auth.getUser();
      if (!session.user) {
        router.push("/connexion");
        return;
      }

      const { data: vente, error: erreurVente } = await supabase
        .from("sales")
        .select(
          "numero, created_at, total, montant_paye, statut_paiement, business_id, customer_id, businesses(nom, telephone), customers(nom)"
        )
        .eq("id", saleId)
        .maybeSingle();

      if (erreurVente || !vente) {
        setErreur("Reçu introuvable.");
        setChargement(false);
        return;
      }

      const { data: lignes } = await supabase
        .from("sale_items")
        .select("nom_produit, quantite, prix_unitaire, total_ligne")
        .eq("sale_id", saleId);

      setRecu({
        numero: vente.numero,
        created_at: vente.created_at,
        total: vente.total,
        montant_paye: vente.montant_paye,
        statut_paiement: vente.statut_paiement,
        commerceNom: (vente.businesses as any)?.nom ?? "",
        commerceTelephone: (vente.businesses as any)?.telephone ?? null,
        clientNom: (vente.customers as any)?.nom ?? null,
        lignes: lignes ?? [],
      });
      setChargement(false);
    }
    charger();
  }, [saleId, router]);

  if (chargement) {
    return (
      <main className="min-h-screen flex items-center justify-center text-ink/50">
        Chargement...
      </main>
    );
  }

  if (erreur || !recu) {
    return (
      <main className="min-h-screen flex flex-col items-center justify-center px-6 text-center">
        <p className="text-clay mb-4">{erreur}</p>
        <a href="/tableau-de-bord" className="text-indigo-deep font-semibold">
          Retour au tableau de bord
        </a>
      </main>
    );
  }

  const date = new Date(recu.created_at).toLocaleString("fr-FR", {
    dateStyle: "medium",
    timeStyle: "short",
  });

  const texteWhatsapp = encodeURIComponent(
    `Reçu ${recu.commerceNom} — Vente n°${recu.numero}\n` +
      recu.lignes.map((l) => `${l.nom_produit} x${l.quantite} = ${l.total_ligne.toLocaleString("fr-FR")} FCFA`).join("\n") +
      `\nTotal : ${recu.total.toLocaleString("fr-FR")} FCFA` +
      (recu.statut_paiement !== "paye"
        ? `\nPayé : ${recu.montant_paye.toLocaleString("fr-FR")} FCFA (reste ${(recu.total - recu.montant_paye).toLocaleString("fr-FR")} FCFA)`
        : "")
  );

  return (
    <main className="min-h-screen bg-bone px-5 py-8 max-w-sm mx-auto">
      <div className="card print:shadow-none print:border-0">
        <div className="text-center mb-5">
          <p className="font-display text-xl font-bold text-indigo-deep">{recu.commerceNom}</p>
          {recu.commerceTelephone && (
            <p className="text-sm text-ink/50">{recu.commerceTelephone}</p>
          )}
        </div>

        <div className="flex justify-between text-sm text-ink/60 mb-4 border-b border-ink/10 pb-3">
          <span>Vente n°{recu.numero}</span>
          <span>{date}</span>
        </div>

        {recu.clientNom && (
          <p className="text-sm text-ink/60 mb-3">Client : {recu.clientNom}</p>
        )}

        <div className="space-y-2 mb-4">
          {recu.lignes.map((l, i) => (
            <div key={i} className="flex justify-between text-sm">
              <span>
                {l.nom_produit} × {l.quantite}
              </span>
              <span className="font-medium">{l.total_ligne.toLocaleString("fr-FR")} FCFA</span>
            </div>
          ))}
        </div>

        <div className="border-t border-ink/10 pt-3 flex justify-between font-display font-bold text-indigo-deep">
          <span>Total</span>
          <span>{recu.total.toLocaleString("fr-FR")} FCFA</span>
        </div>

        {recu.statut_paiement !== "paye" && (
          <div className="mt-3 text-sm text-clay">
            <div className="flex justify-between">
              <span>Payé</span>
              <span>{recu.montant_paye.toLocaleString("fr-FR")} FCFA</span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>Reste à payer</span>
              <span>{(recu.total - recu.montant_paye).toLocaleString("fr-FR")} FCFA</span>
            </div>
          </div>
        )}

        <p className="text-center text-xs text-ink/40 mt-6">Merci de votre confiance</p>
      </div>

      <div className="space-y-3 mt-6 print:hidden">
        <button onClick={() => window.print()} className="btn-primary w-full">
          Imprimer
        </button>
        <a
          href={`https://wa.me/?text=${texteWhatsapp}`}
          target="_blank"
          rel="noopener noreferrer"
          className="block w-full text-center py-3 rounded-xl border border-ink/15 font-medium text-ink/70"
        >
          Partager sur WhatsApp
        </a>
        <a
          href="/tableau-de-bord"
          className="block w-full text-center py-3 text-ink/40 text-sm"
        >
          Retour au tableau de bord
        </a>
      </div>
    </main>
  );
}
