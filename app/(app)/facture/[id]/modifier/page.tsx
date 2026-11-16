"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { enFrancais } from "@/lib/messages";
import type { Facture } from "@/lib/facture";
import { EcranBloque, useContexteFacture } from "../../commun";
import FormulaireFacture, { ValeursFacture } from "../../formulaire";

export default function ModifierFacture() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id = params?.id;
  const ctx = useContexteFacture();
  const [facture, setFacture] = useState<Facture | null>(null);
  const [initial, setInitial] = useState<ValeursFacture | null>(null);
  const [chargement, setChargement] = useState(true);

  useEffect(() => {
    if (!ctx || !ctx.estProprietaire || !ctx.moduleActif || !id) return;
    async function charger() {
      const [{ data: f }, { data: l }] = await Promise.all([
        supabase.from("factures").select("*").eq("id", id).eq("business_id", ctx!.businessId).maybeSingle(),
        supabase.from("facture_lignes").select("product_id, designation, quantite, prix_unitaire, ordre").eq("facture_id", id).order("ordre"),
      ]);
      if (f) {
        const fa = f as Facture;
        const pourcent = !!fa.remise_taux;
        setFacture(fa);
        setInitial({
          clientId: fa.customer_id ?? "",
          clientNom: fa.client_nom,
          clientTel: fa.client_telephone ?? "",
          clientAdresse: fa.client_adresse ?? "",
          lignes: ((l ?? []) as { product_id: string | null; designation: string; quantite: number; prix_unitaire: number }[]).map((x) => ({
            productId: x.product_id ?? "",
            designation: x.designation,
            quantite: String(x.quantite),
            prix: String(x.prix_unitaire),
          })),
          remiseEnPourcent: pourcent,
          remiseValeur: pourcent ? String(fa.remise_taux) : fa.remise_montant ? String(fa.remise_montant) : "",
          tva: String(fa.tva_taux ?? 0),
          dateFacture: fa.date_facture,
          dateEcheance: fa.date_echeance ?? "",
          note: fa.note ?? "",
        });
      }
      setChargement(false);
    }
    charger();
  }, [ctx, id]);

  if (!ctx) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!ctx.estProprietaire) {
    return <EcranBloque titre="Réservé au propriétaire" texte="Seul le propriétaire du commerce peut modifier les factures." />;
  }
  if (!ctx.moduleActif) {
    return <EcranBloque titre="Modification impossible" texte="Votre essai de Diako Facture est terminé." avecWhatsApp />;
  }
  if (chargement) {
    return <main className="min-h-screen flex items-center justify-center text-ink/50">Chargement...</main>;
  }
  if (!facture || !initial) {
    return <EcranBloque titre="Facture introuvable" texte="Cette facture n'existe pas ou n'appartient pas à votre commerce." />;
  }
  if (facture.statut !== "emise" || facture.montant_paye > 0) {
    return (
      <EcranBloque
        titre="Modification impossible"
        texte="Cette facture est annulée ou un paiement y est déjà enregistré : elle ne peut plus être modifiée."
      />
    );
  }

  return (
    <FormulaireFacture
      ctx={ctx}
      initial={initial}
      titre={`Modifier ${facture.numero}`}
      libelleBouton="Enregistrer les modifications"
      libelleEnCours="Enregistrement..."
      lienRetour={[`/facture/${facture.id}`, "← Retour à la facture"]}
      enregistrer={async (p) => {
        const { error } = await supabase.rpc("modifier_facture", { p_business: ctx.businessId, p_facture: facture.id, ...p });
        if (error) return enFrancais(error.message, "Impossible de modifier la facture. Veuillez réessayer.");
        router.push(`/facture/${facture.id}`);
        return null;
      }}
    />
  );
}
